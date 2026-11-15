<?php

declare(strict_types=1);

namespace KwInfo\Api;

use KwInfo\Clock;
use KwInfo\Config;
use KwInfo\Gtfs\ConnectionFinder;
use KwInfo\Gtfs\DayTimetable;
use KwInfo\Gtfs\DayTimetable as D;
use KwInfo\Gtfs\GtfsImporter;
use KwInfo\Gtfs\Timetable;
use KwInfo\Http\ApiException;
use KwInfo\Http\FileResponse;
use KwInfo\Http\RateLimit;
use KwInfo\Http\RawResponse;
use KwInfo\Http\Response;
use KwInfo\Live\Realtime;
use KwInfo\Notices\NoticeRepository;
use KwInfo\Stats\PunctualityRepository;
use KwInfo\Vehicles\KwVehicleTypes;
use KwInfo\Vehicles\VehicleRepository;

final class PublicApi
{
    private ?Timetable $tt = null;
    private ?Realtime $rt = null;
    private ?KwVehicleTypes $kinds = null;
    /** @var array<string, DayTimetable> */
    private array $days = [];
    /** @var array<string, array<string, mixed>> */
    private array $applied = [];

    private function tt(): Timetable
    {
        return $this->tt ??= new Timetable();
    }

    private function rt(): Realtime
    {
        return $this->rt ??= Realtime::fromStorage();
    }

    /** Dzień rozkładu z kursami POLREGIO i PKP Intercity (w Wielkopolsce) — wszędzie poza mapą (LiveBuilder bierze same KW). */
    private function day(int $date, bool $partners = true): DayTimetable
    {
        return $this->days[$date . ($partners ? 'p' : '')] ??= DayTimetable::load($this->tt(), $date, $partners);
    }

    public function stations(): Response
    {
        return new Response(array_values($this->tt()->stations()), maxAge: 3600);
    }

    public function station(array $p): Response
    {
        $station = $this->tt()->station($p['id']) ?? throw new ApiException('Nie znaleziono stacji.', 404);

        return new Response($station, maxAge: 3600);
    }

    /**
     * Tablica odjazdów lub przyjazdów: najbliższe 24 godziny od wybranej chwili (z ?date= bez godziny — ten dzień).
     * Kursy następnego dnia, których numer już jest na tablicy (np. ten sam codzienny pociąg), są pomijane.
     */
    public function board(array $p): Response
    {
        $station = $this->tt()->station($p['id']) ?? throw new ApiException('Nie znaleziono stacji.', 404);
        $mode = ($_GET['mode'] ?? 'dep') === 'arr' ? 'arr' : 'dep';
        $limit = max(1, min(40, (int) ($_GET['limit'] ?? 16)));
        $today = Clock::today();
        $nowSec = Clock::secondsSince($today);
        // dzień tablicy: domyślnie dziś od teraz; z ?date= od północy (albo od ?time=)
        $base = isset($_GET['date']) ? $this->dateParam((string) $_GET['date']) : $today;
        $from = $base === $today ? $nowSec - 60 : 0;
        if (isset($_GET['time']) && preg_match('/^(\d{2}):(\d{2})$/', (string) $_GET['time'], $m) === 1) {
            $from = (int) $m[1] * 3600 + (int) $m[2] * 60;
        }

        $until = $from + 86400;
        $rows = [];
        $seen = [];
        foreach ([[$base, 0], [Clock::addDays($base, 1), 86400]] as [$date, $shift]) {
            $day = $this->day($date);
            foreach ($day->byStation[$station['id']] ?? [] as [$key, $idx]) {
                $trip = $day->trips[$key];
                if ($shift !== 0 && $trip['serviceDate'] !== $date) {
                    continue; // nocny kurs z dnia $base, już ujęty wyżej
                }
                $stop = $trip['stops'][$idx];
                $last = count($trip['stops']) - 1;
                if ($mode === 'dep' ? ($idx === $last || $stop[D::PICKUP] === 1) : ($idx === 0 || $stop[D::DROPOFF] === 1)) {
                    continue;
                }
                $planned = $mode === 'dep' ? $stop[D::DEP] : $stop[D::ARR];
                if ($planned === null || $planned + $shift + 3600 < $from || $planned + $shift >= $until) {
                    continue;
                }
                $same = $trip['agency'] . ($trip['isBus'] ? ' ZKA ' : ' ') . $trip['number'];
                if ($shift !== 0 && isset($seen[$same])) {
                    continue;
                }
                $exp = $date === $today ? $this->applied($trip, $nowSec) : null;
                $expected = $exp ? ($mode === 'dep' ? $exp['stops'][$idx]['dep'] : $exp['stops'][$idx]['arr']) : null;
                if (($expected ?? $planned) + $shift < $from) {
                    continue;
                }
                $delay = $exp ? ($mode === 'dep' ? $exp['stops'][$idx]['depDelay'] : $exp['stops'][$idx]['arrDelay']) : null;
                $rest = $mode === 'dep' ? array_slice($trip['stops'], $idx + 1, -1) : array_slice($trip['stops'], 1, $idx - 1);
                $seen[$same] = true;
                $rows[] = [
                    'sort' => $planned + $shift,
                    'key' => $key,
                    'number' => $trip['number'],
                    'agency' => $trip['agency'],
                    'route' => $this->route($trip['routeId']),
                    'isBus' => $trip['isBus'],
                    'headsign' => $trip['headsign'],
                    'origin' => $this->origin($trip),
                    'destination' => $this->destination($trip),
                    'via' => $this->via($rest),
                    'scheduled' => Clock::iso($date, $planned),
                    'expected' => $delay !== null ? Clock::iso($date, $expected) : null,
                    'delay' => Realtime::minutes($delay),
                    'delaySource' => $delay !== null ? $exp['source'] : null,
                    'platform' => $stop[D::PLATFORM],
                    'track' => $stop[D::TRACK],
                    'cancelled' => $exp['cancelled'] ?? false,
                    'skipped' => $exp['stops'][$idx]['skipped'] ?? false,
                    'vehicleType' => $this->vehicleType($trip),
                ];
            }
            if (count($rows) >= $limit) {
                break;
            }
        }
        usort($rows, static fn (array $a, array $b): int => $a['sort'] <=> $b['sort']);
        $rows = array_map(static function (array $r): array {
            unset($r['sort']);
            return $r;
        }, array_slice($rows, 0, $limit));

        return new Response([
            'station' => ['id' => $station['id'], 'name' => $station['name']],
            'mode' => $mode,
            'generatedAt' => Clock::now()->format(DATE_ATOM),
            'rows' => $rows,
        ]);
    }

    /** Data RRRR-MM-DD z zapytania jako RRRRMMDD, w zakresie ważności rozkładu. */
    private function dateParam(string $value): int
    {
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            throw new ApiException('Podaj prawidłową datę.', 422);
        }
        $meta = $this->tt()->meta();
        if ($value < ($meta['validFrom'] ?? '') || $value > ($meta['validUntil'] ?? '')) {
            throw new ApiException('Rozkład obejmuje dni od ' . date('d.m', strtotime($meta['validFrom'])) . ' do ' . date('d.m.Y', strtotime($meta['validUntil'])) . '.', 422);
        }

        return (int) str_replace('-', '', $value);
    }

    public function connections(): Response
    {
        RateLimit::hit('search');
        $from = $this->tt()->station((string) ($_GET['from'] ?? '')) ?? throw new ApiException('Wybierz stację początkową z listy.', 422);
        $to = $this->tt()->station((string) ($_GET['to'] ?? '')) ?? throw new ApiException('Wybierz stację docelową z listy.', 422);
        if ($from['id'] === $to['id']) {
            throw new ApiException('Stacja początkowa i docelowa muszą się różnić.', 422);
        }
        $date = $this->dateParam((string) ($_GET['date'] ?? Clock::isoDate(Clock::today())));
        $timeStr = (string) ($_GET['time'] ?? Clock::now()->format('H:i'));
        if (preg_match('/^(\d{2}):(\d{2})$/', $timeStr, $tm) !== 1) {
            throw new ApiException('Podaj prawidłową godzinę.', 422);
        }
        $time = (int) $tm[1] * 3600 + (int) $tm[2] * 60;
        // okno wyszukiwania (12 h) sięga wieczorem następnego dnia, a przy „przyjeździe do” rano poprzedniego
        $arriveBy = ($_GET['arrive'] ?? '0') === '1';
        $day = $this->day($date, true)->withDay($this->day(Clock::addDays($date, $arriveBy ? -1 : 1), true));
        $isToday = $date === Clock::today();
        $nowSec = Clock::secondsSince($date);
        $rt = $this->rt();
        // opcje: ?transfers=0..2 (?direct=1 = 0), ?minTransfer=minuty (2–30), ?agencies=KW,PR,IC (pusto — wszyscy)
        $maxTransfers = ($_GET['direct'] ?? '0') === '1' ? 0 : max(0, min(2, (int) ($_GET['transfers'] ?? 2)));
        $minTransfer = max(2, min(30, (int) ($_GET['minTransfer'] ?? 3))) * 60;
        $agencies = array_values(array_filter(explode(',', strtoupper((string) ($_GET['agencies'] ?? '')))));
        $trips = $day->trips;
        $skip = static fn (string $key): bool => $rt->cancelled($key) || ($agencies !== [] && !in_array($trips[$key]['agency'], $agencies, true));
        $finder = new ConnectionFinder($day, minTransfer: $minTransfer, isCancelled: $skip);
        $found = $finder->find($from['id'], $to['id'], $time, max(1, min(10, (int) ($_GET['limit'] ?? 6))), $maxTransfers, $arriveBy);

        $vehicles = new VehicleRepository();
        $kwTicketAgencies = (array) Config::get('kw_ticket_agencies');
        $connections = [];
        foreach ($found as $c) {
            $legs = [];
            $km = 0.0;
            $kmApprox = false;
            foreach ($c['legs'] as $l) {
                $trip = $day->trips[$l['key']];
                $a = $trip['stops'][$l['from']];
                $b = $trip['stops'][$l['to']];
                $exp = $isToday ? $this->applied($trip, $nowSec) : null;
                $depDelay = $exp['stops'][$l['from']]['depDelay'] ?? null;
                $arrDelay = $exp['stops'][$l['to']]['arrDelay'] ?? null;
                $partner = $trip['agency'] !== $this->tt()->agency();
                [$legKm, $approx] = $this->distance($trip, $l['from'], $l['to']);
                $km += $legKm;
                $kmApprox = $kmApprox || $approx;
                $legs[] = [
                    'key' => $l['key'],
                    'number' => $trip['number'],
                    'agency' => $trip['agency'],
                    'route' => $this->route($trip['routeId']),
                    'isBus' => $trip['isBus'],
                    'headsign' => $trip['headsign'],
                    'from' => ['id' => $a[D::STATION], 'name' => $this->name($a[D::STATION])],
                    'to' => ['id' => $b[D::STATION], 'name' => $this->name($b[D::STATION])],
                    'departure' => Clock::iso($date, $a[D::DEP]),
                    'arrival' => Clock::iso($date, $b[D::ARR] ?? $b[D::DEP]),
                    'expectedDeparture' => $depDelay !== null ? Clock::iso($date, $exp['stops'][$l['from']]['dep']) : null,
                    'expectedArrival' => $arrDelay !== null ? Clock::iso($date, $exp['stops'][$l['to']]['arr']) : null,
                    'departureDelay' => Realtime::minutes($depDelay),
                    'arrivalDelay' => Realtime::minutes($arrDelay),
                    'platform' => $a[D::PLATFORM],
                    'track' => $a[D::TRACK],
                    'arrivalPlatform' => $b[D::PLATFORM],
                    'stopsBetween' => $l['to'] - $l['from'] - 1,
                    'distanceKm' => (int) round($legKm),
                    'stops' => $this->legStops($trip, $l['from'], $l['to'], $date, $exp),
                    'vehicle' => $trip['isBus'] || $partner ? null : $vehicles->forNumbers($trip['numbers'] ?: [$trip['number']]),
                    'vehicleType' => $this->vehicleType($trip),
                    // bilety KW są honorowane w POLREGIO na odcinkach wspólnych z KW: każda stacja odcinka obsługiwana też przez KW;
                    // w PKP Intercity nigdy
                    'kwTickets' => !$partner || (in_array($trip['agency'], $kwTicketAgencies, true) && $this->kwSection($trip, $l['from'], $l['to'])),
                ];
            }
            $connections[] = [
                'departure' => Clock::iso($date, $c['dep']),
                'arrival' => Clock::iso($date, $c['arr']),
                'durationMinutes' => intdiv($c['arr'] - $c['dep'], 60),
                'transfers' => count($c['legs']) - 1,
                // kilometry po torach z rozkładu; approx — w połączeniu jest autobus zastępczy (odległość w linii prostej)
                'distanceKm' => (int) round($km),
                'distanceApprox' => $kmApprox,
                'waits' => array_map(static fn (int $w): int => intdiv($w, 60), $c['waits']),
                'via' => array_map(fn (string $id): array => ['id' => $id, 'name' => $this->name($id)], $c['via']),
                'legs' => $legs,
            ];
        }

        return new Response([
            'from' => ['id' => $from['id'], 'name' => $from['name']],
            'to' => ['id' => $to['id'], 'name' => $to['name']],
            'date' => Clock::isoDate($date),
            'time' => $timeStr,
            'arriveBy' => $arriveBy,
            'connections' => $connections,
        ]);
    }

    /** Kurs po numerze pociągu: bieżący, a gdy nie jedzie — najbliższy. */
    public function trainByNumber(array $p): Response
    {
        $number = self::trainQuery($p['number']) ?? throw new ApiException('Podaj prawidłowy numer pociągu.', 422);
        $runs = $this->runsForNumbers($this->tt()->tripIdsForNumber($number));
        if ($runs === []) {
            throw new ApiException('Pociąg ' . $number . ' nie kursuje dziś ani jutro według rozkładu.', 404);
        }

        return $this->trip(['key' => array_key_first($runs)]);
    }

    /**
     * Wyszukiwanie pociągów po numerze (pełnym albo początku, np. „776”, „KW 77600”, „77610/1”):
     * dla każdego pociągu bieżący albo najbliższy kurs dziś lub jutro, najpierw pełne dopasowanie.
     */
    public function searchTrains(): Response
    {
        RateLimit::hit('search');
        $query = self::trainQuery((string) ($_GET['q'] ?? '')) ?? throw new ApiException('Podaj numer pociągu, np. 77600.', 422);
        $runs = $this->runsForNumbers($this->tt()->tripIdsForNumberPrefix($query));
        $today = Clock::today();
        $trains = [];
        $labels = [];
        foreach ($runs as $key => $score) {
            $date = (int) substr($key, -8);
            $trip = $this->day($date)->trips[$key];
            $numbers = $trip['numbers'] ?: GtfsImporter::splitNumbers($trip['number']);
            $label = implode('/', $numbers);
            if (isset($labels[$label])) {
                continue; // ten sam pociąg innego dnia — zostaje bieżący albo najbliższy kurs
            }
            $labels[$label] = true;
            $first = $trip['stops'][0];
            $last = end($trip['stops']);
            $trains[] = [
                'key' => $key,
                'number' => $trip['number'],
                'agency' => $trip['agency'],
                'exact' => in_array($query, $numbers, true),
                'route' => $this->route($trip['routeId']),
                'origin' => $this->origin($trip),
                'destination' => $this->destination($trip),
                'departure' => Clock::iso($date, $first[D::DEP]),
                'arrival' => Clock::iso($date, $last[D::ARR] ?? $last[D::DEP]),
                'running' => $score === 0 && Clock::at($date, (int) $first[D::DEP])->getTimestamp() <= time()
                    && time() <= Clock::at($date, (int) ($last[D::ARR] ?? $last[D::DEP]))->getTimestamp(),
            ];
        }
        // stabilne: pełne dopasowanie na górze, dalej kolejność z runsForNumbers (w drodze, najbliższe)
        usort($trains, static fn (array $a, array $b): int => $b['exact'] <=> $a['exact']);

        return new Response(['query' => $query, 'trains' => array_slice($trains, 0, 8)]);
    }

    /** „KW 77600”, „PR 85724”, „TLK 45102”, „77610/1” → „77600”, „85724”, „45102”, „77610”; null — to nie numer pociągu. */
    public static function trainQuery(string $value): ?string
    {
        if (preg_match('/^\s*(?:(?:kw|km[lł]|pr|ic|tlk|eic|eip|ec|en)\s*)?(\d{3,6})(?:\s*\/\s*\d{1,3})?(?:\s+\pL[\pL\s]*)?\s*$/iu', $value, $m) !== 1) {
            return null;
        }

        return $m[1];
    }

    /**
     * Kursy KW i partnerów (bez odcinków autobusowych) spośród podanych trip_id dziś i jutro, od najlepszego:
     * 0 — w drodze teraz (±30 min), potem najbliższy odjazd, na końcu już zakończone.
     * @param array<int, string> $tripIds @return array<string, int> klucz kursu => wynik
     */
    private function runsForNumbers(array $tripIds): array
    {
        $ids = array_flip($tripIds);
        $today = Clock::today();
        $nowSec = Clock::secondsSince($today);
        $scores = [];
        foreach ([$today, Clock::addDays($today, 1)] as $n => $date) {
            foreach ($this->day($date)->trips as $key => $trip) {
                if (!isset($ids[$trip['tripId']]) || $trip['isBus'] || $trip['serviceDate'] !== $date) {
                    continue;
                }
                $first = $trip['stops'][0][D::DEP] + $n * 86400;
                $last = (end($trip['stops'])[D::ARR]) + $n * 86400;
                $scores[$key] = $nowSec >= $first - 1800 && $nowSec <= $last + 1800 ? 0 : ($first > $nowSec ? $first - $nowSec : 100000 + $nowSec - $last);
            }
        }
        asort($scores);

        return $scores;
    }

    public function trip(array $p): Response
    {
        if (preg_match('/^(.+)@(\d{8})$/', $p['key'], $m) !== 1) {
            throw new ApiException('Nieprawidłowy identyfikator kursu.', 422);
        }
        $date = (int) $m[2];
        $day = $this->day($date);
        $trip = $day->trips[$p['key']] ?? throw new ApiException('Ten kurs nie jedzie w wybranym dniu.', 404);
        // kurs POLREGIO / PKP Intercity: bez komunikatów (dotyczą KW) i pojazdu; postoje tylko w Wielkopolsce
        $partner = $trip['agency'] !== $this->tt()->agency();
        $nowSec = Clock::secondsSince($date);
        $exp = $this->applied($trip, $nowSec);
        $live = null;
        foreach (Realtime::readJson(Config::path('live_file'))['trains'] ?? [] as $train) {
            if (($train['key'] ?? null) === $p['key']) {
                $live = $train;
                break;
            }
        }
        $stops = [];
        $startKm = $trip['stops'][0][D::DIST];
        foreach ($trip['stops'] as $i => $s) {
            $station = $this->tt()->station($s[D::STATION]);
            $e = $exp['stops'][$i];
            $stops[] = [
                'seq' => $s[D::SEQ],
                'station' => ['id' => $s[D::STATION], 'name' => $station['name'] ?? $s[D::STATION], 'lat' => $station['lat'] ?? null, 'lon' => $station['lon'] ?? null],
                'arrival' => $i === 0 ? null : Clock::iso($date, $s[D::ARR]),
                'departure' => $i === count($trip['stops']) - 1 ? null : Clock::iso($date, $s[D::DEP]),
                'expectedArrival' => $i > 0 && $e['arrDelay'] !== null ? Clock::iso($date, $e['arr']) : null,
                'expectedDeparture' => $i < count($trip['stops']) - 1 && $e['depDelay'] !== null ? Clock::iso($date, $e['dep']) : null,
                'arrivalDelay' => Realtime::minutes($e['arrDelay']),
                'departureDelay' => Realtime::minutes($e['depDelay']),
                'platform' => $s[D::PLATFORM],
                'track' => $s[D::TRACK],
                'skipped' => $e['skipped'],
                'requestOnly' => $s[D::PICKUP] === 3 || $s[D::DROPOFF] === 3,
                // km od pierwszej pokazanej stacji (z rozkładu; autobus zastępczy — brak)
                'km' => $startKm !== null && $s[D::DIST] !== null ? round($s[D::DIST] - $startKm, 1) : null,
            ];
        }
        $legs = [];
        foreach ($this->tt()->blockTrips($trip['block']) as $tripId) {
            $key = $tripId . '@' . $trip['serviceDate'];
            if ($key !== $p['key'] && isset($day->trips[$key])) {
                $other = $day->trips[$key];
                $legs[] = ['key' => $key, 'number' => $other['number'], 'isBus' => $other['isBus'],
                    'from' => $this->name($other['stops'][0][D::STATION]), 'to' => $this->name(end($other['stops'])[D::STATION])];
            }
        }
        // pociągi z listy albo stacje na trasie (linie ze schematu dopasowuje przeglądarka — schemat jest tylko w web/)
        $stationIds = array_map(static fn (array $s): string => (string) $s['station']['id'], $stops);
        $notices = $partner ? [] : array_values(array_filter(
            (new NoticeRepository())->published(),
            static fn (array $n): bool => array_intersect($n['trains'], $trip['numbers'] ?: [$trip['number']]) !== []
                || array_intersect($n['stations'], $stationIds) !== []
        ));

        return new Response([
            'key' => $p['key'],
            'tripId' => $trip['tripId'],
            'serviceDate' => Clock::isoDate($trip['serviceDate']),
            'agency' => $trip['agency'],
            'number' => $trip['number'],
            'numbers' => $trip['numbers'],
            'name' => $trip['name'],
            'category' => $trip['category'],
            'isBus' => $trip['isBus'],
            'headsign' => $trip['headsign'],
            'route' => $this->route($trip['routeId']),
            'origin' => $this->origin($trip),
            'destination' => $this->destination($trip),
            // kurs partnera jedzie dalej poza Wielkopolskę — pokazujemy tylko tutejsze stacje
            'distanceKm' => end($stops)['km'] !== null ? (int) round(end($stops)['km']) : null,
            'trimmed' => $partner && ($this->origin($trip) !== $stops[0]['station']['name'] || $this->destination($trip) !== end($stops)['station']['name']),
            'stops' => $stops,
            'shape' => array_map(static fn (array $pt): array => [$pt[0], $pt[1]], $this->tt()->shape($trip['shapeId'])),
            'realtime' => ['source' => $exp['source'], 'delay' => Realtime::minutes($exp['delay']), 'cancelled' => $exp['cancelled']],
            'position' => $live,
            'otherLegs' => $legs,
            'notices' => array_map(static fn (array $n): int => $n['id'], $notices),
            'vehicle' => $trip['isBus'] || $partner ? null : (new VehicleRepository())->forNumbers($trip['numbers'] ?: [$trip['number']]),
            'vehicleType' => $this->vehicleType($trip),
        ]);
    }

    /** Rysunek pojazdu z vagonWEB (zapisany przez bin/fetch-vehicles.php). */
    public function vehicleImage(array $p): FileResponse
    {
        $path = VehicleRepository::imagePath($p['file']) ?? throw new ApiException('Nie znaleziono rysunku.', 404);

        return new FileResponse($path, str_ends_with($path, '.png') ? 'image/png' : 'image/gif', 7 * 86400);
    }

    /** Sieć linii KW (i przyciętych do Wielkopolski linii partnerów) jako GeoJSON do mapy (cache na dysku). */
    public function network(): Response
    {
        $file = Config::path('cache_dir') . '/network-' . $this->tt()->version() . '.json';
        if (is_file($file)) {
            return new Response(json_decode((string) file_get_contents($file), true), maxAge: 86400);
        }
        $features = [];
        $seen = [];
        foreach ($this->tt()->shapeRoutes() as $row) {
            $points = GtfsImporter::simplify($this->tt()->shape($row['shape_id']), 0.00025);
            $coords = array_map(static fn (array $p): array => [round($p[1], 5), round($p[0], 5)], $points);
            $sig = md5(json_encode($coords));
            if (isset($seen[$sig]) || count($coords) < 2) {
                continue;
            }
            $seen[$sig] = true;
            $route = $this->route($row['route_id']);
            $features[] = [
                'type' => 'Feature',
                // partner — linia tylko POLREGIO / PKP Intercity (na mapie cieńsza)
                'properties' => ['route' => $route['short'] ?? '', 'color' => $route['color'] ?? '#B3122D', 'bus' => ($route['type'] ?? 2) === 3, 'partner' => $row['kw'] === 0],
                'geometry' => ['type' => 'LineString', 'coordinates' => $coords],
            ];
        }
        $data = ['type' => 'FeatureCollection', 'features' => $features];
        if (!is_dir(dirname($file))) {
            @mkdir(dirname($file), 0775, true);
        }
        @file_put_contents($file, json_encode($data));

        return new Response($data, maxAge: 86400);
    }

    public function live(): Response
    {
        $data = Realtime::readJson(Config::path('live_file'));
        $data['ageSeconds'] = isset($data['generatedAt']) ? max(0, time() - strtotime((string) $data['generatedAt'])) : null;
        $data['trains'] ??= [];
        unset($data['delays']);

        return new Response($data);
    }

    public function status(): Response
    {
        return new Response(StatusService::build());
    }

    /** Punktualność pociągu (GET /punctuality?number=77610/1&agency=KW&days=30&onTime=5 — okres 7/30/90 dni, na czas do 3/5/10 min). */
    public function punctuality(): Response
    {
        $number = trim((string) ($_GET['number'] ?? ''));
        $agency = (string) ($_GET['agency'] ?? $this->tt()->agency());
        if (preg_match('/^\d{3,6}(\/\d{1,6})*$/', $number) !== 1 || preg_match('/^[A-Z]{2,4}$/', $agency) !== 1) {
            throw new ApiException('Podaj numer pociągu, np. 77600.', 422);
        }

        $days = (int) ($_GET['days'] ?? 30);
        $days = in_array($days, PunctualityRepository::PERIODS, true) ? $days : 30;
        $onTime = (int) ($_GET['onTime'] ?? PunctualityRepository::ON_TIME_MINUTES);
        $onTime = in_array($onTime, PunctualityRepository::THRESHOLDS, true) ? $onTime : PunctualityRepository::ON_TIME_MINUTES;

        return new Response((new PunctualityRepository())->summary($number, $agency, $days, $onTime), maxAge: 900);
    }

    public function notices(): Response
    {
        return new Response((new NoticeRepository())->published());
    }

    /** Mapa strony dla wyszukiwarek: strony stałe, tablice odjazdów wszystkich stacji (w każdym regionie), opublikowane komunikaty. */
    public function sitemap(): RawResponse
    {
        $base = rtrim((string) Config::get('site_url'), '/');
        $urls = array_map(static fn (string $path): array => [$path, null], ['/', '/mapa', '/schemat', '/komunikaty', '/bus-tramwaj-kolej', '/o-nas']);
        foreach ($this->tt()->stations() as $station) {
            $urls[] = ['/odjazdy/' . rawurlencode((string) $station['id']), null];
        }
        foreach ((new NoticeRepository())->published() as $notice) {
            $urls[] = ['/komunikaty/' . $notice['id'], substr((string) $notice['updatedAt'], 0, 10)];
        }
        // pozostałe regiony (/malopolska…): start, mapa i tablice stacji — o ile mają już zaimportowany rozkład
        $current = Config::region();
        foreach (Config::regions() as $region) {
            if ($region === Config::DEFAULT_REGION) {
                continue;
            }
            Config::useRegion($region);
            $prefix = (string) Config::get('site_path');
            if (is_file(Config::path('gtfs_db'))) {
                $urls[] = [$prefix, null];
                $urls[] = [$prefix . '/mapa', null];
                foreach ((new Timetable())->stations() as $station) {
                    $urls[] = [$prefix . '/odjazdy/' . rawurlencode((string) $station['id']), null];
                }
            }
        }
        Config::useRegion($current);
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
        foreach ($urls as [$path, $modified]) {
            $xml .= '  <url><loc>' . htmlspecialchars($base . $path, ENT_XML1) . '</loc>' . ($modified ? '<lastmod>' . $modified . '</lastmod>' : '') . "</url>\n";
        }

        return new RawResponse($xml . "</urlset>\n", 'application/xml; charset=utf-8', 3600);
    }

    /** @param array<string, mixed> $trip @return array<string, mixed> */
    private function applied(array $trip, int $nowSec): array
    {
        return $this->applied[$trip['key']] ??= $this->rt()->apply($trip, $nowSec);
    }

    /**
     * Stacje pośrednie odcinka (bez początkowej i końcowej) z godziną odjazdu.
     * @param array<string, mixed> $trip @param array<string, mixed>|null $exp @return array<int, array<string, mixed>>
     */
    private function legStops(array $trip, int $from, int $to, int $date, ?array $exp): array
    {
        $stops = [];
        for ($i = $from + 1; $i < $to; $i++) {
            $s = $trip['stops'][$i];
            $e = $exp['stops'][$i] ?? null;
            $delay = $e['depDelay'] ?? null;
            $stops[] = [
                'id' => $s[D::STATION],
                'name' => $this->name($s[D::STATION]),
                'departure' => Clock::iso($date, $s[D::DEP]),
                'expectedDeparture' => $delay !== null ? Clock::iso($date, $e['dep']) : null,
                'delay' => Realtime::minutes($delay),
                'skipped' => $e['skipped'] ?? false,
                'requestOnly' => $s[D::PICKUP] === 3 || $s[D::DROPOFF] === 3,
            ];
        }
        return $stops;
    }

    /** Stacja początkowa kursu (dla POLREGIO prawdziwa, sprzed obcięcia do Wielkopolski). @param array<string, mixed> $trip */
    private function origin(array $trip): string
    {
        return $trip['originName'] ?? $this->name($trip['stops'][0][D::STATION]);
    }

    /** @param array<string, mixed> $trip */
    private function destination(array $trip): string
    {
        return $trip['destinationName'] ?? $this->name(end($trip['stops'])[D::STATION]);
    }

    /**
     * Długość odcinka w km: z kilometrażu rozkładu (shape_dist_traveled), a gdy go brak (autobus zastępczy) —
     * suma odległości w linii prostej między kolejnymi przystankami.
     * @param array<string, mixed> $trip @return array{0: float, 1: bool} [km, przybliżona]
     */
    private function distance(array $trip, int $from, int $to): array
    {
        $a = $trip['stops'][$from][D::DIST];
        $b = $trip['stops'][$to][D::DIST];
        if ($a !== null && $b !== null && $b >= $a) {
            return [$b - $a, false];
        }
        $km = 0.0;
        for ($i = $from; $i < $to; $i++) {
            $p = $this->tt()->station($trip['stops'][$i][D::STATION]);
            $q = $this->tt()->station($trip['stops'][$i + 1][D::STATION]);
            if ($p !== null && $q !== null) {
                $km += self::haversine($p['lat'], $p['lon'], $q['lat'], $q['lon']);
            }
        }

        return [$km, true];
    }

    private static function haversine(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $h = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;

        return 2 * 6371.0 * asin(min(1.0, sqrt($h)));
    }

    /** Czy wszystkie stacje odcinka obsługuje też KW (odcinek wspólny — bilety KW honorowane). @param array<string, mixed> $trip */
    private function kwSection(array $trip, int $from, int $to): bool
    {
        for ($i = $from; $i <= $to; $i++) {
            if (!($this->tt()->station($trip['stops'][$i][D::STATION])['kw'] ?? false)) {
                return false;
            }
        }

        return true;
    }

    /** @return array<string, mixed>|null */
    /**
     * Rodzaj pojazdu i udogodnienia z rozkładu przewoźnika (KwVehicleTypes); autobus, partnerzy i regiony bez danych — null.
     * @param array<string, mixed> $trip @return array{kind: string, wheelchair: bool|null, bikes: bool|null}|null
     */
    private function vehicleType(array $trip): ?array
    {
        if ($trip['isBus'] || $trip['agency'] !== $this->tt()->agency()) {
            return null;
        }

        // godziny kursu z sąsiedniego dnia (wyszukiwarka) są przesunięte o dobę — liczymy od północy dnia kursowania
        $start = $trip['stops'][0][D::DEP] ?? null;

        return ($this->kinds ??= new KwVehicleTypes())->forTrip(
            $trip['numbers'] ?: [$trip['number']],
            (int) $trip['serviceDate'],
            $start !== null ? (int) $start - (int) ($trip['offset'] ?? 0) : null
        );
    }

    private function route(string $id): ?array
    {
        return $this->tt()->routes()[$id] ?? null;
    }

    private function name(string $stationId): string
    {
        return $this->tt()->station($stationId)['name'] ?? $stationId;
    }

    /** Do trzech największych stacji pośrednich. @param array<int, array<int, mixed>> $stops @return array<int, string> */
    private function via(array $stops): array
    {
        $candidates = [];
        foreach ($stops as $order => $s) {
            $station = $this->tt()->station($s[D::STATION]);
            if ($station !== null) {
                $candidates[] = [$station['daily'], $order, $station['name']];
            }
        }
        usort($candidates, static fn (array $a, array $b): int => $b[0] <=> $a[0]);
        $top = array_slice($candidates, 0, 3);
        usort($top, static fn (array $a, array $b): int => $a[1] <=> $b[1]);

        return array_map(static fn (array $c): string => $c[2], $top);
    }
}
