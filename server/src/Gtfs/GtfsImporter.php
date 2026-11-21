<?php

declare(strict_types=1);

namespace KwInfo\Gtfs;

use KwInfo\Clock;
use KwInfo\Config;
use KwInfo\Net\HttpClient;
use PDO;
use RuntimeException;

/**
 * Pobiera polish_trains.zip (mkuran.pl), wybiera kursy przewoźnika regionu (KW, KML) i buduje gtfs.sqlite regionu.
 * Kursy przewoźników partnerskich (POLREGIO, PKP Intercity) trafiają do bazy obcięte do stacji w województwie,
 * a ich kształty — do odcinka między pierwszym a ostatnim zachowanym postojem.
 * Archiwum jest wspólne dla regionów (jedno pobranie); region przebudowuje bazę, gdy archiwum jest nowsze od niej.
 * Nowa baza zastępuje starą dopiero po pozytywnej walidacji.
 */
final class GtfsImporter
{
    /** Wersja układu bazy — starsza baza jest przebudowywana nawet bez zmian w rozkładzie. */
    public const SCHEMA = 6;

    /** @var callable(string): void */
    private $log;

    public function __construct(?callable $log = null)
    {
        $this->log = $log ?? static function (string $line): void {
        };
    }

    /**
     * @param bool $fetch false — bez pobierania (archiwum pobrał już poprzedni region w tym samym uruchomieniu)
     * @return array<string, mixed>
     */
    public function run(bool $force = false, ?string $localFile = null, bool $fetch = true): array
    {
        $storage = Config::path('storage');
        $regionStorage = Config::path('region_storage');
        foreach ([$storage, $regionStorage] as $dir) {
            if (!is_dir($dir)) {
                mkdir($dir, 0775, true);
            }
        }
        $zipPath = $localFile ?? $storage . '/polish_trains.zip';
        if ($localFile === null) {
            $download = $fetch || !is_file($zipPath) ? $this->download($zipPath, $force) : null;
            // znacznik pobrania jest wspólny; region, którego import się nie udał, ma bazę starszą od archiwum i spróbuje znowu
            if ($download !== null) {
                file_put_contents($this->downloadMetaFile(), json_encode($download));
            }
            $db = Config::path('gtfs_db');
            if (!$force && is_file($db) && self::schemaOf($db) === self::SCHEMA && filemtime($db) >= filemtime($zipPath)) {
                ($this->log)('Rozkład bez zmian od ostatniego importu.');
                return ['skipped' => true];
            }
        }

        $started = microtime(true);
        $tmp = $regionStorage . '/gtfs.building.sqlite';
        @unlink($tmp);
        $stats = $this->build(new GtfsSource($zipPath), $tmp);
        $this->validate($stats);
        $this->swap($tmp, Config::path('gtfs_db'));
        $stats['seconds'] = round(microtime(true) - $started, 1);
        ($this->log)(sprintf(
            '%s: %d kursów %s (+ %d partnerów w województwie), %d stacji, %d kształtów, rozkład %s – %s (%.1f s).',
            Config::get('region_name'), $stats['trips'], Config::get('agency_id'), $stats['partnerTrips'], $stats['stations'], $stats['shapes'], $stats['validFrom'], $stats['validUntil'], $stats['seconds']
        ));

        return $stats;
    }

    private static function schemaOf(string $path): int
    {
        try {
            $pdo = new PDO('sqlite:' . $path, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
            return (int) $pdo->query("SELECT value FROM meta WHERE key = 'schema'")->fetchColumn();
        } catch (\Throwable) {
            return 0;
        }
    }

    private function downloadMetaFile(): string
    {
        return Config::path('storage') . '/gtfs-download.json';
    }

    /** @return array{lastModified: string|null, downloadedAt: string}|null null — plik bez zmian (HTTP 304) */
    private function download(string $zipPath, bool $force): ?array
    {
        $metaFile = $this->downloadMetaFile();
        $meta = is_file($metaFile) ? (json_decode((string) file_get_contents($metaFile), true) ?: []) : [];
        $headers = [];
        if (!$force && is_file($zipPath) && !empty($meta['lastModified'])) {
            $headers[] = 'If-Modified-Since: ' . $meta['lastModified'];
        }
        ($this->log)('Pobieranie ' . Config::get('gtfs_url') . ' …');
        $part = $zipPath . '.part';
        $response = HttpClient::get((string) Config::get('gtfs_url'), $headers, 300, $part);
        if ($response['status'] === 304) {
            @unlink($part);
            return null;
        }
        if ($response['status'] !== 200 || filesize($part) < 1_000_000) {
            @unlink($part);
            throw new RuntimeException('Pobieranie rozkładu nie powiodło się (HTTP ' . $response['status'] . ').');
        }
        @unlink($zipPath);
        rename($part, $zipPath);

        return [
            'lastModified' => $response['headers']['last-modified'] ?? null,
            'downloadedAt' => Clock::now()->format(DATE_ATOM),
        ];
    }

    /** @return array<string, mixed> */
    private function build(GtfsSource $src, string $path): array
    {
        $agency = (string) Config::get('agency_id');
        $partners = array_keys((array) Config::get('partner_agencies'));
        // region bez granicy (nowyrj27) — kursy partnerów w całości, jak kursy przewoźnika
        $crop = Config::get('region_file') !== null;
        $region = $crop ? new Region() : null;
        $pdo = new PDO('sqlite:' . $path, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $pdo->exec('PRAGMA journal_mode = OFF; PRAGMA synchronous = OFF;');
        $pdo->exec(file_get_contents(__DIR__ . '/schema.sql'));
        $pdo->beginTransaction();

        // routes
        $routes = [];
        $insRoute = $pdo->prepare('INSERT INTO routes VALUES (?,?,?,?,?,?)');
        foreach ($src->rows('routes.txt') as $r) {
            if ($r['agency_id'] !== $agency && !in_array($r['agency_id'], $partners, true)) {
                continue;
            }
            $routes[$r['route_id']] = $r['agency_id'];
            $insRoute->execute([$r['route_id'], $r['route_short_name'], $r['route_long_name'], (int) $r['route_type'],
                $r['route_color'] !== '' ? '#' . $r['route_color'] : null, $r['route_text_color'] !== '' ? '#' . $r['route_text_color'] : null]);
        }
        ($this->log)('Linie: ' . count($routes));

        // trips
        $trips = [];
        $services = [];
        $shapesNeeded = [];
        /** @var array<string, string> $partnerShapes kurs partnera => kształt (zapisywany przycięty, gdy kurs zostanie) */
        $partnerShapes = [];
        $insTrip = $pdo->prepare('INSERT INTO trips (trip_id, route_id, service_id, shape_id, short_name, headsign, category, name, block_id, is_bus, agency) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
        $insNumber = $pdo->prepare('INSERT OR IGNORE INTO trip_numbers VALUES (?,?)');
        $busRoutes = [];
        foreach ($pdo->query('SELECT route_id, type FROM routes') as $row) {
            $busRoutes[$row['route_id']] = (int) $row['type'] === 3;
        }
        foreach ($src->rows('trips.txt') as $t) {
            if (!isset($routes[$t['route_id']])) {
                continue;
            }
            $id = $t['trip_id'];
            $tripAgency = $routes[$t['route_id']];
            // kursy partnerów: true = obcinane do województwa (kształt też)
            $trips[$id] = $crop && $tripAgency !== $agency;
            $services[$t['service_id']] = true;
            $shape = $t['shape_id'] ?: null;
            if ($shape !== null && !$trips[$id]) {
                $shapesNeeded[$shape] = true;
            } elseif ($shape !== null) {
                $partnerShapes[$id] = $shape;
            }
            $short = $t['trip_short_name'] !== '' ? $t['trip_short_name'] : ($t['plk_train_number'] ?? '');
            $insTrip->execute([$id, $t['route_id'], $t['service_id'], $shape, $short, $t['trip_headsign'],
                $t['plk_category_code'] ?? null, ($t['plk_train_name'] ?? '') ?: null,
                preg_replace('/_LEG\d+$/', '', $id), $busRoutes[$t['route_id']] ? 1 : 0, $tripAgency]);
            // numer PLK i handlowy (w Intercity bywają różne: „212 Comenius” = PLK 34004/5)
            foreach (array_unique([...self::splitNumbers(($t['plk_train_number'] ?? '') ?: $short), ...self::splitNumbers($short)]) as $number) {
                $insNumber->execute([$number, $id]);
            }
        }
        ($this->log)('Kursy: ' . count($trips) . ' (przed obcięciem partnerów do województwa)');

        // stops → stacje (poziom stacji nadrzędnej)
        $stops = [];
        foreach ($src->rows('stops.txt') as $s) {
            $stops[$s['stop_id']] = $s;
        }
        $stationOf = static function (string $stopId) use ($stops): string {
            $parent = $stops[$stopId]['parent_station'] ?? '';
            return $parent !== '' && isset($stops[$parent]) ? $parent : $stopId;
        };

        $inRegion = [];
        $isInRegion = static function (string $stationId) use ($stops, $region, &$inRegion): bool {
            $s = $stops[$stationId] ?? null;
            return $inRegion[$stationId] ??= $s !== null && $region->contains((float) $s['stop_lat'], (float) $s['stop_lon'], $s['stop_name']);
        };

        // stacje KW (także poza Wielkopolską, np. Mogilno) — kursy partnerów mogą na nich zostać, gdy łączą się z odcinkiem w województwie
        $kwStations = [];
        foreach ($src->rows('stop_times.txt') as $s) {
            if (($trips[$s['trip_id']] ?? null) === false) {
                $kwStations[$stationOf($s['stop_id'])] = true;
            }
        }

        // stop_times (największy plik — strumieniowo); kursy KW od razu, kursy partnerów po wybraniu postojów
        $insStop = $pdo->prepare('INSERT INTO stop_times VALUES (?,?,?,?,?,?,?,?,?,?,?)');
        $rowOf = static fn (array $s, string $stationId): array => [$s['trip_id'], (int) $s['stop_sequence'], $stationId, $s['stop_id'],
            (Clock::parseGtfsTime($s['arrival_time']) ?? Clock::parseGtfsTime($s['departure_time'])),
            (Clock::parseGtfsTime($s['departure_time']) ?? Clock::parseGtfsTime($s['arrival_time'])),
            $s['shape_dist_traveled'] !== '' ? (float) $s['shape_dist_traveled'] : null,
            ($s['platform'] ?? '') ?: null, ($s['track'] ?? '') ?: null, (int) ($s['pickup_type'] ?: 0), (int) ($s['drop_off_type'] ?: 0)];
        /** @var array<string, array{0: int, 1: string, 2: int, 3: string}> $ends */
        $ends = [];
        /** @var array<string, array<int, int>> $kinds kurs partnera => seq => 2 w Wielkopolsce, 1 stacja KW poza nią, 0 inna */
        $kinds = [];
        /** @var array<string, array<int, array<int, mixed>>> $candidates wiersze postojów rodzaju 1 i 2 */
        $candidates = [];
        /** @var array<string, array{0: float, 1: float}> $shapeRanges kształt partnera => [od km, do km] */
        $shapeRanges = [];
        foreach ($src->rows('stop_times.txt') as $s) {
            $tripId = $s['trip_id'];
            if (!isset($trips[$tripId])) {
                continue;
            }
            $stationId = $stationOf($s['stop_id']);
            if (!$trips[$tripId]) {
                $insStop->execute($rowOf($s, $stationId));
                continue;
            }
            // prawdziwy początek i koniec kursu partnera (przed obcięciem) — do „z:” i „do” na tablicy
            $seq = (int) $s['stop_sequence'];
            $e = &$ends[$tripId];
            if ($e === null || $seq < $e[0]) {
                [$e[0], $e[1]] = [$seq, $stationId];
            }
            if ($seq > ($e[2] ?? -1)) {
                [$e[2], $e[3]] = [$seq, $stationId];
            }
            unset($e);
            $kind = $isInRegion($stationId) ? 2 : (isset($kwStations[$stationId]) ? 1 : 0);
            $kinds[$tripId][$seq] = $kind;
            if ($kind > 0) {
                $candidates[$tripId][$seq] = $rowOf($s, $stationId);
            }
        }
        // postoje partnera: w Wielkopolsce oraz stacje KW poza nią, do których kurs dojeżdża z województwa bez przerwy
        // (Gniezno – Trzemeszno – Mogilno tak, dalej Inowrocław już nie; kurs tylko poza Wielkopolską — wcale)
        foreach ($kinds as $tripId => $bySeq) {
            ksort($bySeq);
            $seqs = array_keys($bySeq);
            $keep = [];
            foreach ($seqs as $i => $seq) {
                if ($bySeq[$seq] !== 2) {
                    continue;
                }
                $keep[$seq] = true;
                for ($j = $i + 1; isset($seqs[$j]) && $bySeq[$seqs[$j]] === 1; $j++) {
                    $keep[$seqs[$j]] = true;
                }
                for ($j = $i - 1; $j >= 0 && $bySeq[$seqs[$j]] === 1; $j--) {
                    $keep[$seqs[$j]] = true;
                }
            }
            foreach (array_keys($keep) as $seq) {
                $insStop->execute($candidates[$tripId][$seq]);
            }
            // zakres kształtu (km) potrzebny na mapie: od pierwszego do ostatniego zachowanego postoju, suma po kursach
            $dists = array_filter(array_map(static fn (int $seq): ?float => $candidates[$tripId][$seq][6], array_keys($keep)), static fn (?float $d): bool => $d !== null);
            $shape = $partnerShapes[$tripId] ?? null;
            if (count($keep) >= 2 && $shape !== null && count($dists) === count($keep) && !isset($shapesNeeded[$shape])) {
                $range = $shapeRanges[$shape] ?? [INF, -INF];
                $shapeRanges[$shape] = [min($range[0], min($dists)), max($range[1], max($dists))];
            }
        }
        foreach (array_keys($shapeRanges) as $shape) {
            $shapesNeeded[$shape] = true;
        }
        unset($kinds, $candidates, $kwStations);
        // kursy partnerów, z których został najwyżej jeden postój, nie przydadzą się
        $pdo->exec('CREATE TEMP TABLE short_trips AS SELECT t.trip_id FROM trips t LEFT JOIN stop_times st ON st.trip_id = t.trip_id
            WHERE t.agency <> ' . $pdo->quote($agency) . ' GROUP BY t.trip_id HAVING COUNT(st.seq) < 2');
        foreach (['stop_times', 'trip_numbers', 'trips'] as $table) {
            $pdo->exec("DELETE FROM $table WHERE trip_id IN (SELECT trip_id FROM short_trips)");
        }
        $updEnds = $pdo->prepare('UPDATE trips SET origin_name = ?, destination_name = ? WHERE trip_id = ?');
        foreach ($ends as $tripId => $e) {
            $updEnds->execute([$stops[$e[1]]['stop_name'] ?? null, $stops[$e[3]]['stop_name'] ?? null, $tripId]);
        }
        unset($ends);
        $rows = (int) $pdo->query('SELECT COUNT(*) FROM stop_times')->fetchColumn();
        ($this->log)('Postoje: ' . $rows);

        $insStation = $pdo->prepare('INSERT INTO stations (id, name, lat, lon) VALUES (?,?,?,?)');
        foreach ($pdo->query('SELECT DISTINCT station_id FROM stop_times')->fetchAll(PDO::FETCH_COLUMN) as $stationId) {
            if (isset($stops[$stationId])) {
                $st = $stops[$stationId];
                $insStation->execute([$st['stop_id'], $st['stop_name'], (float) $st['stop_lat'], (float) $st['stop_lon']]);
            }
        }
        // stacje, na których staje KW (tablica odjazdów, mapa); pozostałe tylko w wyszukiwarce połączeń
        $pdo->prepare('UPDATE stations SET kw = EXISTS (SELECT 1 FROM stop_times st JOIN trips t ON t.trip_id = st.trip_id WHERE st.station_id = stations.id AND t.agency = ?)')->execute([$agency]);
        unset($stops);

        // kalendarz
        $insDate = $pdo->prepare('INSERT OR IGNORE INTO service_dates VALUES (?,?)');
        $removed = [];
        if ($src->has('calendar.txt')) {
            foreach ($src->rows('calendar.txt') as $c) {
                if (!isset($services[$c['service_id']])) {
                    continue;
                }
                $days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                for ($d = (int) $c['start_date']; $d <= (int) $c['end_date']; $d = Clock::addDays($d, 1)) {
                    if ($c[$days[(int) Clock::midnight($d)->format('N') - 1]] === '1') {
                        $insDate->execute([$c['service_id'], $d]);
                    }
                }
            }
        }
        foreach ($src->rows('calendar_dates.txt') as $c) {
            if (!isset($services[$c['service_id']])) {
                continue;
            }
            if ($c['exception_type'] === '1') {
                $insDate->execute([$c['service_id'], (int) $c['date']]);
            } else {
                $removed[] = [$c['service_id'], (int) $c['date']];
            }
        }
        $del = $pdo->prepare('DELETE FROM service_dates WHERE service_id = ? AND date = ?');
        foreach ($removed as $r) {
            $del->execute($r);
        }

        // kształty — upraszczane, z zachowaniem odległości do estymacji pozycji
        $insShape = $pdo->prepare('INSERT INTO shapes VALUES (?,?)');
        $current = null;
        $points = [];
        $flush = function () use (&$current, &$points, $insShape, $shapeRanges): void {
            if ($current !== null && count($points) > 1) {
                usort($points, static fn (array $a, array $b): int => $a[3] <=> $b[3]);
                // kształt kursów partnera: tylko odcinek w Wielkopolsce (+ punkt z każdej strony), odległości bez zmian
                if (isset($shapeRanges[$current])) {
                    [$min, $max] = $shapeRanges[$current];
                    $inside = array_keys(array_filter($points, static fn (array $p): bool => $p[2] !== null && $p[2] >= $min && $p[2] <= $max));
                    $points = $inside === [] ? [] : array_slice($points, max(0, $inside[0] - 1), min(count($points) - 1, end($inside) + 1) - max(0, $inside[0] - 1) + 1);
                }
            }
            if ($current !== null && count($points) > 1) {
                $simplified = self::simplify(array_map(static fn (array $p): array => [$p[0], $p[1], $p[2]], $points), 0.00004);
                $insShape->execute([$current, json_encode($simplified)]);
            }
            $points = [];
        };
        foreach ($src->rows('shapes.txt') as $p) {
            if (!isset($shapesNeeded[$p['shape_id']])) {
                continue;
            }
            if ($p['shape_id'] !== $current) {
                $flush();
                $current = $p['shape_id'];
            }
            $points[] = [round((float) $p['shape_pt_lat'], 6), round((float) $p['shape_pt_lon'], 6),
                $p['shape_dist_traveled'] !== '' ? round((float) $p['shape_dist_traveled'], 3) : null, (int) $p['shape_pt_sequence']];
        }
        $flush();

        // meta i statystyki
        $feed = iterator_to_array($src->rows('feed_info.txt'))[0] ?? [];
        $pdo->exec('DELETE FROM service_dates WHERE service_id NOT IN (SELECT service_id FROM trips)');
        // ważność rozkładu według kursów KW (partnerzy mogą mieć inny zakres)
        $range = $pdo->query('SELECT MIN(date), MAX(date) FROM service_dates WHERE service_id IN (SELECT service_id FROM trips WHERE agency = ' . $pdo->quote($agency) . ')')->fetch(PDO::FETCH_NUM);
        $otherAgencies = [];
        foreach ($src->rows('agency.txt') as $a) {
            if ($a['agency_id'] !== $agency) {
                $otherAgencies[$a['agency_id']] = true;
            }
        }
        $attribution = [];
        foreach ($src->rows('attributions.txt') as $a) {
            if (!isset($otherAgencies[$a['attribution_id'] ?? ''])) {
                $attribution[] = $a['organization_name'];
            }
        }
        $pdo->commit();
        $pdo->exec(file_get_contents(__DIR__ . '/indexes.sql'));

        // liczba odjazdów na stacji w najbardziej obciążonym dniu (do sortowania podpowiedzi)
        $busiest = (int) $pdo->query('SELECT sd.date FROM service_dates sd JOIN trips t ON t.service_id = sd.service_id GROUP BY sd.date ORDER BY COUNT(*) DESC LIMIT 1')->fetchColumn();
        $pdo->prepare('UPDATE stations SET daily = (SELECT COUNT(*) FROM stop_times st JOIN trips t ON t.trip_id = st.trip_id JOIN service_dates sd ON sd.service_id = t.service_id AND sd.date = ? WHERE st.station_id = stations.id)')->execute([$busiest]);
        $lines = [];
        $kwLines = $pdo->prepare('SELECT DISTINCT st.station_id, r.short_name FROM stop_times st JOIN trips t ON t.trip_id = st.trip_id JOIN routes r ON r.route_id = t.route_id WHERE r.type = 2 AND t.agency = ? ORDER BY r.short_name');
        $kwLines->execute([$agency]);
        foreach ($kwLines->fetchAll(PDO::FETCH_NUM) as [$stationId, $line]) {
            $lines[$stationId][] = $line;
        }
        $updLines = $pdo->prepare('UPDATE stations SET lines = ? WHERE id = ?');
        foreach ($lines as $stationId => $list) {
            $updLines->execute([implode(',', $list), $stationId]);
        }

        $stats = [
            'feedVersion' => $feed['feed_version'] ?? '',
            'validFrom' => Clock::isoDate((int) ($range[0] ?? 0)),
            'validUntil' => Clock::isoDate((int) ($range[1] ?? 0)),
            'importedAt' => Clock::now()->format(DATE_ATOM),
            'schema' => self::SCHEMA,
            'agency' => $agency,
            'routes' => (int) $pdo->query('SELECT COUNT(*) FROM routes')->fetchColumn(),
            'trips' => (int) $pdo->query('SELECT COUNT(*) FROM trips WHERE agency = ' . $pdo->quote($agency))->fetchColumn(),
            'partnerTrips' => (int) $pdo->query('SELECT COUNT(*) FROM trips WHERE agency <> ' . $pdo->quote($agency))->fetchColumn(),
            'stopTimes' => (int) $pdo->query('SELECT COUNT(*) FROM stop_times')->fetchColumn(),
            'stations' => (int) $pdo->query('SELECT COUNT(*) FROM stations WHERE kw = 1')->fetchColumn(),
            'shapes' => (int) $pdo->query('SELECT COUNT(*) FROM shapes')->fetchColumn(),
            'attribution' => $attribution,
            'source' => Config::get('gtfs_url'),
        ];
        $insMeta = $pdo->prepare('INSERT INTO meta VALUES (?,?)');
        foreach ($stats as $key => $value) {
            $insMeta->execute([$key, is_array($value) ? json_encode($value, JSON_UNESCAPED_UNICODE) : (string) $value]);
        }
        $pdo->exec('ANALYZE');
        $pdo = null;

        return $stats;
    }

    /** @param array<string, mixed> $stats */
    private function validate(array $stats): void
    {
        $today = Clock::isoDate(Clock::today());
        if ($stats['trips'] < 100 || $stats['stations'] < 50 || $stats['stopTimes'] < 2000) {
            throw new RuntimeException('Nowy rozkład wygląda na niekompletny, pozostawiono poprzedni.');
        }
        if ($stats['validUntil'] < $today) {
            throw new RuntimeException('Nowy rozkład jest już nieaktualny (do ' . $stats['validUntil'] . '), pozostawiono poprzedni.');
        }
    }

    private function swap(string $tmp, string $target): void
    {
        if (@rename($tmp, $target)) {
            return;
        }
        // Windows nie nadpisuje otwartego pliku przez rename
        for ($i = 0; $i < 5; $i++) {
            @unlink($target);
            if (@rename($tmp, $target)) {
                return;
            }
            usleep(200_000);
        }
        throw new RuntimeException('Nie udało się podmienić pliku bazy rozkładu.');
    }

    /** „77610/1” → ['77610', '77611']; nazwa pociągu po numerze („77375 Sokół”) jest pomijana */
    public static function splitNumbers(string $value): array
    {
        $value = preg_match('/^\s*\d+(?:\s*\/\s*\d+)*/', $value, $m) === 1 ? $m[0] : $value;
        $parts = array_values(array_filter(array_map('trim', explode('/', $value)), static fn (string $p): bool => $p !== ''));
        if ($parts === []) {
            return [];
        }
        $base = $parts[0];
        $out = [$base];
        foreach (array_slice($parts, 1) as $part) {
            $out[] = strlen($part) < strlen($base) ? substr($base, 0, strlen($base) - strlen($part)) . $part : $part;
        }

        return array_values(array_unique($out));
    }

    /**
     * Douglas–Peucker na [lat, lon, dist].
     * @param array<int, array{0: float, 1: float, 2: float|null}> $pts
     * @return array<int, array{0: float, 1: float, 2: float|null}>
     */
    public static function simplify(array $pts, float $eps): array
    {
        $n = count($pts);
        if ($n < 3) {
            return $pts;
        }
        $keep = array_fill(0, $n, false);
        $keep[0] = $keep[$n - 1] = true;
        $stack = [[0, $n - 1]];
        while ($stack !== []) {
            [$a, $b] = array_pop($stack);
            $max = 0.0;
            $idx = -1;
            [$ax, $ay] = $pts[$a];
            [$bx, $by] = $pts[$b];
            $dx = $bx - $ax;
            $dy = $by - $ay;
            $len = $dx * $dx + $dy * $dy;
            for ($i = $a + 1; $i < $b; $i++) {
                [$px, $py] = $pts[$i];
                if ($len == 0.0) {
                    $d = hypot($px - $ax, $py - $ay);
                } else {
                    $t = max(0.0, min(1.0, (($px - $ax) * $dx + ($py - $ay) * $dy) / $len));
                    $d = hypot($px - ($ax + $t * $dx), $py - ($ay + $t * $dy));
                }
                if ($d > $max) {
                    $max = $d;
                    $idx = $i;
                }
            }
            if ($max > $eps && $idx > 0) {
                $keep[$idx] = true;
                $stack[] = [$a, $idx];
                $stack[] = [$idx, $b];
            }
        }
        $out = [];
        foreach ($pts as $i => $p) {
            if ($keep[$i]) {
                $out[] = $p;
            }
        }

        return $out;
    }
}
