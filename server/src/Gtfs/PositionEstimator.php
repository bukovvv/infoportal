<?php

declare(strict_types=1);

namespace KwInfo\Gtfs;

/**
 * Pozycja pociągu wyliczona z rozkładu (lub czasów oczekiwanych): interpolacja w czasie między postojami,
 * a potem wzdłuż kształtu trasy po shape_dist_traveled. Bez kształtu — linia prosta między stacjami.
 */
final class PositionEstimator
{
    /**
     * @param array<int, array{arr: int|null, dep: int|null, dist: float|null, lat: float|null, lon: float|null}> $stops
     * @param array<int, array{0: float, 1: float, 2: float|null}> $shape
     * @return array{lat: float, lon: float, prev: int, next: int, progress: float, dwelling: bool, bearing: int|null, speed: int|null}|null
     */
    public static function estimate(array $stops, int $now, array $shape = []): ?array
    {
        $n = count($stops);
        if ($n < 2) {
            return null;
        }
        $first = $stops[0]['dep'] ?? $stops[0]['arr'];
        $last = $stops[$n - 1]['arr'] ?? $stops[$n - 1]['dep'];
        if ($first === null || $last === null || $now < $first - 60 || $now > $last + 60) {
            return null;
        }
        for ($i = 0; $i < $n; $i++) {
            $s = $stops[$i];
            $arr = $s['arr'] ?? $s['dep'];
            $dep = $s['dep'] ?? $s['arr'];
            if ($now <= $dep && ($i === 0 || $now >= $arr)) {
                return self::point($stops, $i, $i, 0.0, true, $shape, null);
            }
            if ($i + 1 < $n) {
                $next = $stops[$i + 1];
                $nextArr = $next['arr'] ?? $next['dep'];
                if ($now > $dep && $now < $nextArr) {
                    $f = ($now - $dep) / max(1, $nextArr - $dep);
                    $speed = null;
                    if ($s['dist'] !== null && $next['dist'] !== null) {
                        $speed = (int) round(($next['dist'] - $s['dist']) / max(1, $nextArr - $dep) * 3600);
                    }
                    return self::point($stops, $i, $i + 1, $f, false, $shape, $speed);
                }
            }
        }

        return self::point($stops, $n - 1, $n - 1, 0.0, true, $shape, null);
    }

    /**
     * @param array<int, array<string, mixed>> $stops
     * @param array<int, array{0: float, 1: float, 2: float|null}> $shape
     * @return array{lat: float, lon: float, prev: int, next: int, progress: float, dwelling: bool, bearing: int|null, speed: int|null}|null
     */
    private static function point(array $stops, int $a, int $b, float $f, bool $dwelling, array $shape, ?int $speed): ?array
    {
        $A = $stops[$a];
        $B = $stops[$b];
        $bearing = null;
        if ($shape !== [] && $A['dist'] !== null && $B['dist'] !== null && $shape[count($shape) - 1][2] !== null) {
            $dist = $A['dist'] + ($B['dist'] - $A['dist']) * $f;
            [$lat, $lon, $bearing] = self::alongShape($shape, $dist);
        } elseif ($A['lat'] !== null && ($B['lat'] ?? null) !== null) {
            $lat = $A['lat'] + ($B['lat'] - $A['lat']) * $f;
            $lon = $A['lon'] + ($B['lon'] - $A['lon']) * $f;
            if ($a !== $b) {
                $bearing = self::bearing($A['lat'], $A['lon'], $B['lat'], $B['lon']);
            }
        } else {
            return null;
        }

        return [
            'lat' => round($lat, 6),
            'lon' => round($lon, 6),
            'prev' => $a,
            'next' => $b,
            'progress' => round($f, 3),
            'dwelling' => $dwelling,
            'bearing' => $bearing,
            'speed' => $dwelling ? 0 : $speed,
        ];
    }

    /** @param array<int, array{0: float, 1: float, 2: float|null}> $shape @return array{0: float, 1: float, 2: int|null} */
    public static function alongShape(array $shape, float $dist): array
    {
        $lo = 0;
        $hi = count($shape) - 1;
        if ($dist <= (float) $shape[0][2]) {
            return [$shape[0][0], $shape[0][1], $hi > 0 ? self::bearing($shape[0][0], $shape[0][1], $shape[1][0], $shape[1][1]) : null];
        }
        if ($dist >= (float) $shape[$hi][2]) {
            return [$shape[$hi][0], $shape[$hi][1], $hi > 0 ? self::bearing($shape[$hi - 1][0], $shape[$hi - 1][1], $shape[$hi][0], $shape[$hi][1]) : null];
        }
        while ($hi - $lo > 1) {
            $mid = intdiv($lo + $hi, 2);
            if ((float) $shape[$mid][2] <= $dist) {
                $lo = $mid;
            } else {
                $hi = $mid;
            }
        }
        $p = $shape[$lo];
        $q = $shape[$hi];
        $span = max(1e-9, (float) $q[2] - (float) $p[2]);
        $r = ($dist - (float) $p[2]) / $span;

        return [$p[0] + ($q[0] - $p[0]) * $r, $p[1] + ($q[1] - $p[1]) * $r, self::bearing($p[0], $p[1], $q[0], $q[1])];
    }

    public static function bearing(float $lat1, float $lon1, float $lat2, float $lon2): int
    {
        $y = sin(deg2rad($lon2 - $lon1)) * cos(deg2rad($lat2));
        $x = cos(deg2rad($lat1)) * sin(deg2rad($lat2)) - sin(deg2rad($lat1)) * cos(deg2rad($lat2)) * cos(deg2rad($lon2 - $lon1));

        return ((int) round(rad2deg(atan2($y, $x))) + 360) % 360;
    }

    public static function distanceKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;

        return 6371 * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
