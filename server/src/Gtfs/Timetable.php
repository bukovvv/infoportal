<?php

declare(strict_types=1);

namespace KwInfo\Gtfs;

use KwInfo\Config;
use PDO;
use RuntimeException;

/** Dostęp tylko do odczytu do gtfs.sqlite. */
final class Timetable
{
    private PDO $pdo;
    /** @var array<string, string>|null */
    private ?array $meta = null;
    /** @var array<string, array<string, mixed>>|null */
    private ?array $stations = null;
    /** @var array<string, array<string, mixed>>|null */
    private ?array $routes = null;
    /** @var array<string, array<int, array{0: float, 1: float, 2: float|null}>> */
    private array $shapes = [];

    public function __construct(?string $path = null)
    {
        $path ??= Config::path('gtfs_db');
        if (!is_file($path)) {
            throw new RuntimeException('Rozkład nie został jeszcze zaimportowany.');
        }
        $this->pdo = new PDO('sqlite:' . $path, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $this->pdo->exec('PRAGMA query_only = ON');
    }

    public function pdo(): PDO
    {
        return $this->pdo;
    }

    /** @return array<string, string> */
    public function meta(): array
    {
        if ($this->meta === null) {
            $this->meta = [];
            foreach ($this->pdo->query('SELECT key, value FROM meta', PDO::FETCH_NUM) as [$key, $value]) {
                $this->meta[$key] = (string) $value;
            }
        }

        return $this->meta;
    }

    /** Przewoźnik główny (KW); kursy partnerów (POLREGIO) są tylko w wyszukiwarce połączeń. */
    public function agency(): string
    {
        return (string) Config::get('agency_id');
    }

    /** Warunek SQL na kursy przewoźnika głównego (pusty, gdy bierzemy też partnerów albo baza sprzed ich dodania). */
    private function agencyFilter(bool $partners, string $alias = 't'): string
    {
        return $partners || (int) ($this->meta()['schema'] ?? 0) < 2 ? '' : ' AND ' . $alias . '.agency = ' . $this->pdo->quote($this->agency());
    }

    public function version(): string
    {
        return substr(hash('sha1', ($this->meta()['feedVersion'] ?? '') . ($this->meta()['importedAt'] ?? '')), 0, 12);
    }

    /**
     * Wszystkie stacje; kw = false — staje tu tylko przewoźnik partnerski (stacja tylko dla wyszukiwarki połączeń).
     * @return array<string, array{id: string, name: string, lat: float, lon: float, daily: int, lines: array<int, string>, kw: bool}>
     */
    public function stations(): array
    {
        if ($this->stations === null) {
            $this->stations = [];
            foreach ($this->pdo->query('SELECT * FROM stations ORDER BY name') as $row) {
                $this->stations[$row['id']] = [
                    'id' => (string) $row['id'],
                    'name' => (string) $row['name'],
                    'lat' => round((float) $row['lat'], 6),
                    'lon' => round((float) $row['lon'], 6),
                    'daily' => (int) $row['daily'],
                    'lines' => $row['lines'] ? explode(',', (string) $row['lines']) : [],
                    'kw' => (int) ($row['kw'] ?? 1) === 1,
                ];
            }
        }

        return $this->stations;
    }

    /** @return array{id: string, name: string, lat: float, lon: float, daily: int, lines: array<int, string>, kw: bool}|null */
    public function station(string $id): ?array
    {
        return $this->stations()[$id] ?? null;
    }

    /** @return array<string, array{id: string, short: string, long: string, type: int, color: string|null, textColor: string|null}> */
    public function routes(): array
    {
        if ($this->routes === null) {
            $this->routes = [];
            foreach ($this->pdo->query('SELECT * FROM routes') as $row) {
                $this->routes[$row['route_id']] = [
                    'id' => (string) $row['route_id'],
                    'short' => (string) $row['short_name'],
                    'long' => (string) $row['long_name'],
                    'type' => (int) $row['type'],
                    'color' => $row['color'],
                    'textColor' => $row['text_color'],
                ];
            }
        }

        return $this->routes;
    }

    /** @return array<int, array{0: float, 1: float, 2: float|null}> */
    public function shape(?string $id): array
    {
        if ($id === null || $id === '') {
            return [];
        }
        if (!array_key_exists($id, $this->shapes)) {
            $stmt = $this->pdo->prepare('SELECT points FROM shapes WHERE shape_id = ?');
            $stmt->execute([$id]);
            $json = $stmt->fetchColumn();
            $this->shapes[$id] = is_string($json) ? (json_decode($json, true) ?: []) : [];
        }

        return $this->shapes[$id];
    }

    /**
     * Kształty z linią (KW ma pierwszeństwo, gdy kształt dzielą przewoźnicy); kw = 0 — kształt tylko partnera (przycięty do Wielkopolski).
     * @return array<int, array{shape_id: string, route_id: string, kw: int}>
     */
    public function shapeRoutes(): array
    {
        $stmt = $this->pdo->prepare('SELECT shape_id, SUBSTR(MIN((agency <> ?) || route_id), 2) AS route_id, MAX(agency = ?) AS kw
            FROM trips WHERE shape_id IN (SELECT shape_id FROM shapes) GROUP BY shape_id ORDER BY kw DESC');
        $stmt->execute([$this->agency(), $this->agency()]);

        return array_map(static fn (array $r): array => ['shape_id' => (string) $r['shape_id'], 'route_id' => (string) $r['route_id'], 'kw' => (int) $r['kw']], $stmt->fetchAll());
    }

    /**
     * Kursy aktywne w danym dniu kursowania wraz z postojami; $partners — także kursy przewoźników partnerskich.
     * @return array<string, array<string, mixed>> trip_id => kurs
     */
    public function tripsOn(int $date, bool $partners = false): array
    {
        $only = $this->agencyFilter($partners);
        $stmt = $this->pdo->prepare(
            'SELECT t.* FROM trips t JOIN service_dates sd ON sd.service_id = t.service_id AND sd.date = ?' . $only
        );
        $stmt->execute([$date]);
        $trips = [];
        foreach ($stmt as $row) {
            $trips[$row['trip_id']] = $this->tripFromRow($row);
        }
        if ($trips === []) {
            return [];
        }
        $numbers = $this->pdo->prepare(
            'SELECT tn.trip_id, tn.number FROM trip_numbers tn JOIN trips t ON t.trip_id = tn.trip_id JOIN service_dates sd ON sd.service_id = t.service_id AND sd.date = ?' . $only
        );
        $numbers->execute([$date]);
        foreach ($numbers->fetchAll(PDO::FETCH_NUM) as [$tripId, $number]) {
            $trips[$tripId]['numbers'][] = (string) $number;
        }
        $stops = $this->pdo->prepare(
            'SELECT st.trip_id, st.seq, st.station_id, st.arr, st.dep, st.dist, st.platform, st.track, st.pickup, st.dropoff
             FROM stop_times st JOIN trips t ON t.trip_id = st.trip_id JOIN service_dates sd ON sd.service_id = t.service_id AND sd.date = ?' . $only . '
             ORDER BY st.trip_id, st.seq'
        );
        $stops->execute([$date]);
        foreach ($stops->fetchAll(PDO::FETCH_NUM) as $s) {
            $trips[$s[0]]['stops'][] = [
                (int) $s[1], (string) $s[2], $s[3] === null ? null : (int) $s[3], $s[4] === null ? null : (int) $s[4],
                $s[5] === null ? null : (float) $s[5], $s[6], $s[7], (int) $s[8], (int) $s[9],
            ];
        }

        return array_filter($trips, static fn (array $trip): bool => count($trip['stops']) >= 2);
    }

    /** @return array<string, mixed>|null */
    public function trip(string $tripId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM trips WHERE trip_id = ?');
        $stmt->execute([$tripId]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        $trip = $this->tripFromRow($row);
        $n = $this->pdo->prepare('SELECT number FROM trip_numbers WHERE trip_id = ?');
        $n->execute([$tripId]);
        $trip['numbers'] = array_map('strval', $n->fetchAll(PDO::FETCH_COLUMN));
        $s = $this->pdo->prepare('SELECT seq, station_id, arr, dep, dist, platform, track, pickup, dropoff FROM stop_times WHERE trip_id = ? ORDER BY seq');
        $s->execute([$tripId]);
        foreach ($s->fetchAll(PDO::FETCH_NUM) as $r) {
            $trip['stops'][] = [(int) $r[0], (string) $r[1], $r[2] === null ? null : (int) $r[2], $r[3] === null ? null : (int) $r[3],
                $r[4] === null ? null : (float) $r[4], $r[5], $r[6], (int) $r[7], (int) $r[8]];
        }

        return $trip;
    }

    /** @return array<int, string> trip_id kursów z danym numerem */
    public function tripIdsForNumber(string $number): array
    {
        $stmt = $this->pdo->prepare('SELECT trip_id FROM trip_numbers WHERE number = ? UNION SELECT trip_id FROM trips WHERE short_name = ?');
        $stmt->execute([$number, $number]);

        return array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    /** @return array<int, string> trip_id kursów (KW i POLREGIO) z numerem zaczynającym się od $prefix (same cyfry) */
    public function tripIdsForNumberPrefix(string $prefix): array
    {
        if (preg_match('/^\d+$/', $prefix) !== 1) {
            return [];
        }
        $stmt = $this->pdo->prepare('SELECT trip_id FROM trip_numbers WHERE number GLOB ?');
        $stmt->execute([$prefix . '*']);

        return array_values(array_unique(array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN))));
    }

    public function runsOn(string $tripId, int $date): bool
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM trips t JOIN service_dates sd ON sd.service_id = t.service_id WHERE t.trip_id = ? AND sd.date = ?');
        $stmt->execute([$tripId, $date]);

        return (bool) $stmt->fetchColumn();
    }

    /** @return array<int, string> pozostałe odcinki tego samego kursu (np. ZKA + pociąg) */
    public function blockTrips(string $blockId): array
    {
        $stmt = $this->pdo->prepare('SELECT trip_id FROM trips WHERE block_id = ? ORDER BY trip_id');
        $stmt->execute([$blockId]);

        return array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    /** @param array<string, mixed> $row @return array<string, mixed> */
    private function tripFromRow(array $row): array
    {
        return [
            'tripId' => (string) $row['trip_id'],
            'routeId' => (string) $row['route_id'],
            'shapeId' => $row['shape_id'],
            'number' => (string) $row['short_name'],
            'headsign' => (string) $row['headsign'],
            'category' => $row['category'],
            'name' => $row['name'],
            'block' => (string) $row['block_id'],
            'isBus' => (int) $row['is_bus'] === 1,
            'agency' => (string) ($row['agency'] ?? $this->agency()),
            // kurs partnera obcięty do Wielkopolski: prawdziwa stacja początkowa i końcowa
            'originName' => $row['origin_name'] ?? null,
            'destinationName' => $row['destination_name'] ?? null,
            'numbers' => [],
            'stops' => [],
        ];
    }
}
