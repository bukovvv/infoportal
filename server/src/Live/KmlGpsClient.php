<?php

declare(strict_types=1);

namespace KwInfo\Live;

use KwInfo\Config;
use KwInfo\Net\HttpClient;
use RuntimeException;

/**
 * Pozycje GPS pociągów Kolei Małopolskich z ich otwartych danych (GTFS-Realtime, gtfs.kolejemalopolskie.com.pl).
 * Pojazd bez przypisanego kursu albo kurs bez numeru pociągu (KmlTripMap) jest pomijany. Opóźnienia zostają z PKP PLK —
 * feed KMŁ daje tu tylko położenie (bez prędkości i kierunku, gdy ich nie poda).
 */
final class KmlGpsClient
{
    public const PROVIDER = 'Koleje Małopolskie';

    /** @return array<int, GpsTrain> */
    public function trains(?callable $log = null): array
    {
        $response = HttpClient::get((string) Config::get('kml_rt_url'), [], 15);
        if ($response['status'] !== 200) {
            throw new RuntimeException('HTTP ' . $response['status']);
        }
        $feed = GtfsRtDecoder::vehicles($response['body']);
        $numbers = KmlTripMap::load($log);
        $trains = [];
        foreach ($feed['vehicles'] as $v) {
            $number = $v['tripId'] !== null ? ($numbers[$v['tripId']] ?? null) : null;
            if ($number === null) {
                continue;
            }
            $trains[] = new GpsTrain(
                $number,
                $v['lat'],
                $v['lon'],
                $v['speed'] !== null ? (int) round($v['speed'] * 3.6) : null,
                $v['bearing'] !== null ? (int) round($v['bearing']) : null,
                null,
                (int) ($v['timestamp'] ?? $feed['timestamp'] ?? time()),
                self::PROVIDER,
            );
        }

        return $trains;
    }
}
