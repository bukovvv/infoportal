<?php

declare(strict_types=1);

namespace KwInfo\Live;

use DateTimeImmutable;
use KwInfo\Clock;
use KwInfo\Net\HttpClient;
use RuntimeException;

/** Pozycje GPS z mapy BILKOM (źródło podstawowe). Przeniesione z wersji 0.2. */
final class BilkomMapClient
{
    private const ENDPOINT = 'https://mapa.bilkom.pl/api/proxy/wbnet/delay/geolocation/getTrainsForSelectedCoordinates';
    private const MAX_POSITION_AGE = 2700;

    /**
     * @param array{west: float, south: float, east: float, north: float} $bounds
     * @return array<int, GpsTrain>
     */
    public function trains(array $bounds): array
    {
        $query = http_build_query([
            'bounds' => implode(',', [$bounds['west'], $bounds['south'], $bounds['east'], $bounds['north']]),
            'stationSearchType' => 'NO_STATION',
        ]);
        $response = HttpClient::get(self::ENDPOINT . '?' . $query, ['Accept: application/json', 'Referer: https://mapa.bilkom.pl/'], 12);
        if ($response['status'] < 200 || $response['status'] >= 300) {
            throw new RuntimeException('Mapa BILKOM odpowiedziała kodem ' . $response['status'] . '.');
        }
        $decoded = json_decode($response['body'], true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($decoded)) {
            throw new RuntimeException('Mapa BILKOM zwróciła nieprawidłową odpowiedź.');
        }

        $now = time();
        $trains = [];
        foreach ($decoded as $row) {
            if (!is_array($row)) {
                continue;
            }
            $carrier = trim((string) ($row['carrier'] ?? ''));
            $number = trim((string) ($row['trainNumber'] ?? ''));
            $displayNumber = trim((string) ($row['trainNumberFromSEPE'] ?? $number));
            $location = is_array($row['geoLocation'] ?? null) ? $row['geoLocation'] : [];
            $lat = filter_var($location['lat'] ?? null, FILTER_VALIDATE_FLOAT);
            $lon = filter_var($location['lon'] ?? null, FILTER_VALIDATE_FLOAT);
            $observedAt = self::parseTime($location['gpsTime'] ?? null);
            if (!self::isKw($carrier, $number . ' ' . $displayNumber) || $lat === false || $lon === false || $observedAt === null) {
                continue;
            }
            $age = $now - $observedAt;
            if ($age > self::MAX_POSITION_AGE || $age < -300) {
                continue;
            }
            $clean = preg_replace('/^KW\s+/i', '', $displayNumber !== '' ? $displayNumber : $number) ?: $number;
            $trains[] = new GpsTrain(
                $clean,
                (float) $lat,
                (float) $lon,
                max(0, (int) round((float) ($location['speedKph'] ?? 0))),
                isset($location['heading']) ? (int) round((float) $location['heading']) : null,
                max(0, (int) ($row['delayInMinutes'] ?? 0)),
                $observedAt,
                'Mapa BILKOM'
            );
        }

        return $trains;
    }

    public static function isKw(string $carrier, string $number): bool
    {
        $source = mb_strtolower($carrier . ' ' . $number, 'UTF-8');

        return str_contains($source, 'koleje wielkopolskie') || preg_match('/(^|\s)kw(\s|$)/i', $source) === 1;
    }

    private static function parseTime(mixed $value): ?int
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }
        $local = DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', trim($value), Clock::zone());
        if ($local instanceof DateTimeImmutable) {
            return $local->getTimestamp();
        }
        try {
            return (new DateTimeImmutable(trim($value), Clock::zone()))->getTimestamp();
        } catch (\Throwable) {
            return null;
        }
    }
}
