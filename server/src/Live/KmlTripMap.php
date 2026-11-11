<?php

declare(strict_types=1);

namespace KwInfo\Live;

use KwInfo\Clock;
use KwInfo\Config;
use KwInfo\Gtfs\GtfsSource;
use KwInfo\Net\HttpClient;
use KwInfo\Storage;
use Throwable;

/**
 * Kursy z rozkładu Kolei Małopolskich (gtfs.kolejemalopolskie.com.pl) → numery pociągów. Feed KMŁ ma własne
 * identyfikatory kursów (np. 51397284_454329), a numer pociągu podaje w kolumnie block_id (np. „33356/7”).
 * Rozkład KMŁ pobierany najwyżej co 6 h (warunkowo), mapa przeliczana po jego zmianie.
 */
final class KmlTripMap
{
    private const CHECK_EVERY = 6 * 3600;

    /** @return array<string, string> identyfikator kursu KMŁ => numer pociągu */
    public static function load(?callable $log = null): array
    {
        $dir = Config::path('region_storage');
        $file = $dir . '/kml-trips.json';
        $zip = $dir . '/kml-gtfs.zip';
        $data = Realtime::readJson($file);
        $changed = false;
        if (time() - (int) ($data['checkedAt'] ?? 0) >= self::CHECK_EVERY || !is_file($zip)) {
            $data['checkedAt'] = time();
            try {
                $headers = is_file($zip) && !empty($data['lastModified']) ? ['If-Modified-Since: ' . $data['lastModified']] : [];
                $part = $zip . '.part';
                $response = HttpClient::get((string) Config::get('kml_gtfs_url'), $headers, 60, $part);
                if ($response['status'] === 200 && filesize($part) > 1000) {
                    @unlink($zip);
                    rename($part, $zip);
                    $data['lastModified'] = $response['headers']['last-modified'] ?? null;
                    $changed = true;
                } else {
                    @unlink($part);
                }
            } catch (Throwable $e) {
                $log && $log('Rozkład KMŁ: ' . $e->getMessage());
            }
            Storage::writeJson($file, $data);
        }
        if (!is_file($zip)) {
            return [];
        }
        if ($changed || !isset($data['trips'])) {
            $data['trips'] = self::build(new GtfsSource($zip));
            $data['builtAt'] = Clock::now()->format(DATE_ATOM);
            Storage::writeJson($file, $data);
            $log && $log('Rozkład KMŁ: ' . count($data['trips']) . ' kursów z numerami pociągów');
        }

        return (array) $data['trips'];
    }

    /** @return array<string, string> */
    public static function build(GtfsSource $src): array
    {
        $map = [];
        foreach ($src->rows('trips.txt') as $t) {
            $number = trim((string) ($t['block_id'] ?? ''));
            if ($number !== '' && preg_match('/^\d{3,6}/', $number) === 1) {
                $map[(string) $t['trip_id']] = $number;
            }
        }

        return $map;
    }
}
