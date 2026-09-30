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
use KwInfo\Http\Response;
use KwInfo\Live\Realtime;
use KwInfo\Notices\NoticeRepository;

final class PublicApi
{
    private ?Timetable $tt = null;
    private ?Realtime $rt = null;
    /** @var array<int, DayTimetable> */
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

    private function day(int $date): DayTimetable
    {
        return $this->days[$date] ??= DayTimetable::load($this->tt(), $date);
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

    /** Tablica odjazdów lub przyjazdów. */
    public function board(array $p): Response
    {
        $station = $this->tt()->station($p['id']) ?? throw new ApiException('Nie znaleziono stacji.', 404);
        $mode = ($_GET['mode'] ?? 'dep') === 'arr' ? 'arr' : 'dep';
        $limit = max(1, min(40, (int) ($_GET['limit'] ?? 16)));
        $today = Clock::today();
        $nowSec = Clock::secondsSince($today);
        $from = $nowSec - 60;
        if (isset($_GET['time']) && preg_match('/^(\d{2}):(\d{2})$/', (string) $_GET['time'], $m) === 1) {
            $from = (int) $m[1] * 3600 + (int) $m[2] * 60;
        }

        $rows = [];
        foreach ([[$today, 0], [Clock::addDays($today, 1), 86400]] as [$date, $shift]) {
            $day = $this->day($date);
            foreach ($day->byStation[$station['id']] ?? [] as [$key, $idx]) {
                $trip = $day->trips[$key];
                $stop = $trip['stops'][$idx];
                $last = count($trip['stops']) - 1;
                if ($mode === 'dep' ? ($idx === $last || $stop[D::PICKUP] === 1) : ($idx === 0 || $stop[D::DROPOFF] === 1)) {
                    continue;
                }
                $planned = $mode === 'dep' ? $stop[D::DEP] : $stop[D::ARR];
                if ($planned === null || $planned + $shift + 3600 < $from) {
                    continue;
                }
                $exp = $date === $today ? $this->applied($trip, $nowSec) : null;
                $expected = $exp ? ($mode === 'dep' ? $exp['stops'][$idx]['dep'] : $exp['stops'][$idx]['arr']) : null;
                if (($expected ?? $planned) + $shift < $from) {
                    continue;
                }
                $delay = $exp ? ($mode === 'dep' ? $exp['stops'][$idx]['depDelay'] : $exp['stops'][$idx]['arrDelay']) : null;
                $rest = $mode === 'dep' ? array_slice($trip['stops'], $idx + 1, -1) : array_slice($trip['stops'], 1, $idx - 1);
                $rows[] = [
                    'sort' => $planned + $shift,
                    'key' => $key,
                    'number' => $trip['number'],
                    'route' => $this->route($trip['routeId']),
                    'isBus' => $trip['isBus'],
                    'headsign' => $trip['headsign'],
                    'origin' => $this->name($trip['stops'][0][D::STATION]),
                    'destination' => $this->name($trip['stops'][$last][D::STATION]),
                    'via' => $this->via($rest),
                    'scheduled' => Clock::iso($date, $planned),
                    'expected' => $delay !== null ? Clock::iso($date, $expected) : null,
                    'delay' => Realtime::minutes($delay),
                    'delaySource' => $delay !== null ? $exp['source'] : null,
                    'platform' => $stop[D::PLATFORM],
                    'track' => $stop[D::TRACK],
                    'cancelled' => $exp['cancelled'] ?? false,
                    'skipped' => $exp['stops'][$idx]['skipped'] ?? false,
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

    public function connections(): Response
    {
        $from = $this->tt()->station((string) ($_GET['from'] ?? '')) ?? throw new ApiException('Wybierz stację początkową z listy.', 422);
        $to = $this->tt()->station((string) ($_GET['to'] ?? '')) ?? throw new ApiException('Wybierz stację docelową z listy.', 422);
        if ($from['id'] === $to['id']) {
            throw new ApiException('Stacja początkowa i docelowa muszą się różnić.', 422);
        }
        $dateStr = (string) ($_GET['date'] ?? Clock::isoDate(Clock::today()));
        $timeStr = (string) ($_GET['time'] ?? Clock::now()->format('H:i'));
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateStr) !== 1 || preg_match('/^(\d{2}):(\d{2})$/', $timeStr, $tm) !== 1) {
            throw new ApiException('Podaj prawidłową datę i godzinę.', 422);
        }
        $date = (int) str_replace('-', '', $dateStr);
        $meta = $this->tt()->meta();
        if ($dateStr < ($meta['validFrom'] ?? '') || $dateStr > ($meta['validUntil'] ?? '')) {
            throw new ApiException('Rozkład obejmuje dni od ' . date('d.m', strtotime($meta['validFrom'])) . ' do ' . date('d.m.Y', strtotime($meta['validUntil'])) . '.', 422);
        }
        $time = (int) $tm[1] * 3600 + (int) $tm[2] * 60;
        $day = $this->day($date);
        $isToday = $date === Clock::today();
        $nowSec = Clock::secondsSince($date);
        $rt = $this->rt();
        $finder = new ConnectionFinder($day, isCancelled: static fn (string $key): bool => $rt->cancelled($key));
        $found = $finder->find($from['id'], $to['id'], $time, max(1, min(10, (int) ($_GET['limit'] ?? 6))), ($_GET['direct'] ?? '0') === '1');

        $connections = [];
        foreach ($found as $c) {
            $legs = [];
            foreach ($c['legs'] as $l) {
                $trip = $day->trips[$l['key']];
                $a = $trip['stops'][$l['from']];
                $b = $trip['stops'][$l['to']];
                $exp = $isToday ? $this->applied($trip, $nowSec) : null;
                $depDelay = $exp['stops'][$l['from']]['depDelay'] ?? null;
                $arrDelay = $exp['stops'][$l['to']]['arrDelay'] ?? null;
                $legs[] = [
                    'key' => $l['key'],
                    'number' => $trip['number'],
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
                ];
            }
            $connections[] = [
                'departure' => Clock::iso($date, $c['dep']),
                'arrival' => Clock::iso($date, $c['arr']),
                'durationMinutes' => intdiv($c['arr'] - $c['dep'], 60),
                'transfers' => count($c['legs']) - 1,
                'waits' => array_map(static fn (int $w): int => intdiv($w, 60), $c['waits']),
                'via' => array_map(fn (string $id): array => ['id' => $id, 'name' => $this->name($id)], $c['via']),
                'legs' => $legs,
            ];
        }

        return new Response([
            'from' => ['id' => $from['id'], 'name' => $from['name']],
            'to' => ['id' => $to['id'], 'name' => $to['name']],
            'date' => $dateStr,
            'time' => $timeStr,
            'connections' => $connections,
        ]);
    }

    /** Kurs po numerze pociągu: bieżący, a gdy nie jedzie — najbliższy. */
    public function trainByNumber(array $p): Response
    {
        $number = trim($p['number']);
        if (preg_match('/^\d{3,6}(\/\d{1,3})?$/', $number) !== 1) {
            throw new ApiException('Podaj prawidłowy numer pociągu.', 422);
        }
        $numbers = GtfsImporter::splitNumbers($number);
        $ids = array_flip($this->tt()->tripIdsForNumber($numbers[0]));
        $today = Clock::today();
        $nowSec = Clock::secondsSince($today);
        $best = null;
        $bestScore = PHP_INT_MAX;
        foreach ([$today, Clock::addDays($today, 1)] as $n => $date) {
            foreach ($this->day($date)->trips as $key => $trip) {
                if (!isset($ids[$trip['tripId']]) || $trip['isBus']) {
                    continue;
                }
                $first = $trip['stops'][0][D::DEP] + $n * 86400;
                $last = (end($trip['stops'])[D::ARR]) + $n * 86400;
                $score = $nowSec >= $first - 1800 && $nowSec <= $last + 1800 ? 0 : ($first > $nowSec ? $first - $nowSec : 100000 + $nowSec - $last);
                if ($score < $bestScore) {
                    $bestScore = $score;
                    $best = $key;
                }
            }
        }
        if ($best === null) {
            throw new ApiException('Pociąg KW ' . $number . ' nie kursuje dziś ani jutro według rozkładu.', 404);
        }

        return $this->trip(['key' => $best]);
    }

    public function trip(array $p): Response
    {
        if (preg_match('/^(.+)@(\d{8})$/', $p['key'], $m) !== 1) {
            throw new ApiException('Nieprawidłowy identyfikator kursu.', 422);
        }
        $date = (int) $m[2];
        $day = $this->day($date);
        $trip = $day->trips[$p['key']] ?? throw new ApiException('Ten kurs nie jedzie w wybranym dniu.', 404);
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
        $notices = array_values(array_filter(
            (new NoticeRepository())->published(),
            static fn (array $n): bool => array_intersect($n['trains'], $trip['numbers'] ?: [$trip['number']]) !== []
        ));

        return new Response([
            'key' => $p['key'],
            'tripId' => $trip['tripId'],
            'serviceDate' => Clock::isoDate($trip['serviceDate']),
            'number' => $trip['number'],
            'numbers' => $trip['numbers'],
            'name' => $trip['name'],
            'category' => $trip['category'],
            'isBus' => $trip['isBus'],
            'headsign' => $trip['headsign'],
            'route' => $this->route($trip['routeId']),
            'origin' => $stops[0]['station']['name'],
            'destination' => end($stops)['station']['name'],
            'stops' => $stops,
            'shape' => array_map(static fn (array $pt): array => [$pt[0], $pt[1]], $this->tt()->shape($trip['shapeId'])),
            'realtime' => ['source' => $exp['source'], 'delay' => Realtime::minutes($exp['delay']), 'cancelled' => $exp['cancelled']],
            'position' => $live,
            'otherLegs' => $legs,
            'notices' => array_map(static fn (array $n): int => $n['id'], $notices),
        ]);
    }

    /** Sieć linii KW jako GeoJSON do mapy (cache na dysku). */
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
                'properties' => ['route' => $route['short'] ?? '', 'color' => $route['color'] ?? '#B3122D', 'bus' => ($route['type'] ?? 2) === 3],
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

    public function notices(): Response
    {
        return new Response((new NoticeRepository())->published());
    }

    /** @param array<string, mixed> $trip @return array<string, mixed> */
    private function applied(array $trip, int $nowSec): array
    {
        return $this->applied[$trip['key']] ??= $this->rt()->apply($trip, $nowSec);
    }

    /** @return array<string, mixed>|null */
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
