<?php

declare(strict_types=1);

namespace KwInfo\Live;

use KwInfo\Clock;
use KwInfo\Config;
use KwInfo\Gtfs\DayTimetable;
use KwInfo\Gtfs\DayTimetable as D;
use KwInfo\Gtfs\GtfsImporter;
use KwInfo\Gtfs\PositionEstimator;
use KwInfo\Gtfs\Timetable;
use KwInfo\Net\HttpClient;
use KwInfo\Storage;
use Throwable;

/**
 * Buduje live.json (pozycje i opóźnienia pociągów) oraz rt.json (opóźnienia z GTFS-RT).
 * Uruchamiane z CRON-a co minutę; zapytania pasażerów tylko czytają te pliki.
 */
final class LiveBuilder
{
    private const BOUNDS = ['west' => 14.5, 'south' => 50.8, 'east' => 19.9, 'north' => 53.7];

    /** @var callable(string): void */
    private $log;
    /** @var array<string, array<string, mixed>|null> */
    private array $tripCache = [];

    public function __construct(private readonly Timetable $tt, ?callable $log = null)
    {
        $this->log = $log ?? static function (string $line): void {
        };
    }

    /** @return array<string, mixed> */
    public function run(): array
    {
        $now = Clock::now();
        $today = Clock::today();
        $nowSec = Clock::secondsSince($today, $now);
        $day = DayTimetable::load($this->tt, $today);

        [$rtTrips, $rtSource] = $this->refreshRt();
        [$gps, $gpsSource] = $this->fetchGps();
        $rtOnly = new Realtime($rtTrips, []);

        // kandydaci do dopasowania GPS: kursy w szerokim oknie czasowym
        $byNumber = [];
        foreach ($day->trips as $key => $trip) {
            $first = $trip['stops'][0][D::DEP];
            $lastStop = end($trip['stops']);
            $last = $lastStop[D::ARR] ?? $lastStop[D::DEP];
            if ($nowSec >= $first - 1800 && $nowSec <= $last + 5400) {
                foreach ($trip['numbers'] ?: [$trip['number']] as $number) {
                    $byNumber[$number][] = $key;
                }
            }
        }

        // dopasowanie pozycji GPS do kursów
        $matched = [];
        $unmatched = [];
        foreach ($gps as $train) {
            $candidates = [];
            foreach (GtfsImporter::splitNumbers($train->number) as $number) {
                foreach ($byNumber[$number] ?? [] as $key) {
                    $candidates[$key] = true;
                }
            }
            $best = null;
            $bestDistance = INF;
            foreach (array_keys($candidates) as $key) {
                if (isset($matched[$key]) || $rtOnly->cancelled($key)) {
                    continue;
                }
                $trip = $day->trips[$key];
                $delayed = new Realtime($rtTrips, [$key => $train->delay]);
                $pos = PositionEstimator::estimate($this->estimatorStops($trip, $delayed->apply($trip, $nowSec)), $nowSec, $this->tt->shape($trip['shapeId']));
                $distance = $pos ? PositionEstimator::distanceKm($pos['lat'], $pos['lon'], $train->lat, $train->lon) : 500.0;
                if ($distance < $bestDistance) {
                    $best = $key;
                    $bestDistance = $distance;
                }
            }
            if ($best !== null) {
                $matched[$best] = $train;
            } else {
                $unmatched[] = $train;
            }
        }

        $gpsDelays = [];
        foreach ($matched as $key => $train) {
            if (!isset($rtTrips[$key])) {
                $gpsDelays[$key] = $train->delay;
            }
        }
        $realtime = new Realtime($rtTrips, $gpsDelays);
        $routes = $this->tt->routes();
        $trains = [];
        foreach ($day->trips as $key => $trip) {
            $exp = $realtime->apply($trip, $nowSec);
            if ($exp['cancelled']) {
                continue;
            }
            $stops = $this->estimatorStops($trip, $exp);
            $gpsTrain = $matched[$key] ?? null;
            $pos = PositionEstimator::estimate($stops, $nowSec, $this->tt->shape($trip['shapeId']));
            if ($pos === null && $gpsTrain === null) {
                continue;
            }
            $useGps = $gpsTrain !== null && !$gpsTrain->stale();
            $prev = $pos['prev'] ?? 0;
            $next = $pos['next'] ?? count($trip['stops']) - 1;
            $nextStop = $trip['stops'][$next];
            $route = $routes[$trip['routeId']] ?? null;
            $trains[] = [
                'key' => $key,
                'tripId' => $trip['tripId'],
                'serviceDate' => Clock::isoDate($trip['serviceDate']),
                'number' => $trip['number'],
                'route' => $route ? ['id' => $route['id'], 'short' => $route['short'], 'color' => $route['color'], 'textColor' => $route['textColor']] : null,
                'isBus' => $trip['isBus'],
                'headsign' => $trip['headsign'],
                'origin' => $this->stationName($trip['stops'][0][D::STATION]),
                'destination' => $this->stationName($trip['stops'][count($trip['stops']) - 1][D::STATION]),
                'lat' => $useGps ? round($gpsTrain->lat, 6) : $pos['lat'],
                'lon' => $useGps ? round($gpsTrain->lon, 6) : $pos['lon'],
                'bearing' => $useGps && $gpsTrain->heading !== null ? $gpsTrain->heading : ($pos['bearing'] ?? null),
                'speed' => $useGps ? $gpsTrain->speed : ($pos['speed'] ?? null),
                'source' => $useGps ? 'gps' : 'est',
                'gpsProvider' => $useGps ? $gpsTrain->provider : null,
                'observedAt' => $useGps ? date(DATE_ATOM, $gpsTrain->observedAt) : null,
                'delay' => Realtime::minutes($exp['delay']),
                'delaySource' => $exp['source'],
                'dwelling' => $pos['dwelling'] ?? false,
                'prev' => ['seq' => $trip['stops'][$prev][D::SEQ], 'name' => $this->stationName($trip['stops'][$prev][D::STATION])],
                'next' => [
                    'seq' => $nextStop[D::SEQ],
                    'name' => $this->stationName($nextStop[D::STATION]),
                    'expected' => Clock::iso($today, $exp['stops'][$next]['arr'] ?? $exp['stops'][$next]['dep']),
                    'platform' => $nextStop[D::PLATFORM],
                ],
                'progress' => $pos['progress'] ?? 0,
            ];
        }
        foreach ($unmatched as $train) {
            $trains[] = [
                'key' => null, 'tripId' => null, 'serviceDate' => null, 'number' => $train->number, 'route' => null, 'isBus' => false,
                'headsign' => null, 'origin' => null, 'destination' => null,
                'lat' => round($train->lat, 6), 'lon' => round($train->lon, 6), 'bearing' => $train->heading, 'speed' => $train->speed,
                'source' => 'gps', 'gpsProvider' => $train->provider, 'observedAt' => date(DATE_ATOM, $train->observedAt),
                'delay' => $train->delay, 'delaySource' => 'gps', 'dwelling' => false, 'prev' => null, 'next' => null, 'progress' => 0,
            ];
        }
        usort($trains, static fn (array $a, array $b): int => strnatcmp((string) $a['number'], (string) $b['number']));

        $cancelledToday = 0;
        foreach ($rtTrips as $key => $trip) {
            if (!empty($trip['c']) && str_ends_with($key, '@' . $today)) {
                $cancelledToday++;
            }
        }
        $gpsSource['matched'] = count($matched);
        $live = [
            'generatedAt' => $now->format(DATE_ATOM),
            'sources' => ['gps' => $gpsSource, 'rt' => $rtSource + ['cancelledToday' => $cancelledToday]],
            'trains' => $trains,
            'delays' => $gpsDelays,
        ];
        Storage::writeJson(Config::path('live_file'), $live);
        ($this->log)(sprintf(
            'Pociągi: %d (GPS %d, estymowane %d, niedopasowane GPS %d) · GPS: %s · GTFS-RT: %s',
            count($trains),
            count(array_filter($trains, static fn (array $t): bool => $t['source'] === 'gps')),
            count(array_filter($trains, static fn (array $t): bool => $t['source'] === 'est')),
            count($unmatched),
            !$gpsSource['enabled'] ? 'wyłączony' : ($gpsSource['ok'] ? $gpsSource['provider'] . ' ' . $gpsSource['count'] : 'błąd (' . $gpsSource['error'] . ')'),
            $rtSource['ok'] ? $rtSource['count'] . ' kursów' . (!empty($rtSource['notModified']) ? ' (bez zmian)' : '') : 'błąd (' . $rtSource['error'] . ')'
        ));

        return $live;
    }

    /**
     * @param array<string, mixed> $trip
     * @param array<string, mixed> $exp
     * @return array<int, array{arr: int|null, dep: int|null, dist: float|null, lat: float|null, lon: float|null}>
     */
    public function estimatorStops(array $trip, array $exp): array
    {
        $out = [];
        foreach ($trip['stops'] as $i => $stop) {
            $station = $this->tt->station($stop[D::STATION]);
            $out[] = [
                'arr' => $exp['stops'][$i]['arr'],
                'dep' => $exp['stops'][$i]['dep'],
                'dist' => $stop[D::DIST],
                'lat' => $station['lat'] ?? null,
                'lon' => $station['lon'] ?? null,
            ];
        }

        return $out;
    }

    private function stationName(string $id): string
    {
        return $this->tt->station($id)['name'] ?? $id;
    }

    /** @return array{0: array<int, GpsTrain>, 1: array<string, mixed>} */
    private function fetchGps(): array
    {
        if (!Config::get('gps_enabled')) {
            return [[], ['enabled' => false, 'ok' => false, 'provider' => null, 'count' => 0, 'fetchedAt' => null, 'error' => null]];
        }
        $errors = [];
        foreach ([new BilkomMapClient(), new BackupGpsClient()] as $client) {
            try {
                $trains = $client->trains(self::BOUNDS);
                $provider = $client instanceof BilkomMapClient ? 'Mapa BILKOM' : BackupGpsClient::PROVIDER;
                if ($trains !== [] || $client instanceof BackupGpsClient) {
                    return [$trains, ['enabled' => true, 'ok' => true, 'provider' => $provider, 'count' => count($trains), 'fetchedAt' => Clock::now()->format(DATE_ATOM), 'error' => $errors ? implode('; ', $errors) : null]];
                }
                $errors[] = $provider . ': pusta lista';
            } catch (Throwable $e) {
                $errors[] = ($client instanceof BilkomMapClient ? 'BILKOM' : BackupGpsClient::PROVIDER) . ': ' . $e->getMessage();
            }
        }

        return [[], ['enabled' => true, 'ok' => false, 'provider' => null, 'count' => 0, 'fetchedAt' => null, 'error' => implode('; ', $errors)]];
    }

    /** @return array{0: array<string, array<string, mixed>>, 1: array<string, mixed>} */
    private function refreshRt(): array
    {
        $rtFile = Config::path('rt_file');
        $metaFile = Config::path('rt_meta_file');
        $existing = Realtime::readJson($rtFile);
        $meta = Realtime::readJson($metaFile);
        $source = static function (bool $ok, ?string $error = null, bool $notModified = false) use (&$existing): array {
            return [
            'ok' => $ok,
            'count' => count($existing['trips'] ?? []),
            'feedTime' => $existing['feedTime'] ?? null,
            'fetchedAt' => $existing['fetchedAt'] ?? null,
            'notModified' => $notModified,
            'error' => $error,
            ];
        };
        $feedFresh = isset($existing['feedTime']) && strtotime((string) $existing['feedTime']) > time() - 1800;
        if (time() - (int) ($meta['checkedAt'] ?? 0) < (int) Config::get('rt_min_interval')) {
            return [$feedFresh ? ($existing['trips'] ?? []) : [], $source($feedFresh, $feedFresh ? null : 'dane GTFS-RT są nieaktualne', true)];
        }
        $headers = [];
        if (!empty($meta['etag']) && $existing !== []) {
            $headers[] = 'If-None-Match: ' . $meta['etag'];
        }
        if (!empty($meta['lastModified']) && $existing !== []) {
            $headers[] = 'If-Modified-Since: ' . $meta['lastModified'];
        }
        try {
            $response = HttpClient::get((string) Config::get('gtfs_rt_url'), $headers, 30);
            $meta['checkedAt'] = time();
            if ($response['status'] === 304) {
                Storage::writeJson($metaFile, $meta);
                return [$feedFresh ? ($existing['trips'] ?? []) : [], $source($feedFresh, $feedFresh ? null : 'dane GTFS-RT są nieaktualne', true)];
            }
            if ($response['status'] !== 200) {
                throw new \RuntimeException('HTTP ' . $response['status']);
            }
            $decoded = GtfsRtDecoder::decode($response['body'], (string) Config::get('rt_trip_prefix'));
            $trips = $this->convertRt($decoded['trips']);
            $existing = [
                'fetchedAt' => Clock::now()->format(DATE_ATOM),
                'feedTime' => $decoded['timestamp'] ? date(DATE_ATOM, $decoded['timestamp']) : null,
                'trips' => $trips,
            ];
            Storage::writeJson($rtFile, $existing);
            $meta['etag'] = $response['headers']['etag'] ?? null;
            $meta['lastModified'] = $response['headers']['last-modified'] ?? null;
            Storage::writeJson($metaFile, $meta);
            $feedFresh = $existing['feedTime'] !== null && strtotime($existing['feedTime']) > time() - 1800;

            return [$feedFresh ? $trips : [], $source($feedFresh, $feedFresh ? null : 'dane GTFS-RT są nieaktualne')];
        } catch (Throwable $e) {
            $meta['checkedAt'] = time();
            Storage::writeJson($metaFile, $meta);
            return [$feedFresh ? ($existing['trips'] ?? []) : [], $source(false, $e->getMessage())];
        }
    }

    /**
     * Czasy absolutne z GTFS-RT → opóźnienia w sekundach względem rozkładu.
     * @param array<int, array<string, mixed>> $decoded
     * @return array<string, array<string, mixed>>
     */
    private function convertRt(array $decoded): array
    {
        $today = Clock::today();
        $allowed = [Clock::addDays($today, -1), $today, Clock::addDays($today, 1)];
        $out = [];
        foreach ($decoded as $rt) {
            $date = $rt['startDate'];
            if ($date === null || !in_array($date, $allowed, true)) {
                continue;
            }
            $trip = $this->tripCache[$rt['tripId']] ??= $this->tt->trip($rt['tripId']);
            if ($trip === null) {
                continue;
            }
            $bySeq = [];
            foreach ($trip['stops'] as $stop) {
                $bySeq[$stop[D::SEQ]] = $stop;
            }
            $stops = [];
            foreach ($rt['stops'] as $u) {
                $sched = $u['seq'] !== null ? ($bySeq[$u['seq']] ?? null) : null;
                if ($sched === null) {
                    continue;
                }
                $arr = $u['arrDelay'] ?? ($u['arrTime'] !== null && $sched[D::ARR] !== null ? $u['arrTime'] - Clock::at($date, $sched[D::ARR])->getTimestamp() : null);
                $dep = $u['depDelay'] ?? ($u['depTime'] !== null && $sched[D::DEP] !== null ? $u['depTime'] - Clock::at($date, $sched[D::DEP])->getTimestamp() : null);
                $stops[(string) $sched[D::SEQ]] = [$arr, $dep, $u['skipped'] ? 1 : 0];
            }
            $out[$rt['tripId'] . '@' . $date] = ['c' => $rt['cancelled'] ? 1 : 0, 's' => $stops];
        }

        return $out;
    }
}
