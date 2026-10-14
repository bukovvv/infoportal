<?php

declare(strict_types=1);

namespace KwInfo;

/**
 * Ścieżki i adresy źródeł. Wartości można nadpisać w server/config/local.php (zwraca tablicę).
 */
final class Config
{
    /** @var array<string, mixed>|null */
    private static ?array $values = null;

    public static function get(string $key): mixed
    {
        return self::all()[$key] ?? null;
    }

    public static function path(string $key): string
    {
        return (string) self::get($key);
    }

    /** @return array<string, mixed> */
    private static function all(): array
    {
        if (self::$values !== null) {
            return self::$values;
        }
        $root = dirname(__DIR__);
        $storage = $root . '/storage';
        $defaults = [
            'root' => $root,
            'storage' => $storage,
            'gtfs_db' => $storage . '/gtfs.sqlite',
            'app_db' => $storage . '/app.sqlite',
            'live_file' => $storage . '/live.json',
            'rt_file' => $storage . '/rt.json',
            'rt_meta_file' => $storage . '/rt-meta.json',
            'cache_dir' => $storage . '/cache',
            // pojazdy z vagonWEB (bin/fetch-vehicles.php) — wyłączone do czasu zgody serwisu; włączenie: local.php
            'vagonweb_enabled' => false,
            'vehicles_file' => $storage . '/vehicles.json',
            'vehicles_img_dir' => $storage . '/vehicles',
            'cacert' => $root . '/config/cacert.pem',
            'gtfs_url' => 'https://mkuran.pl/gtfs/polish_trains.zip',
            'gtfs_rt_url' => 'https://mkuran.pl/gtfs/polish_trains/updates.pb',
            // GPS (Mapa BILKOM + zapas) — wyłączony, bo źródło od dawna nie zwraca pozycji; włączenie: local.php
            'gps_enabled' => false,
            'backup_gps_url' => 'https://kierownik-plus-v2.jak-ste139.workers.dev/',
            'agency_id' => 'KW',
            'rt_trip_prefix' => 'PLK_KW_',
            'rt_min_interval' => 110,
            'site_url' => 'https://infoportal.abuczek.pl',
            // e-mail na alerty o stanie danych (bin/check-health.php) — ustawiany w local.php na serwerze
            'alert_email' => null,
            'alert_from' => 'no-reply@abuczek.pl',
            'user_agent' => 'zanimwyjdziesz.pl/1.0 (+https://infoportal.abuczek.pl)',
        ];
        $local = $root . '/config/local.php';
        $overrides = is_file($local) ? require $local : [];

        return self::$values = array_replace($defaults, is_array($overrides) ? $overrides : []);
    }
}
