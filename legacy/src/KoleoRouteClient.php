<?php

declare(strict_types=1);

namespace KwInfo;

use DateInterval;
use DateTimeImmutable;
use DateTimeZone;
use RuntimeException;

final class KoleoRouteClient
{
    private const API = 'https://api.koleo.pl/v2/main';
    private const HUBS = [
        ['id' => 30601, 'lat' => 52.402, 'lon' => 16.911],
        ['id' => 30809, 'lat' => 52.535, 'lon' => 17.603],
        ['id' => 42606, 'lat' => 51.844, 'lon' => 16.566],
        ['id' => 45906, 'lat' => 51.649, 'lon' => 17.816],
        ['id' => 45245, 'lat' => 51.747, 'lon' => 18.083],
        ['id' => 33100, 'lat' => 52.226, 'lon' => 18.252],
        ['id' => 29108, 'lat' => 52.879, 'lon' => 16.012],
        ['id' => 31302, 'lat' => 52.808, 'lon' => 17.206],
        ['id' => 43000, 'lat' => 52.116, 'lon' => 16.117],
        ['id' => 14407, 'lat' => 53.146, 'lon' => 16.738],
        ['id' => 26104, 'lat' => 52.244, 'lon' => 15.817],
        ['id' => 44701, 'lat' => 51.972, 'lon' => 17.501],
        ['id' => 44305, 'lat' => 51.610, 'lon' => 16.858],
        ['id' => 44008, 'lat' => 51.695, 'lon' => 17.437],
        ['id' => 33191, 'lat' => 52.204, 'lon' => 18.642],
        ['id' => 32003, 'lat' => 52.657, 'lon' => 17.955],
    ];

    public function __construct(
        private readonly string $stationDictionaryPath,
        private readonly string $gtfsPath,
        private readonly string $certificateBundle
    ) {
    }

    /** @return array<string, mixed> */
    public function route(string $trainNumber, float $lat, float $lon): array
    {
        $reference = $this->findReference($trainNumber, $lat, $lon);
        $timetable = $this->requestJson(sprintf(
            '%s/train_timetable/%d/%s',
            self::API,
            $reference['trainId'],
            rawurlencode($reference['operatingDay'])
        ));
        $names = $this->stationNames();
        $gtfsStations = $this->gtfsStations();
        $stops = [];
        $path = [];

        foreach (($timetable['stops'] ?? []) as $stop) {
            $stationId = (string) ($stop['station_id'] ?? '');
            $name = $names[$stationId] ?? 'Stacja ' . $stationId;
            $point = $gtfsStations[$name] ?? null;
            $row = [
                'stationId' => $point['id'] ?? $stationId,
                'name' => $name,
                'arrival' => $stop['actual_arrival'] ?? $stop['expected_arrival'] ?? $stop['arrival'] ?? null,
                'departure' => $stop['actual_departure'] ?? $stop['expected_departure'] ?? $stop['departure'] ?? null,
                'platform' => $stop['platform'] ?? null,
                'track' => $stop['track'] ?? null,
                'lat' => $point['lat'] ?? null,
                'lon' => $point['lon'] ?? null,
            ];
            $stops[] = $row;
            if ($row['lat'] !== null && $row['lon'] !== null) {
                $path[] = [$row['lat'], $row['lon']];
            }
        }

        if ($stops === []) {
            throw new RuntimeException('Rozkład zewnętrzny nie zawiera stacji.');
        }

        return [
            'number' => $this->normalizeNumber($trainNumber),
            'name' => (string) ($timetable['train_full_name'] ?? $trainNumber),
            'origin' => $stops[0]['name'],
            'destination' => $stops[array_key_last($stops)]['name'],
            'serviceDate' => (string) ($timetable['operating_day'] ?? $reference['operatingDay']),
            'stops' => $stops,
            'path' => $path,
            'source' => 'Koleo · rezerwowe źródło trasy',
            'attribution' => ['Dane rozkładowe: Koleo'],
        ];
    }

    /** @return array{trainId: int, operatingDay: string} */
    private function findReference(string $trainNumber, float $lat, float $lon): array
    {
        $wanted = $this->normalizeNumber($trainNumber);
        $now = new DateTimeImmutable('now', new DateTimeZone('Europe/Warsaw'));
        $dates = [$now->format('Y-m-d')];
        if ((int) $now->format('G') < 4) {
            $dates[] = $now->sub(new DateInterval('P1D'))->format('Y-m-d');
        }
        $hubs = $this->nearestHubs($lat, $lon);

        foreach ($dates as $date) {
            foreach (['departures', 'arrivals'] as $type) {
                $urls = array_map(
                    static fn (array $hub): string => sprintf('%s/timetables/%d/%s/%s', self::API, $hub['id'], $date, $type),
                    $hubs
                );
                foreach ($this->requestMany($urls) as $rows) {
                    foreach ($rows as $train) {
                        if ($this->normalizeNumber((string) ($train['train_full_name'] ?? '')) !== $wanted) {
                            continue;
                        }
                        foreach (($train['stations'] ?? []) as $station) {
                            $trainId = filter_var($station['train_id'] ?? null, FILTER_VALIDATE_INT);
                            $operatingDay = (string) ($station['operating_day'] ?? '');
                            if ($trainId !== false && $trainId !== null && $operatingDay !== '') {
                                return ['trainId' => $trainId, 'operatingDay' => $operatingDay];
                            }
                        }
                    }
                }
            }
        }

        throw new RuntimeException('Nie znaleziono aktualnej trasy tego pociągu.');
    }

    /** @return array<int, array{id: int, lat: float, lon: float}> */
    private function nearestHubs(float $lat, float $lon): array
    {
        $hubs = self::HUBS;
        $scale = cos(deg2rad($lat));
        usort($hubs, static function (array $left, array $right) use ($lat, $lon, $scale): int {
            $leftDistance = ($left['lat'] - $lat) ** 2 + (($left['lon'] - $lon) * $scale) ** 2;
            $rightDistance = ($right['lat'] - $lat) ** 2 + (($right['lon'] - $lon) * $scale) ** 2;
            return $leftDistance <=> $rightDistance;
        });
        return array_slice($hubs, 0, 5);
    }

    /** @param array<int, string> $urls @return array<int, array<int, array<string, mixed>>> */
    private function requestMany(array $urls): array
    {
        $multi = curl_multi_init();
        $handles = [];
        foreach ($urls as $index => $url) {
            $handle = $this->handle($url);
            curl_multi_add_handle($multi, $handle);
            $handles[$index] = $handle;
        }

        do {
            $status = curl_multi_exec($multi, $active);
            if ($active) {
                curl_multi_select($multi, 1.0);
            }
        } while ($active && $status === CURLM_OK);

        $results = [];
        foreach ($handles as $handle) {
            $body = curl_multi_getcontent($handle);
            $httpStatus = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
            if ($httpStatus >= 200 && $httpStatus < 300 && is_string($body)) {
                $decoded = json_decode($body, true);
                $results[] = is_array($decoded) ? $decoded : [];
            }
            curl_multi_remove_handle($multi, $handle);
            curl_close($handle);
        }
        curl_multi_close($multi);
        return $results;
    }

    /** @return array<string, mixed> */
    private function requestJson(string $url): array
    {
        $handle = $this->handle($url);
        $body = curl_exec($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $error = curl_error($handle);
        curl_close($handle);
        if (!is_string($body) || $status < 200 || $status >= 300) {
            throw new RuntimeException($error !== '' ? $error : 'Źródło rozkładu odpowiedziało kodem ' . $status . '.');
        }
        $decoded = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($decoded)) {
            throw new RuntimeException('Źródło rozkładu zwróciło nieprawidłowe dane.');
        }
        return $decoded;
    }

    /** @return \CurlHandle */
    private function handle(string $url): \CurlHandle
    {
        $handle = curl_init($url);
        if (!$handle instanceof \CurlHandle) {
            throw new RuntimeException('Nie udało się uruchomić połączenia z rozkładem.');
        }
        curl_setopt_array($handle, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_TIMEOUT => 12,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTPHEADER => ['Accept: application/json', 'x-koleo-version: 2', 'x-koleo-client: Nuxt-1'],
            CURLOPT_USERAGENT => 'KW-Infoportal/0.3',
            CURLOPT_CAINFO => $this->certificateBundle,
        ]);
        return $handle;
    }

    /** @return array<string, string> */
    private function stationNames(): array
    {
        $rows = json_decode((string) file_get_contents($this->stationDictionaryPath), true, 512, JSON_THROW_ON_ERROR);
        $names = [];
        foreach ($rows as $row) {
            $names[(string) ($row['id'] ?? '')] = (string) ($row['name'] ?? '');
        }
        return $names;
    }

    /** @return array<string, array{id: string, lat: float|null, lon: float|null}> */
    private function gtfsStations(): array
    {
        $feed = json_decode((string) file_get_contents($this->gtfsPath), true, 512, JSON_THROW_ON_ERROR);
        $stations = [];
        foreach (($feed['trains'] ?? []) as $trips) {
            foreach ($trips as $trip) {
                foreach (($trip['s'] ?? []) as $stop) {
                    if (!is_array($stop) || count($stop) < 2) {
                        continue;
                    }
                    $name = (string) $stop[1];
                    $stations[$name] ??= [
                        'id' => (string) $stop[0],
                        'lat' => isset($stop[6]) ? (float) $stop[6] : null,
                        'lon' => isset($stop[7]) ? (float) $stop[7] : null,
                    ];
                }
            }
        }
        return $stations;
    }

    private function normalizeNumber(string $value): string
    {
        $first = preg_split('/\s+/', trim($value))[0] ?? '';
        return ltrim($first, '0');
    }
}
