<?php

declare(strict_types=1);

namespace KwInfo;

use DateTimeImmutable;
use DateTimeZone;
use RuntimeException;

final class KierownikPlusClient
{
    private const ENDPOINT = 'https://kierownik-plus-v2.jak-ste139.workers.dev/';
    private const MAX_POSITION_AGE = 2700;

    /**
     * @param array{west: float, south: float, east: float, north: float} $bounds
     * @return array{source: string, fetchedAt: string, trains: array<int, array<string, bool|float|int|string>>, stats: array<string, int>}
     */
    public function trains(array $bounds): array
    {
        $query = http_build_query([
            'bounds' => implode(',', [$bounds['west'], $bounds['south'], $bounds['east'], $bounds['north']]),
        ]);
        $payload = $this->request(self::ENDPOINT . '?' . $query);
        $decoded = json_decode($payload, true, 512, JSON_THROW_ON_ERROR);

        if (!is_array($decoded)) {
            throw new RuntimeException('Źródło GPS zwróciło nieprawidłową odpowiedź.');
        }

        $now = time();
        $trains = [];

        foreach ($decoded as $row) {
            if (!is_array($row)) {
                continue;
            }

            $carrier = (string) ($row['carrier'] ?? '');
            $number = trim((string) ($row['trainNumber'] ?? ''));
            $location = is_array($row['geoLocation'] ?? null) ? $row['geoLocation'] : [];
            $lat = filter_var($location['lat'] ?? null, FILTER_VALIDATE_FLOAT);
            $lon = filter_var($location['lon'] ?? null, FILTER_VALIDATE_FLOAT);
            $observedAt = $this->parseGpsTime($location['gpsTime'] ?? null);

            if (!$this->isKwTrain($carrier, $number) || $lat === false || $lon === false || $observedAt === null) {
                continue;
            }

            $age = $now - $observedAt;
            if ($age > self::MAX_POSITION_AGE || $age < -300) {
                continue;
            }

            $speed = max(0, (int) round((float) ($location['speedKph'] ?? 0)));
            $delay = max(0, (int) ($row['delayInMinutes'] ?? 0));
            $trains[] = [
                'id' => (string) ($row['id'] ?? 'kw-' . $number),
                'number' => preg_replace('/^KW\s+/i', '', $number) ?: $number,
                'carrier' => $carrier,
                'lat' => (float) $lat,
                'lon' => (float) $lon,
                'speed' => $speed,
                'heading' => (int) round((float) ($location['heading'] ?? 0)),
                'delay' => $delay,
                'delayed' => $delay > 0,
                'observedAt' => gmdate(DATE_ATOM, $observedAt),
                'ageSeconds' => max(0, $age),
                'stale' => $age > 300,
                'source' => 'gps',
                'estimated' => false,
            ];
        }

        usort($trains, static fn (array $left, array $right): int => strnatcasecmp((string) $left['number'], (string) $right['number']));

        return [
            'source' => 'Kierownik Plus',
            'fetchedAt' => (new DateTimeImmutable('now', new DateTimeZone('Europe/Warsaw')))->format(DATE_ATOM),
            'trains' => $trains,
            'stats' => [
                'total' => count($trains),
                'moving' => count(array_filter($trains, static fn (array $train): bool => $train['speed'] > 3)),
                'onTime' => count(array_filter($trains, static fn (array $train): bool => $train['delay'] === 0)),
                'delayed' => count(array_filter($trains, static fn (array $train): bool => $train['delay'] > 0)),
            ],
        ];
    }

    private function isKwTrain(string $carrier, string $number): bool
    {
        $source = mb_strtolower($carrier . ' ' . $number, 'UTF-8');

        return str_contains($source, 'koleje wielkopolskie') || preg_match('/(^|\s)kw(\s|$)/i', $source) === 1;
    }

    private function parseGpsTime(mixed $value): ?int
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }

        $date = DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', trim($value), new DateTimeZone('UTC'));

        return $date instanceof DateTimeImmutable ? $date->getTimestamp() : null;
    }

    private function request(string $url): string
    {
        $certificateBundle = dirname(__DIR__) . '/config/cacert.pem';

        if (function_exists('curl_init')) {
            $handle = curl_init($url);
            if ($handle === false) {
                throw new RuntimeException('Nie udało się uruchomić połączenia ze źródłem GPS.');
            }

            curl_setopt_array($handle, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CONNECTTIMEOUT => 4,
                CURLOPT_TIMEOUT => 10,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_HTTPHEADER => ['Accept: application/json'],
                CURLOPT_USERAGENT => 'KW-Infoportal/0.2',
                CURLOPT_CAINFO => $certificateBundle,
            ]);

            $body = curl_exec($handle);
            $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
            $error = curl_error($handle);
            curl_close($handle);

            if (!is_string($body) || $status < 200 || $status >= 300) {
                throw new RuntimeException($error !== '' ? $error : "Źródło GPS odpowiedziało kodem {$status}.");
            }

            return $body;
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 10,
                'header' => "Accept: application/json\r\nUser-Agent: KW-Infoportal/0.2\r\n",
                'ignore_errors' => true,
            ],
            'ssl' => [
                'cafile' => $certificateBundle,
                'verify_peer' => true,
                'verify_peer_name' => true,
            ],
        ]);
        $body = @file_get_contents($url, false, $context);

        if (!is_string($body)) {
            throw new RuntimeException('Źródło GPS jest chwilowo niedostępne.');
        }

        return $body;
    }
}
