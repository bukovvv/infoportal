<?php

declare(strict_types=1);

namespace KwInfo\Stats;

use KwInfo\Clock;
use KwInfo\Gtfs\DayTimetable;
use KwInfo\Gtfs\DayTimetable as D;
use KwInfo\Gtfs\Timetable;
use KwInfo\Live\Realtime;

/**
 * Zapisuje punktualność kursów, które już dojechały (uruchamiany z bin/refresh-live.php co kwadrans).
 * Liczą się tylko kursy z danymi GTFS-RT PKP PLK: bez nich (albo przy nieaktualnym feedzie — Realtime::fromStorage je pomija)
 * nie wiemy, jak pojechał, więc nic nie zapisujemy. Feed trzyma dojechane kursy przez cały dzień, więc kwadrans opóźnienia nie gubi danych.
 */
final class PunctualityRecorder
{
    /** zapis 10 min po (opóźnionym) przyjeździe — ostatnie dane z feedu zdążą dojść */
    public const SETTLE = 600;

    private readonly PunctualityRepository $repo;
    /** @var callable(string): void */
    private $log;

    public function __construct(private readonly Timetable $tt, ?PunctualityRepository $repo = null, ?callable $log = null)
    {
        $this->repo = $repo ?? new PunctualityRepository();
        $this->log = $log ?? static function (string $line): void {
        };
    }

    public function run(?Realtime $realtime = null): int
    {
        $realtime ??= Realtime::fromStorage();
        $today = Clock::today();
        $dates = [$today];
        // tuż po północy domykamy wczorajsze kursy, które dojechały przed północą (nie ma ich w dzisiejszym dniu)
        if (Clock::secondsSince($today) < 3600) {
            $dates[] = Clock::addDays($today, -1);
        }
        $rows = [];
        foreach ($dates as $date) {
            $day = DayTimetable::load($this->tt, $date, true);
            $now = Clock::secondsSince($date);
            $done = [];
            foreach ([$date, Clock::addDays($date, -1)] as $serviceDate) {
                $done += $this->repo->recordedKeys($serviceDate);
            }
            foreach ($day->trips as $key => $trip) {
                if (isset($done[$key]) || !$realtime->hasRt($key)) {
                    continue;
                }
                $row = self::outcome($trip, $realtime->apply($trip, $now), $now);
                if ($row !== null) {
                    $rows[$key] = $row;
                }
            }
        }
        $added = $this->repo->insert(array_values($rows));
        $this->repo->prune();
        ($this->log)('Punktualność: zapisano ' . $added . ' kursów');

        return $added;
    }

    /** Numer bez nazwy pociągu: „1804/5 Bolesław Prus” → „1804/5” (tak pyta strona pociągu). */
    public static function number(string $number): string
    {
        return preg_match('/^\d+(?:\/\d+)*/', trim($number), $m) === 1 ? $m[0] : trim($number);
    }

    /**
     * Wynik kursu albo null, gdy jeszcze jedzie albo brak opóźnienia na końcu.
     * @param array<string, mixed> $trip kurs z DayTimetable
     * @param array<string, mixed> $exp wynik Realtime::apply
     * @return array<string, mixed>|null
     */
    public static function outcome(array $trip, array $exp, int $now): ?array
    {
        $stops = $trip['stops'];
        $lastIndex = count($stops) - 1;
        $last = $stops[$lastIndex];
        $scheduled = $last[D::ARR] ?? $last[D::DEP];
        $base = [
            'trip_key' => $trip['key'],
            'service_date' => $trip['serviceDate'],
            'number' => self::number((string) $trip['number']),
            'agency' => (string) $trip['agency'],
            'route_id' => (string) $trip['routeId'],
            'origin' => (string) $stops[0][D::STATION],
            'destination' => (string) $last[D::STATION],
            // od północy dnia kursu (DayTimetable przesuwa nocne kursy z poprzedniego dnia o -24 h)
            'scheduled_departure' => (int) $stops[0][D::DEP] - (int) ($trip['offset'] ?? 0),
        ];
        if ($exp['cancelled']) {
            return $scheduled + self::SETTLE > $now ? null : $base + [
                'departure_delay' => null, 'arrival_delay' => null, 'max_delay' => null, 'skipped' => 0, 'cancelled' => 1,
            ];
        }
        $end = $exp['stops'][$lastIndex];
        $arrival = $end['arr'] ?? $end['dep'];
        $arrivalDelay = $end['arrDelay'] ?? $end['depDelay'];
        if ($arrival === null || $arrivalDelay === null || $arrival + self::SETTLE > $now) {
            return null;
        }
        $delays = [];
        $skipped = 0;
        foreach ($exp['stops'] as $s) {
            foreach ([$s['arrDelay'], $s['depDelay']] as $d) {
                if ($d !== null) {
                    $delays[] = $d;
                }
            }
            $skipped += $s['skipped'] ? 1 : 0;
        }

        return $base + [
            'departure_delay' => $exp['stops'][0]['depDelay'],
            'arrival_delay' => $arrivalDelay,
            'max_delay' => $delays !== [] ? max($delays) : null,
            'skipped' => $skipped,
            'cancelled' => 0,
        ];
    }
}
