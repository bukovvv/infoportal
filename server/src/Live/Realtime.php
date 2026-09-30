<?php

declare(strict_types=1);

namespace KwInfo\Live;

use KwInfo\Config;
use KwInfo\Gtfs\DayTimetable as D;

/**
 * Nakłada dane na żywo na rozkład. Priorytet: GTFS-RT (opóźnienia na postojach, odwołania), potem opóźnienie z GPS.
 */
final class Realtime
{
    /**
     * @param array<string, array{c?: int, s?: array<string, array{0: int|null, 1: int|null, 2?: int}>}> $rtTrips
     * @param array<string, int> $gpsDelays klucz kursu => minuty
     */
    public function __construct(private array $rtTrips = [], private array $gpsDelays = [])
    {
    }

    public static function fromStorage(): self
    {
        $rt = self::readJson(Config::path('rt_file'));
        $live = self::readJson(Config::path('live_file'));
        $fresh = static fn (?string $iso, int $maxAge): bool => $iso !== null && strtotime($iso) > time() - $maxAge;

        return new self(
            $fresh($rt['feedTime'] ?? $rt['fetchedAt'] ?? null, 1800) ? ($rt['trips'] ?? []) : [],
            $fresh($live['generatedAt'] ?? null, 600) ? ($live['delays'] ?? []) : []
        );
    }

    /** @return array<string, mixed> */
    public static function readJson(string $file): array
    {
        if (!is_file($file)) {
            return [];
        }
        $data = json_decode((string) file_get_contents($file), true);

        return is_array($data) ? $data : [];
    }

    public function hasRt(string $key): bool
    {
        return isset($this->rtTrips[$key]);
    }

    public function cancelled(string $key): bool
    {
        return (bool) ($this->rtTrips[$key]['c'] ?? false);
    }

    /**
     * Oczekiwane czasy na postojach.
     * @param array<string, mixed> $trip kurs z DayTimetable
     * @return array{source: string|null, cancelled: bool, delay: int|null, stops: array<int, array{arr: int|null, dep: int|null, arrDelay: int|null, depDelay: int|null, skipped: bool}>}
     */
    public function apply(array $trip, int $now): array
    {
        $key = $trip['key'];
        $stops = [];
        $rt = $this->rtTrips[$key] ?? null;
        if ($rt !== null) {
            $updates = $rt['s'] ?? [];
            $last = null;
            foreach ($trip['stops'] as $stop) {
                $u = $updates[(string) $stop[D::SEQ]] ?? null;
                $arrDelay = $u !== null ? ($u[0] ?? $u[1] ?? $last) : $last;
                $depDelay = $u !== null ? ($u[1] ?? $u[0] ?? $last) : $last;
                if ($u !== null) {
                    $last = $depDelay;
                }
                $stops[] = $this->stopRow($stop, $arrDelay, $depDelay, $u !== null && !empty($u[2]));
            }

            return ['source' => 'rt', 'cancelled' => (bool) ($rt['c'] ?? false), 'delay' => $this->currentDelay($stops, $now), 'stops' => $stops];
        }
        $gps = $this->gpsDelays[$key] ?? null;
        foreach ($trip['stops'] as $stop) {
            $sched = $stop[D::DEP] ?? $stop[D::ARR];
            $delay = $gps !== null && $sched + $gps * 60 >= $now - 60 ? $gps * 60 : null;
            $stops[] = $this->stopRow($stop, $delay, $delay, false);
        }

        return ['source' => $gps !== null ? 'gps' : null, 'cancelled' => false, 'delay' => $gps !== null ? $gps * 60 : null, 'stops' => $stops];
    }

    /** @param array<int, mixed> $stop @return array{arr: int|null, dep: int|null, arrDelay: int|null, depDelay: int|null, skipped: bool} */
    private function stopRow(array $stop, ?int $arrDelay, ?int $depDelay, bool $skipped): array
    {
        return [
            'arr' => $stop[D::ARR] === null ? null : $stop[D::ARR] + (int) $arrDelay,
            'dep' => $stop[D::DEP] === null ? null : $stop[D::DEP] + (int) $depDelay,
            'arrDelay' => $arrDelay,
            'depDelay' => $depDelay,
            'skipped' => $skipped,
        ];
    }

    /** Opóźnienie przy najbliższym przyszłym postoju (lub ostatnie znane). @param array<int, array<string, mixed>> $stops */
    private function currentDelay(array $stops, int $now): ?int
    {
        $known = null;
        foreach ($stops as $s) {
            $d = $s['depDelay'] ?? $s['arrDelay'];
            if ($d !== null) {
                $known = $d;
            }
            if (($s['dep'] ?? $s['arr']) >= $now && $known !== null) {
                return $known;
            }
        }

        return $known;
    }

    public static function minutes(?int $seconds): ?int
    {
        return $seconds === null ? null : (int) round($seconds / 60);
    }
}
