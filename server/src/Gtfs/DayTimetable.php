<?php

declare(strict_types=1);

namespace KwInfo\Gtfs;

use KwInfo\Clock;
use KwInfo\Config;

/**
 * Wszystkie kursy widoczne w danym dniu kalendarzowym: kursy z tej daty oraz nocne kursy z dnia poprzedniego
 * (czasy ≥ 24:00), opcjonalnie też kursy dnia sąsiedniego (withDay). Czasy są przeliczone na sekundy od północy $date.
 *
 * Postój: [0 seq, 1 stationId, 2 arr, 3 dep, 4 dist, 5 platform, 6 track, 7 pickup, 8 dropoff]
 */
final class DayTimetable
{
    public const SEQ = 0, STATION = 1, ARR = 2, DEP = 3, DIST = 4, PLATFORM = 5, TRACK = 6, PICKUP = 7, DROPOFF = 8;

    /** @var array<string, array<string, mixed>> klucz "tripId@YYYYMMDD" */
    public array $trips = [];
    /** @var array<string, array<int, array{0: string, 1: int}>> stationId => [[klucz, indeks postoju], …] */
    public array $byStation = [];

    private function __construct(public readonly int $date)
    {
    }

    public static function load(Timetable $tt, int $date): self
    {
        $dir = Config::path('cache_dir');
        $file = $dir . '/day-' . $date . '-' . $tt->version() . '.ser';
        if (is_file($file)) {
            $cached = @unserialize((string) file_get_contents($file), ['allowed_classes' => [self::class]]);
            if ($cached instanceof self) {
                return $cached;
            }
        }
        $day = new self($date);
        foreach ($tt->tripsOn($date) as $trip) {
            $day->add($trip, $date, 0);
        }
        $previous = Clock::addDays($date, -1);
        foreach ($tt->tripsOn($previous) as $trip) {
            $last = end($trip['stops']);
            if (($last[self::ARR] ?? 0) >= 86400) {
                $day->add($trip, $previous, -86400);
            }
        }
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        foreach (glob($dir . '/day-*.ser') ?: [] as $old) {
            if (filemtime($old) < time() - 3 * 86400 || !str_contains($old, $tt->version())) {
                @unlink($old);
            }
        }
        @file_put_contents($file . '.tmp', serialize($day));
        @rename($file . '.tmp', $file);

        return $day;
    }

    /**
     * Ten dzień z dołączonymi kursami dnia sąsiedniego (czasy ±24 h), np. do wyszukiwania połączeń wokół północy.
     * Z $other bierzemy tylko kursy z jego własnej daty, których jeszcze nie ma (nocne kursy są w obu dniach).
     */
    public function withDay(self $other): self
    {
        $shift = $other->date > $this->date ? 86400 : -86400;
        $span = clone $this;
        foreach ($other->trips as $key => $trip) {
            if ($trip['serviceDate'] === $other->date && !isset($span->trips[$key])) {
                $span->add($trip, $other->date, $shift);
            }
        }

        return $span;
    }

    /** @param array<string, mixed> $trip */
    private function add(array $trip, int $serviceDate, int $offset): void
    {
        $key = $trip['tripId'] . '@' . $serviceDate;
        if ($offset !== 0) {
            foreach ($trip['stops'] as &$stop) {
                $stop[self::ARR] = $stop[self::ARR] === null ? null : $stop[self::ARR] + $offset;
                $stop[self::DEP] = $stop[self::DEP] === null ? null : $stop[self::DEP] + $offset;
            }
            unset($stop);
        }
        $trip['key'] = $key;
        $trip['serviceDate'] = $serviceDate;
        $trip['offset'] = $offset;
        $this->trips[$key] = $trip;
        foreach ($trip['stops'] as $index => $stop) {
            $this->byStation[$stop[self::STATION]][] = [$key, $index];
        }
    }

    /** Indeks pierwszego wystąpienia stacji w kursie. @param array<string, mixed> $trip */
    public static function indexOf(array $trip, string $stationId, int $after = -1): ?int
    {
        foreach ($trip['stops'] as $i => $stop) {
            if ($i > $after && $stop[self::STATION] === $stationId) {
                return $i;
            }
        }

        return null;
    }
}
