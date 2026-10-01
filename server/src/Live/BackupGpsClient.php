<?php

declare(strict_types=1);

namespace KwInfo\Live;

use DateTimeImmutable;
use KwInfo\Clock;
use KwInfo\Config;
use KwInfo\Net\HttpClient;
use RuntimeException;

/** Pozycje GPS z zapasowego źródła (worker Cloudflare). Przeniesione z wersji 0.2. */
final class BackupGpsClient
{
    public const PROVIDER = 'GPS zapasowy';
    private const MAX_POSITION_AGE = 2700;

    /**
     * @param array{west: float, south: float, east: float, north: float} $bounds
     * @return array<int, GpsTrain>
     */
    public function trains(array $bounds): array
    {
        $query = http_build_query(['bounds' => implode(',', [$bounds['west'], $bounds['south'], $bounds['east'], $bounds['north']])]);
        $response = HttpClient::get(rtrim((string) Config::get('backup_gps_url'), '/') . '/?' . $query, ['Accept: application/json'], 10);
        if ($response['status'] < 200 || $response['status'] >= 300) {
            throw new RuntimeException('Zapasowe źródło GPS odpowiedziało kodem ' . $response['status'] . '.');
        }
        $decoded = json_decode($response['body'], true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($decoded)) {
            throw new RuntimeException('Zapasowe źródło GPS zwróciło nieprawidłową odpowiedź.');
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
            $observedAt = self::parseTime($location['gpsTime'] ?? null);
            if (!BilkomMapClient::isKw($carrier, $number) || $lat === false || $lon === false || $observedAt === null) {
                continue;
            }
            $age = $now - $observedAt;
            if ($age > self::MAX_POSITION_AGE || $age < -300) {
                continue;
            }
            $trains[] = new GpsTrain(
                preg_replace('/^KW\s+/i', '', $number) ?: $number,
                (float) $lat,
                (float) $lon,
                max(0, (int) round((float) ($location['speedKph'] ?? 0))),
                isset($location['heading']) ? (int) round((float) $location['heading']) : null,
                max(0, (int) ($row['delayInMinutes'] ?? 0)),
                $observedAt,
                self::PROVIDER
            );
        }

        return $trains;
    }

    private static function parseTime(mixed $value): ?int
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }
        $date = DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', trim($value), Clock::zone());

        return $date instanceof DateTimeImmutable ? $date->getTimestamp() : null;
    }
}
