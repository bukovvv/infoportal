<?php

declare(strict_types=1);

namespace KwInfo\Api;

use KwInfo\Gtfs\Timetable;
use KwInfo\Http\ApiException;
use KwInfo\Http\Response;
use PDO;

/**
 * Porównanie dwóch dni rozkładu (podgląd /nowyrj27: dzień starego i nowego rozkładu jazdy) —
 * pociągi i km według przewoźników, pociągi w ruchu w każdej godzinie, zmiany na stacjach, numery pociągów,
 * pociągi bezpośrednie w wybranej relacji. Kurs liczy się do dnia, w którym rusza (jak w rozkładzie).
 */
final class CompareApi
{
    private const TOP = 12;
    private const NUMBERS = 80;

    private ?Timetable $tt = null;

    public function summary(): Response
    {
        [$old, $new] = $this->dates();
        $days = [$this->trips($old), $this->trips($new)];
        $calls = [$this->calls($old), $this->calls($new)];

        $agencies = [];
        foreach (array_unique([...array_column($days[0], 'agency'), ...array_column($days[1], 'agency')]) as $agency) {
            $agencies[] = ['agency' => $agency] + $this->pair($days, $calls, $agency);
        }
        usort($agencies, static fn (array $a, array $b): int => $b['new']['trains'] <=> $a['new']['trains']);

        return new Response([
            'old' => self::iso($old),
            'new' => self::iso($new),
            'total' => $this->pair($days, $calls, null),
            'agencies' => $agencies,
            'hours' => array_map(static fn (int $h): array => [
                'hour' => $h,
                'old' => self::inMotion($days[0], $h),
                'new' => self::inMotion($days[1], $h),
            ], range(0, 23)),
            'stations' => $this->stationChanges($calls),
            'numbers' => $this->numberChanges($days),
        ], 200, [], 3600);
    }

    public function route(): Response
    {
        [$old, $new] = $this->dates();
        $from = (string) ($_GET['from'] ?? '');
        $to = (string) ($_GET['to'] ?? '');
        if ($from === '' || $to === '' || $from === $to || !$this->tt()->station($from) || !$this->tt()->station($to)) {
            throw new ApiException('Wybierz dwie różne stacje.', 422);
        }
        $side = function (int $date) use ($from, $to): array {
            $trains = $this->direct($date, $from, $to);
            $minutes = array_column($trains, 'minutes');

            return [
                'trains' => $trains,
                'count' => count($trains),
                'fastest' => $minutes ? min($minutes) : null,
                'average' => $minutes ? (int) round(array_sum($minutes) / count($minutes)) : null,
            ];
        };

        return new Response([
            'from' => ['id' => $from, 'name' => $this->tt()->station($from)['name']],
            'to' => ['id' => $to, 'name' => $this->tt()->station($to)['name']],
            'old' => ['date' => self::iso($old)] + $side($old),
            'new' => ['date' => self::iso($new)] + $side($new),
        ], 200, [], 3600);
    }

    private function tt(): Timetable
    {
        return $this->tt ??= new Timetable();
    }

    /** @return array{0: int, 1: int} RRRRMMDD obu dni (?old=RRRR-MM-DD&new=…), w zakresie rozkładu */
    private function dates(): array
    {
        $meta = $this->tt()->meta();
        $out = [];
        foreach (['old', 'new'] as $key) {
            $value = (string) ($_GET[$key] ?? '');
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
                throw new ApiException('Podaj oba dni (RRRR-MM-DD).', 422);
            }
            $date = (int) str_replace('-', '', $value);
            // partnerzy mogą mieć szerszy zakres niż KW — granicą są dni w service_dates
            if (!$this->hasDay($date)) {
                throw new ApiException('Dzień ' . date('d.m.Y', strtotime($value)) . ' jest poza pobranym rozkładem (' . date('d.m', strtotime($meta['validFrom'])) . ' – ' . date('d.m.Y', strtotime($meta['validUntil'])) . ').', 422);
            }
            $out[] = $date;
        }

        return $out;
    }

    private function hasDay(int $date): bool
    {
        $stmt = $this->tt()->pdo()->prepare('SELECT 1 FROM service_dates WHERE date = ? LIMIT 1');
        $stmt->execute([$date]);

        return $stmt->fetchColumn() !== false;
    }

    /** @return list<array{agency: string, number: string, name: ?string, bus: bool, dep: int, arr: int, km: float, from: string, to: string}> */
    private function trips(int $date): array
    {
        $stmt = $this->tt()->pdo()->prepare(
            'SELECT t.trip_id, t.agency, t.short_name, t.name, t.is_bus, MIN(st.dep) AS dep, MAX(st.arr) AS arr,
                    COALESCE(MAX(st.dist) - MIN(st.dist), 0) AS km, MIN(st.seq) AS first, MAX(st.seq) AS last
             FROM trips t JOIN service_dates sd ON sd.service_id = t.service_id AND sd.date = ?
             JOIN stop_times st ON st.trip_id = t.trip_id
             GROUP BY t.trip_id HAVING COUNT(*) >= 2'
        );
        $stmt->execute([$date]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        // nazwy stacji początkowej i końcowej (do listy nowych / znikających numerów)
        $ends = $this->tt()->pdo()->prepare(
            'SELECT st.trip_id, st.seq, s.name FROM stop_times st JOIN stations s ON s.id = st.station_id
             JOIN trips t ON t.trip_id = st.trip_id JOIN service_dates sd ON sd.service_id = t.service_id AND sd.date = ?'
        );
        $ends->execute([$date]);
        $names = [];
        foreach ($ends->fetchAll(PDO::FETCH_NUM) as [$tripId, $seq, $name]) {
            $names[$tripId][(int) $seq] = (string) $name;
        }

        return array_map(static fn (array $r): array => [
            'agency' => (string) $r['agency'],
            'number' => self::baseNumber((string) $r['short_name']),
            'name' => $r['name'] ?: null,
            'bus' => (int) $r['is_bus'] === 1,
            'dep' => (int) $r['dep'],
            'arr' => (int) $r['arr'],
            'km' => (float) $r['km'],
            'from' => $names[$r['trip_id']][(int) $r['first']] ?? '',
            'to' => $names[$r['trip_id']][(int) $r['last']] ?? '',
        ], $rows);
    }

    /** @return array<string, array<string, int>> stacja => przewoźnik => liczba postojów (bez autobusów) */
    private function calls(int $date): array
    {
        $stmt = $this->tt()->pdo()->prepare(
            'SELECT st.station_id, t.agency, COUNT(*) FROM stop_times st JOIN trips t ON t.trip_id = st.trip_id AND t.is_bus = 0
             JOIN service_dates sd ON sd.service_id = t.service_id AND sd.date = ? GROUP BY st.station_id, t.agency'
        );
        $stmt->execute([$date]);
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_NUM) as [$station, $agency, $count]) {
            $out[(string) $station][(string) $agency] = (int) $count;
        }

        return $out;
    }

    /**
     * @param array{0: list<array<string, mixed>>, 1: list<array<string, mixed>>} $days
     * @param array{0: array<string, array<string, int>>, 1: array<string, array<string, int>>} $calls
     * @return array{old: array<string, int|float|null>, new: array<string, int|float|null>}
     */
    private function pair(array $days, array $calls, ?string $agency): array
    {
        $side = static function (array $trips, array $calls) use ($agency): array {
            $trips = array_filter($trips, static fn (array $t): bool => $agency === null || $t['agency'] === $agency);
            $trains = array_filter($trips, static fn (array $t): bool => !$t['bus']);
            $km = array_sum(array_column($trains, 'km'));
            $hours = array_sum(array_map(static fn (array $t): int => max(0, $t['arr'] - $t['dep']), $trains)) / 3600;
            $stations = count(array_filter($calls, static fn (array $byAgency): bool => $agency === null || isset($byAgency[$agency])));

            return [
                'trains' => count($trains),
                'buses' => count($trips) - count($trains),
                'km' => (int) round($km),
                'calls' => array_sum(array_map(static fn (array $byAgency): int => $agency === null ? array_sum($byAgency) : ($byAgency[$agency] ?? 0), $calls)),
                'stations' => $stations,
                // średnia prędkość handlowa: km po torach / czas od pierwszego odjazdu do ostatniego przyjazdu
                'speed' => $hours > 0 ? round($km / $hours, 1) : null,
            ];
        };

        return ['old' => $side($days[0], $calls[0]), 'new' => $side($days[1], $calls[1])];
    }

    /** Pociągi (bez autobusów) w drodze o pełnej godzinie + 30 min. @param list<array<string, mixed>> $trips */
    private static function inMotion(array $trips, int $hour): int
    {
        $at = $hour * 3600 + 1800;
        $n = 0;
        foreach ($trips as $t) {
            // kursy po północy mają czasy powyżej 24:00 — liczą się też w godzinach następnej doby
            if (!$t['bus'] && (($t['dep'] <= $at && $t['arr'] >= $at) || ($t['dep'] <= $at + 86400 && $t['arr'] >= $at + 86400))) {
                $n++;
            }
        }

        return $n;
    }

    /**
     * @param array{0: array<string, array<string, int>>, 1: array<string, array<string, int>>} $calls
     * @return array<string, list<array<string, mixed>>>
     */
    private function stationChanges(array $calls): array
    {
        $names = array_column($this->tt()->stations(), 'name', 'id');
        $rows = [];
        foreach (array_unique([...array_keys($calls[0]), ...array_keys($calls[1])]) as $id) {
            $old = array_sum($calls[0][$id] ?? []);
            $new = array_sum($calls[1][$id] ?? []);
            $rows[] = ['id' => (string) $id, 'name' => $names[$id] ?? (string) $id, 'old' => $old, 'new' => $new, 'diff' => $new - $old];
        }
        $up = array_filter($rows, static fn (array $r): bool => $r['diff'] > 0 && $r['old'] > 0);
        $down = array_filter($rows, static fn (array $r): bool => $r['diff'] < 0 && $r['new'] > 0);
        usort($up, static fn (array $a, array $b): int => $b['diff'] <=> $a['diff']);
        usort($down, static fn (array $a, array $b): int => $a['diff'] <=> $b['diff']);
        $byName = static fn (array $a, array $b): int => strcmp($a['name'], $b['name']);
        $opened = array_values(array_filter($rows, static fn (array $r): bool => $r['old'] === 0 && $r['new'] > 0));
        $closed = array_values(array_filter($rows, static fn (array $r): bool => $r['new'] === 0 && $r['old'] > 0));
        usort($opened, $byName);
        usort($closed, $byName);

        return [
            'up' => array_slice($up, 0, self::TOP),
            'down' => array_slice($down, 0, self::TOP),
            'opened' => $opened,
            'closed' => $closed,
        ];
    }

    /**
     * Numery pociągów (bez autobusów) tylko w jednym z dni — nowe i znikające, według przewoźnika.
     * @param array{0: list<array<string, mixed>>, 1: list<array<string, mixed>>} $days
     * @return list<array<string, mixed>>
     */
    private function numberChanges(array $days): array
    {
        $index = static function (array $trips): array {
            $out = [];
            foreach ($trips as $t) {
                if (!$t['bus'] && $t['number'] !== '') {
                    $out[$t['agency']][$t['number']] ??= $t;
                }
            }

            return $out;
        };
        [$old, $new] = [$index($days[0]), $index($days[1])];
        $list = static function (array $only): array {
            usort($only, static fn (array $a, array $b): int => $a['dep'] <=> $b['dep']);

            return array_map(static fn (array $t): array => [
                'number' => $t['number'], 'name' => $t['name'], 'from' => $t['from'], 'to' => $t['to'],
                'dep' => self::clock($t['dep']), 'arr' => self::clock($t['arr']),
            ], array_slice($only, 0, self::NUMBERS));
        };
        $out = [];
        foreach (array_unique([...array_keys($old), ...array_keys($new)]) as $agency) {
            $added = array_diff_key($new[$agency] ?? [], $old[$agency] ?? []);
            $removed = array_diff_key($old[$agency] ?? [], $new[$agency] ?? []);
            $out[] = [
                'agency' => $agency,
                'kept' => count(array_intersect_key($new[$agency] ?? [], $old[$agency] ?? [])),
                'addedCount' => count($added),
                'removedCount' => count($removed),
                'added' => $list(array_values($added)),
                'removed' => $list(array_values($removed)),
            ];
        }

        return $out;
    }

    /** @return list<array<string, mixed>> pociągi bezpośrednie A → B danego dnia, według odjazdu */
    private function direct(int $date, string $from, string $to): array
    {
        $stmt = $this->tt()->pdo()->prepare(
            'SELECT t.agency, t.short_name, t.name, t.is_bus, a.dep, b.arr
             FROM stop_times a JOIN stop_times b ON b.trip_id = a.trip_id AND b.seq > a.seq AND b.station_id = ?
             JOIN trips t ON t.trip_id = a.trip_id JOIN service_dates sd ON sd.service_id = t.service_id AND sd.date = ?
             WHERE a.station_id = ? AND a.pickup <> 1 AND b.dropoff <> 1 ORDER BY a.dep'
        );
        $stmt->execute([$to, $date, $from]);

        return array_map(static fn (array $r): array => [
            'agency' => (string) $r['agency'],
            'number' => self::baseNumber((string) $r['short_name']),
            'name' => $r['name'] ?: null,
            'bus' => (int) $r['is_bus'] === 1,
            'dep' => self::clock((int) $r['dep']),
            'arr' => self::clock((int) $r['arr']),
            'minutes' => intdiv((int) $r['arr'] - (int) $r['dep'], 60),
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /** „83114/5 Matejko” → „83114/5”, „77541” → „77541” */
    public static function baseNumber(string $short): string
    {
        return preg_match('/^\d+(?:\/\d+)?/', trim($short), $m) === 1 ? $m[0] : trim($short);
    }

    private static function clock(int $seconds): string
    {
        return sprintf('%02d:%02d', intdiv($seconds, 3600) % 24, intdiv($seconds % 3600, 60));
    }

    private static function iso(int $date): string
    {
        return sprintf('%04d-%02d-%02d', intdiv($date, 10000), intdiv($date, 100) % 100, $date % 100);
    }
}
