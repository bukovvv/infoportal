<?php

declare(strict_types=1);

namespace KwInfo;

use DateInterval;
use DateTimeImmutable;
use DateTimeZone;
use RuntimeException;

final class GtfsRepository
{
    /** @var array<string, mixed>|null */
    private ?array $feed = null;

    public function __construct(private readonly string $path)
    {
    }

    /** @return array<string, mixed> */
    public function route(string $trainNumber): array
    {
        $feed = $this->feed();
        $number = $this->normalizeNumber($trainNumber);
        $trips = $feed['trains'][$number] ?? [];

        if (!is_array($trips) || $trips === []) {
            throw new RuntimeException('Nie znaleziono pociągu w lokalnym rozkładzie KW.');
        }

        $timezone = new DateTimeZone('Europe/Warsaw');
        $now = new DateTimeImmutable('now', $timezone);
        $serviceDates = [$now->format('Ymd'), $now->sub(new DateInterval('P1D'))->format('Ymd')];
        $candidates = [];

        foreach ($trips as $trip) {
            if (!is_array($trip)) {
                continue;
            }
            foreach ($serviceDates as $serviceDate) {
                if (in_array($serviceDate, $trip['d'] ?? [], true)) {
                    $candidates[] = [
                        'trip' => $trip,
                        'serviceDate' => $serviceDate,
                        'score' => $this->tripScore($trip, $serviceDate, $now),
                    ];
                }
            }
        }

        if ($candidates === []) {
            throw new RuntimeException('Ten pociąg nie kursuje dzisiaj według lokalnego rozkładu.');
        }

        usort($candidates, static fn (array $left, array $right): int => $left['score'] <=> $right['score']);
        $selected = $candidates[0];
        $trip = $selected['trip'];
        $serviceDate = $selected['serviceDate'];
        $stops = [];

        foreach ($trip['s'] ?? [] as $stop) {
            if (!is_array($stop) || count($stop) < 6) {
                continue;
            }
            $stops[] = [
                'stationId' => (string) $stop[0],
                'name' => (string) $stop[1],
                'arrival' => $this->isoTime($serviceDate, $stop[2] ?? null)?->format(DATE_ATOM),
                'departure' => $this->isoTime($serviceDate, $stop[3] ?? null)?->format(DATE_ATOM),
                'platform' => $stop[4] ?? null,
                'track' => $stop[5] ?? null,
                'lat' => isset($stop[6]) ? (float) $stop[6] : null,
                'lon' => isset($stop[7]) ? (float) $stop[7] : null,
            ];
        }

        if ($stops === []) {
            throw new RuntimeException('Rozkład pociągu nie zawiera stacji.');
        }

        $path = [];
        $shapeId = $trip['p'] ?? null;
        if (is_string($shapeId) && isset($feed['shapes'][$shapeId]) && is_array($feed['shapes'][$shapeId])) {
            $path = $feed['shapes'][$shapeId];
        } else {
            foreach ($stops as $stop) {
                if ($stop['lat'] !== null && $stop['lon'] !== null) {
                    $path[] = [$stop['lat'], $stop['lon']];
                }
            }
        }

        return [
            'number' => $number,
            'name' => (string) ($trip['n'] ?? $number),
            'origin' => $stops[0]['name'],
            'destination' => $stops[array_key_last($stops)]['name'] ?? (string) ($trip['h'] ?? ''),
            'serviceDate' => substr($serviceDate, 0, 4) . '-' . substr($serviceDate, 4, 2) . '-' . substr($serviceDate, 6, 2),
            'stops' => $stops,
            'path' => $path,
            'source' => 'PKP PLK · GTFS Kierownik Plus',
            'feedValidUntil' => isset($feed['validUntil']) && preg_match('/^\d{8}$/', (string) $feed['validUntil']) === 1
                ? substr((string) $feed['validUntil'], 0, 4) . '-' . substr((string) $feed['validUntil'], 4, 2) . '-' . substr((string) $feed['validUntil'], 6, 2)
                : (string) ($feed['validUntil'] ?? ''),
            'attribution' => $feed['attribution'] ?? [],
        ];
    }

    /** @return array<int, array<string, float|int|string|null>> */
    public function stations(): array
    {
        $feed = $this->feed();
        $stations = [];

        foreach (($feed['trains'] ?? []) as $trips) {
            if (!is_array($trips)) {
                continue;
            }
            foreach ($trips as $trip) {
                foreach (($trip['s'] ?? []) as $stop) {
                    if (!is_array($stop) || count($stop) < 2) {
                        continue;
                    }
                    $id = (string) $stop[0];
                    if (!isset($stations[$id])) {
                        $stations[$id] = [
                            'id' => $id,
                            'name' => (string) $stop[1],
                            'lat' => isset($stop[6]) ? (float) $stop[6] : null,
                            'lon' => isset($stop[7]) ? (float) $stop[7] : null,
                            'services' => 0,
                        ];
                    }
                    $stations[$id]['services']++;
                }
            }
        }

        $result = array_values($stations);
        usort($result, static fn (array $left, array $right): int => strcoll((string) $left['name'], (string) $right['name']));

        return $result;
    }

    /** @return array{name: string, station: array<string, float|int|string|null>, departures: array<int, array<string, int|string|null>>} */
    public function station(string $stationId): array
    {
        $station = null;
        foreach ($this->stations() as $candidate) {
            if ($candidate['id'] === $stationId) {
                $station = $candidate;
                break;
            }
        }
        if ($station === null) {
            throw new RuntimeException('Nie znaleziono stacji.');
        }

        $feed = $this->feed();
        $date = (new DateTimeImmutable('now', new DateTimeZone('Europe/Warsaw')))->format('Ymd');
        $departures = [];

        foreach (($feed['trains'] ?? []) as $number => $trips) {
            foreach ($trips as $trip) {
                if (!in_array($date, $trip['d'] ?? [], true)) {
                    continue;
                }
                foreach (($trip['s'] ?? []) as $stop) {
                    if ((string) ($stop[0] ?? '') !== $stationId) {
                        continue;
                    }
                    $time = $stop[3] ?? $stop[2] ?? null;
                    if (!is_string($time)) {
                        continue;
                    }
                    $departures[] = [
                        'time' => substr($time, 0, 5),
                        'timestamp' => $this->isoTime($date, $time)?->getTimestamp() ?? 0,
                        'number' => (string) $number,
                        'destination' => (string) ($trip['h'] ?? ''),
                        'platform' => $stop[4] ?? null,
                        'track' => $stop[5] ?? null,
                    ];
                }
            }
        }

        usort($departures, static fn (array $left, array $right): int => $left['timestamp'] <=> $right['timestamp']);

        return ['name' => (string) $station['name'], 'station' => $station, 'departures' => $departures];
    }

    /** @return array{source: string, generatedAt: string, trains: array<int, array<string, bool|float|int|string|null>>, stats: array<string, int>} */
    public function estimatedPositions(): array
    {
        $feed = $this->feed();
        $timezone = new DateTimeZone('Europe/Warsaw');
        $now = new DateTimeImmutable('now', $timezone);
        $nowTimestamp = $now->getTimestamp();
        $dates = [
            ['key' => $now->format('Ymd')],
            ['key' => $now->sub(new DateInterval('P1D'))->format('Ymd')],
        ];
        $trains = [];

        foreach (($feed['trains'] ?? []) as $number => $trips) {
            if (!is_array($trips)) {
                continue;
            }
            foreach ($trips as $trip) {
                if (!is_array($trip)) {
                    continue;
                }
                foreach ($dates as $date) {
                    $serviceDate = $date['key'];
                    if (!in_array($serviceDate, $trip['d'] ?? [], true)) {
                        continue;
                    }

                    $timedStops = [];
                    foreach (($trip['s'] ?? []) as $stop) {
                        if (!is_array($stop) || count($stop) < 8) {
                            continue;
                        }
                        $timeValue = $stop[3] ?? $stop[2] ?? null;
                        $time = $this->isoTime($serviceDate, is_string($timeValue) ? $timeValue : null);
                        $lat = filter_var($stop[6] ?? null, FILTER_VALIDATE_FLOAT);
                        $lon = filter_var($stop[7] ?? null, FILTER_VALIDATE_FLOAT);
                        if ($time instanceof DateTimeImmutable && $lat !== false && $lon !== false) {
                            $timedStops[] = [
                                'stationId' => (string) $stop[0],
                                'name' => (string) $stop[1],
                                'lat' => (float) $lat,
                                'lon' => (float) $lon,
                                'time' => $time->getTimestamp(),
                            ];
                        }
                    }

                    if (count($timedStops) < 2) {
                        continue;
                    }
                    $firstTime = $timedStops[0]['time'];
                    $lastTime = $timedStops[array_key_last($timedStops)]['time'];
                    if ($nowTimestamp < $firstTime - 300 || $nowTimestamp > $lastTime + 300) {
                        continue;
                    }

                    $before = $timedStops[0];
                    $after = $timedStops[1];
                    for ($index = 1, $count = count($timedStops); $index < $count; $index++) {
                        $before = $timedStops[$index - 1];
                        $after = $timedStops[$index];
                        if ($after['time'] >= $nowTimestamp) {
                            break;
                        }
                    }
                    $duration = max(1, $after['time'] - $before['time']);
                    $progress = max(0.0, min(1.0, ($nowTimestamp - $before['time']) / $duration));
                    $destination = (string) ($trip['h'] ?? $timedStops[array_key_last($timedStops)]['name']);

                    $trains[] = [
                        'id' => 'estimated-' . $number,
                        'number' => (string) $number,
                        'carrier' => 'Koleje Wielkopolskie',
                        'lat' => $before['lat'] + ($after['lat'] - $before['lat']) * $progress,
                        'lon' => $before['lon'] + ($after['lon'] - $before['lon']) * $progress,
                        'speed' => null,
                        'heading' => null,
                        'delay' => 0,
                        'delayed' => false,
                        'observedAt' => $now->format(DATE_ATOM),
                        'ageSeconds' => 0,
                        'stale' => false,
                        'source' => 'estimated',
                        'estimated' => true,
                        'destination' => $destination,
                        'segmentFrom' => $before['name'],
                        'segmentTo' => $after['name'],
                        'progress' => round($progress, 4),
                    ];
                    continue 3;
                }
            }
        }

        usort($trains, static fn (array $left, array $right): int => strnatcasecmp((string) $left['number'], (string) $right['number']));

        return [
            'source' => 'GTFS · pozycje estymowane',
            'generatedAt' => $now->format(DATE_ATOM),
            'trains' => $trains,
            'stats' => ['total' => count($trains)],
        ];
    }

    /** @return array{station: array{id: string, name: string}, departures: array<int, array<string, int|string|null>>, source: string, feedValidUntil: string} */
    public function upcomingDepartures(string $stationId, int $limit = 10): array
    {
        $feed = $this->feed();
        $timezone = new DateTimeZone('Europe/Warsaw');
        $now = new DateTimeImmutable('now', $timezone);
        $serviceDates = [
            $now->sub(new DateInterval('P1D'))->format('Ymd'),
            $now->format('Ymd'),
            $now->add(new DateInterval('P1D'))->format('Ymd'),
        ];
        $departures = [];
        $stationName = null;

        foreach (($feed['trains'] ?? []) as $number => $trips) {
            foreach ($trips as $trip) {
                foreach ($serviceDates as $serviceDate) {
                    if (!in_array($serviceDate, $trip['d'] ?? [], true)) {
                        continue;
                    }
                    foreach (($trip['s'] ?? []) as $stop) {
                        if ((string) ($stop[0] ?? '') !== $stationId) {
                            continue;
                        }
                        $stationName = (string) ($stop[1] ?? $stationId);
                        $timeValue = $stop[3] ?? $stop[2] ?? null;
                        $departure = $this->isoTime($serviceDate, is_string($timeValue) ? $timeValue : null);
                        if (!$departure instanceof DateTimeImmutable || $departure->getTimestamp() < $now->getTimestamp() - 60) {
                            continue;
                        }
                        $departures[] = [
                            'time' => $departure->format('H:i'),
                            'scheduledAt' => $departure->format(DATE_ATOM),
                            'timestamp' => $departure->getTimestamp(),
                            'number' => (string) $number,
                            'destination' => (string) ($trip['h'] ?? ''),
                            'platform' => $stop[4] ?? null,
                            'track' => $stop[5] ?? null,
                        ];
                    }
                }
            }
        }

        if ($stationName === null) {
            throw new RuntimeException('Nie znaleziono stacji w rozkładzie KW.');
        }

        usort($departures, static fn (array $left, array $right): int => $left['timestamp'] <=> $right['timestamp']);

        return [
            'station' => ['id' => $stationId, 'name' => $stationName],
            'departures' => array_slice($departures, 0, max(1, min(30, $limit))),
            'source' => 'PKP PLK · GTFS Kierownik Plus',
            'feedValidUntil' => isset($feed['validUntil']) && preg_match('/^\d{8}$/', (string) $feed['validUntil']) === 1
                ? substr((string) $feed['validUntil'], 0, 4) . '-' . substr((string) $feed['validUntil'], 4, 2) . '-' . substr((string) $feed['validUntil'], 6, 2)
                : (string) ($feed['validUntil'] ?? ''),
        ];
    }

    /** @return array{from: array{id: string, name: string}, to: array{id: string, name: string}, requestedAt: string, connections: array<int, array<string, int|string|array>>, source: string} */
    public function connections(string $fromId, string $toId, string $date, string $time, int $limit = 8): array
    {
        if ($fromId === $toId) {
            throw new RuntimeException('Stacja początkowa i końcowa muszą być różne.');
        }

        $timezone = new DateTimeZone('Europe/Warsaw');
        $requested = DateTimeImmutable::createFromFormat('!Y-m-d H:i', $date . ' ' . $time, $timezone);
        if (!$requested instanceof DateTimeImmutable) {
            throw new RuntimeException('Podaj prawidłową datę i godzinę podróży.');
        }
        $serviceDate = $requested->format('Ymd');
        $requestedTimestamp = $requested->getTimestamp();
        $feed = $this->feed();
        $trips = [];
        $byStation = [];
        $stationNames = [];

        foreach (($feed['trains'] ?? []) as $number => $variants) {
            foreach ($variants as $variantIndex => $variant) {
                if (!in_array($serviceDate, $variant['d'] ?? [], true)) {
                    continue;
                }
                $stops = [];
                foreach (($variant['s'] ?? []) as $stop) {
                    if (!is_array($stop) || count($stop) < 2) {
                        continue;
                    }
                    $stationId = (string) $stop[0];
                    $stationNames[$stationId] = (string) $stop[1];
                    $arrival = $this->isoTime($serviceDate, is_string($stop[2] ?? null) ? $stop[2] : null);
                    $departure = $this->isoTime($serviceDate, is_string($stop[3] ?? null) ? $stop[3] : null);
                    $stops[] = [
                        'stationId' => $stationId,
                        'name' => (string) $stop[1],
                        'arrival' => $arrival,
                        'departure' => $departure,
                        'platform' => $stop[4] ?? null,
                        'track' => $stop[5] ?? null,
                    ];
                }
                if (count($stops) < 2) {
                    continue;
                }
                $tripIndex = count($trips);
                $trips[] = [
                    'key' => $number . '-' . $variantIndex,
                    'number' => (string) $number,
                    'headsign' => (string) ($variant['h'] ?? ''),
                    'stops' => $stops,
                ];
                foreach ($stops as $stopIndex => $stop) {
                    $byStation[$stop['stationId']][] = ['trip' => $tripIndex, 'stop' => $stopIndex];
                }
            }
        }

        if (!isset($stationNames[$fromId]) || !isset($stationNames[$toId])) {
            throw new RuntimeException('Wybrana stacja nie występuje w rozkładzie na ten dzień.');
        }

        $connections = [];
        $seen = [];
        $originOccurrences = $byStation[$fromId] ?? [];
        usort($originOccurrences, function (array $left, array $right) use ($trips): int {
            $leftStop = $trips[$left['trip']]['stops'][$left['stop']];
            $rightStop = $trips[$right['trip']]['stops'][$right['stop']];
            return $this->eventTimestamp($leftStop, 'departure') <=> $this->eventTimestamp($rightStop, 'departure');
        });

        foreach ($originOccurrences as $originOccurrence) {
            $firstTrip = $trips[$originOccurrence['trip']];
            $fromIndex = $originOccurrence['stop'];
            $fromStop = $firstTrip['stops'][$fromIndex];
            $firstDeparture = $this->eventTimestamp($fromStop, 'departure');
            if ($firstDeparture < $requestedTimestamp || $firstDeparture > $requestedTimestamp + 64800) {
                continue;
            }

            for ($index = $fromIndex + 1, $stopCount = count($firstTrip['stops']); $index < $stopCount; $index++) {
                $candidateStop = $firstTrip['stops'][$index];
                $arrivalTimestamp = $this->eventTimestamp($candidateStop, 'arrival');
                if ($arrivalTimestamp <= $firstDeparture) {
                    continue;
                }

                if ($candidateStop['stationId'] === $toId) {
                    $connection = $this->connectionResult([$this->leg($firstTrip, $fromStop, $candidateStop)], $firstDeparture, $arrivalTimestamp);
                    $key = $firstTrip['number'] . '-' . $firstDeparture . '-direct';
                    if (!isset($seen[$key])) {
                        $connections[] = $connection;
                        $seen[$key] = true;
                    }
                    break;
                }

                foreach (($byStation[$candidateStop['stationId']] ?? []) as $secondOccurrence) {
                    if ($secondOccurrence['trip'] === $originOccurrence['trip']) {
                        continue;
                    }
                    $secondTrip = $trips[$secondOccurrence['trip']];
                    $secondFromIndex = $secondOccurrence['stop'];
                    $secondFromStop = $secondTrip['stops'][$secondFromIndex];
                    $secondDeparture = $this->eventTimestamp($secondFromStop, 'departure');
                    $transferMinutes = intdiv($secondDeparture - $arrivalTimestamp, 60);
                    if ($transferMinutes < 3 || $transferMinutes > 120) {
                        continue;
                    }

                    for ($secondIndex = $secondFromIndex + 1, $secondCount = count($secondTrip['stops']); $secondIndex < $secondCount; $secondIndex++) {
                        $destinationStop = $secondTrip['stops'][$secondIndex];
                        if ($destinationStop['stationId'] !== $toId) {
                            continue;
                        }
                        $finalArrival = $this->eventTimestamp($destinationStop, 'arrival');
                        $key = $firstTrip['number'] . '-' . $secondTrip['number'] . '-' . $firstDeparture . '-' . $finalArrival;
                        if (!isset($seen[$key]) && $finalArrival > $secondDeparture) {
                            $connections[] = $this->connectionResult([
                                $this->leg($firstTrip, $fromStop, $candidateStop),
                                $this->leg($secondTrip, $secondFromStop, $destinationStop),
                            ], $firstDeparture, $finalArrival, $transferMinutes, $candidateStop['name']);
                            $seen[$key] = true;
                        }
                        break;
                    }
                }
            }
        }

        usort($connections, static function (array $left, array $right): int {
            return [$left['arrivalTimestamp'], $left['transfers'], $left['durationMinutes'], $left['departureTimestamp']]
                <=> [$right['arrivalTimestamp'], $right['transfers'], $right['durationMinutes'], $right['departureTimestamp']];
        });
        $usefulConnections = [];
        foreach ($connections as $candidate) {
            $dominated = false;
            foreach ($usefulConnections as $selected) {
                if ($selected['arrivalTimestamp'] <= $candidate['arrivalTimestamp']
                    && $selected['departureTimestamp'] >= $candidate['departureTimestamp']
                    && $selected['transfers'] <= $candidate['transfers']) {
                    $dominated = true;
                    break;
                }
            }
            if (!$dominated) {
                $usefulConnections[] = $candidate;
            }
        }

        return [
            'from' => ['id' => $fromId, 'name' => $stationNames[$fromId]],
            'to' => ['id' => $toId, 'name' => $stationNames[$toId]],
            'requestedAt' => $requested->format(DATE_ATOM),
            'connections' => array_slice($usefulConnections, 0, max(1, min(12, $limit))),
            'source' => 'PKP PLK · GTFS Kierownik Plus',
        ];
    }

    /** @param array<string, mixed> $stop */
    private function eventTimestamp(array $stop, string $preferred): int
    {
        $event = $stop[$preferred] ?? $stop[$preferred === 'arrival' ? 'departure' : 'arrival'] ?? null;
        return $event instanceof DateTimeImmutable ? $event->getTimestamp() : 0;
    }

    /** @param array<string, mixed> $trip @param array<string, mixed> $from @param array<string, mixed> $to @return array<string, int|string|null> */
    private function leg(array $trip, array $from, array $to): array
    {
        $departure = $from['departure'] ?? $from['arrival'];
        $arrival = $to['arrival'] ?? $to['departure'];
        return [
            'number' => $trip['number'],
            'headsign' => $trip['headsign'],
            'fromId' => $from['stationId'],
            'from' => $from['name'],
            'toId' => $to['stationId'],
            'to' => $to['name'],
            'departure' => $departure instanceof DateTimeImmutable ? $departure->format(DATE_ATOM) : null,
            'arrival' => $arrival instanceof DateTimeImmutable ? $arrival->format(DATE_ATOM) : null,
            'platform' => $from['platform'],
            'track' => $from['track'],
        ];
    }

    /** @param array<int, array<string, int|string|null>> $legs @return array<string, int|string|array> */
    private function connectionResult(array $legs, int $departure, int $arrival, int $transferMinutes = 0, string $transferStation = ''): array
    {
        $timezone = new DateTimeZone('Europe/Warsaw');
        $departureDate = (new DateTimeImmutable('@' . $departure))->setTimezone($timezone);
        $arrivalDate = (new DateTimeImmutable('@' . $arrival))->setTimezone($timezone);
        return [
            'departure' => $departureDate->format(DATE_ATOM),
            'arrival' => $arrivalDate->format(DATE_ATOM),
            'departureTimestamp' => $departure,
            'arrivalTimestamp' => $arrival,
            'durationMinutes' => max(0, intdiv($arrival - $departure, 60)),
            'transfers' => count($legs) - 1,
            'transferMinutes' => $transferMinutes,
            'transferStation' => $transferStation,
            'legs' => $legs,
        ];
    }

    /** @return array<string, mixed> */
    private function feed(): array
    {
        if ($this->feed !== null) {
            return $this->feed;
        }
        if (!is_file($this->path)) {
            throw new RuntimeException('Brak lokalnego rozkładu GTFS.');
        }

        $contents = file_get_contents($this->path);
        if (!is_string($contents)) {
            throw new RuntimeException('Nie udało się odczytać lokalnego rozkładu.');
        }

        $decoded = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($decoded)) {
            throw new RuntimeException('Nieprawidłowy format rozkładu GTFS.');
        }

        return $this->feed = $decoded;
    }

    private function normalizeNumber(string $value): string
    {
        $first = preg_split('/[\s\/]+/', trim($value))[0] ?? '';
        return ltrim($first, '0');
    }

    /** @param array<string, mixed> $trip */
    private function tripScore(array $trip, string $serviceDate, DateTimeImmutable $now): int
    {
        $times = [];
        foreach (($trip['s'] ?? []) as $stop) {
            $value = $stop[3] ?? $stop[2] ?? null;
            $time = $this->isoTime($serviceDate, is_string($value) ? $value : null);
            if ($time !== null) {
                $times[] = $time->getTimestamp();
            }
        }
        if ($times === []) {
            return PHP_INT_MAX;
        }

        $timestamp = $now->getTimestamp();
        $start = $times[0];
        $end = $times[array_key_last($times)];
        if ($start <= $timestamp + 1800 && $end >= $timestamp - 1800) {
            return 0;
        }
        return min(abs($start - $timestamp), abs($end - $timestamp));
    }

    private function isoTime(string $serviceDate, ?string $value): ?DateTimeImmutable
    {
        if ($value === null || preg_match('/^(\d+):(\d{2}):(\d{2})$/', $value, $parts) !== 1) {
            return null;
        }
        $base = DateTimeImmutable::createFromFormat('!Ymd', $serviceDate, new DateTimeZone('Europe/Warsaw'));
        if (!$base instanceof DateTimeImmutable) {
            return null;
        }
        $hours = (int) $parts[1];
        return $base
            ->add(new DateInterval('P' . intdiv($hours, 24) . 'D'))
            ->setTime($hours % 24, (int) $parts[2], (int) $parts[3]);
    }
}
