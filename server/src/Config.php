<?php

declare(strict_types=1);

namespace KwInfo;

/**
 * Ścieżki i adresy źródeł. Wartości można nadpisać w server/config/local.php (zwraca tablicę;
 * klucz 'regions' => ['malopolska' => [...]] nadpisuje ustawienia jednego regionu).
 *
 * Region (Wielkopolska — domyślny, Małopolska pod /malopolska) wybiera przewoźnika, granicę województwa
 * i własne pliki danych: rozkład, dane na żywo, punktualność, obserwowane podróże. Wspólne dla regionów:
 * pobrany polish_trains.zip i feed GTFS-RT (jedno pobranie), klucze push, sesje panelu, limity zapytań.
 */
final class Config
{
    public const DEFAULT_REGION = 'wielkopolska';

    /**
     * Ustawienia regionów (ponad domyślne). Pliki regionu niedomyślnego leżą w storage/<region>/.
     * @var array<string, array<string, mixed>>
     */
    private const REGIONS = [
        'wielkopolska' => [],
        'malopolska' => [
            'agency_id' => 'KML',
            'rt_trip_prefix' => 'PLK_KML_',
            'partner_agencies' => ['PR' => 'PLK_PR_', 'IC' => 'PLK_IC_'],
            // POLREGIO honoruje bilety KML na odcinkach obsługiwanych wspólnie (strona KML „Honorowanie biletów”)
            'kw_ticket_agencies' => ['PR'],
            'region_file' => 'malopolskie.json',
            'region_inside' => [],
            'region_name' => 'Małopolska',
            'agency_name' => 'Koleje Małopolskie',
            'site_path' => '/malopolska',
            // komunikaty i panel administratora na razie tylko w Wielkopolsce
            'admin_enabled' => false,
            // GPS pociągów KML z otwartych danych przewoźnika (gtfs.kolejemalopolskie.com.pl; warunek: podanie źródła)
            'gps_enabled' => true,
            'gps_source' => 'kml',
            'kml_rt_url' => 'https://gtfs.kolejemalopolskie.com.pl/?download=L2hvbWUva21sL3JvemtsYWR5X2phemR5L2tvbGVqL3JlYWx0aW1lLnBi',
            'kml_gtfs_url' => 'https://gtfs.kolejemalopolskie.com.pl/?download=L2hvbWUva21sL3JvemtsYWR5X2phemR5L2tvbGVqL2d0ZnMuemlw',
            // rozkład KMŁ nie podaje rodzaju pojazdu
            'kw_gtfs_url' => null,
        ],
    ];

    /** @var array<string, mixed>|null */
    private static ?array $values = null;
    private static string $region = self::DEFAULT_REGION;

    public static function get(string $key): mixed
    {
        return self::all()[$key] ?? null;
    }

    public static function path(string $key): string
    {
        return (string) self::get($key);
    }

    /** @return list<string> */
    public static function regions(): array
    {
        return array_keys(self::REGIONS);
    }

    public static function region(): string
    {
        return self::$region;
    }

    public static function isRegion(string $region): bool
    {
        return isset(self::REGIONS[$region]);
    }

    /** Przełącza ustawienia na region (API: /api/<region>/…, skrypty CRON: po kolei wszystkie). */
    public static function useRegion(string $region): void
    {
        if (!self::isRegion($region)) {
            throw new \InvalidArgumentException('Nieznany region: ' . $region);
        }
        self::$region = $region;
        self::$values = null;
    }

    /** @return array<string, mixed> */
    private static function all(): array
    {
        if (self::$values !== null) {
            return self::$values;
        }
        $root = dirname(__DIR__);
        $storage = $root . '/storage';
        $local = $root . '/config/local.php';
        $overrides = is_file($local) ? require $local : [];
        $overrides = is_array($overrides) ? $overrides : [];
        $regionOverrides = (array) ($overrides['regions'][self::$region] ?? []);
        unset($overrides['regions']);
        // pliki danych regionu: Wielkopolska jak dotąd w storage/, pozostałe w storage/<region>/
        $data = self::$region === self::DEFAULT_REGION ? $storage : $storage . '/' . self::$region;
        $defaults = [
            'root' => $root,
            'storage' => $storage,
            'region' => self::$region,
            'region_storage' => $data,
            'gtfs_db' => $data . '/gtfs.sqlite',
            'app_db' => $data . '/app.sqlite',
            // punktualność kursów (bin/refresh-live.php co kwadrans) — poza codzienną kopią app.sqlite
            'stats_db' => $data . '/stats.sqlite',
            'live_file' => $data . '/live.json',
            'rt_file' => $data . '/rt.json',
            'rt_meta_file' => $data . '/rt-meta.json',
            'cache_dir' => $data . '/cache',
            // pojazdy z vagonWEB (bin/fetch-vehicles.php) — wyłączone do czasu zgody serwisu; włączenie: local.php
            'vagonweb_enabled' => false,
            'vehicles_file' => $storage . '/vehicles.json',
            'vehicles_img_dir' => $storage . '/vehicles',
            'cacert' => $root . '/config/cacert.pem',
            'gtfs_url' => 'https://mkuran.pl/gtfs/polish_trains.zip',
            'gtfs_rt_url' => 'https://mkuran.pl/gtfs/polish_trains/updates.pb',
            // rozkład przewoźnika (otwarte dane z BIP KW) — tylko rodzaj pojazdu i udogodnienia (Vehicles/KwVehicleTypes)
            'kw_gtfs_url' => 'http://ws.kolejewlkp.pl:83/gtfs_kw.zip',
            // GPS (Mapa BILKOM + zapas) — wyłączony, bo źródło od dawna nie zwraca pozycji; włączenie: local.php
            'gps_enabled' => false,
            'backup_gps_url' => 'https://kierownik-plus-v2.jak-ste139.workers.dev/',
            'agency_id' => 'KW',
            'rt_trip_prefix' => 'PLK_KW_',
            // przewoźnicy poza mapą (wyszukiwarka, tablica, strona pociągu), obcięci do województwa: agency_id => prefiks trip_id w GTFS-RT
            'partner_agencies' => ['PR' => 'PLK_PR_', 'IC' => 'PLK_IC_'],
            // partnerzy honorujący bilety przewoźnika na odcinkach wspólnych z nim (POLREGIO tak, PKP Intercity nie)
            'kw_ticket_agencies' => ['PR'],
            // skróty przewoźników w tekstach dla pasażerów (powiadomienia): w rozkładzie KML, pasażerom KMŁ
            'agency_labels' => ['KML' => 'KMŁ'],
            // granica województwa (server/src/Gtfs/…) i stacje w nim, które przez uproszczenie granicy wypadają tuż za nią
            'region_file' => 'wielkopolskie.json',
            'region_inside' => ['Wydartowo'],
            'region_name' => 'Wielkopolska',
            'agency_name' => 'Koleje Wielkopolskie',
            'site_path' => '',
            'admin_enabled' => true,
            'rt_min_interval' => 110,
            'site_url' => 'https://zanimwyjdziesz.pl',
            // e-mail na alerty o stanie danych (bin/check-health.php) — ustawiany w local.php na serwerze
            'alert_email' => null,
            'alert_from' => 'no-reply@abuczek.pl',
            'user_agent' => 'zanimwyjdziesz.pl/1.0 (+https://zanimwyjdziesz.pl)',
        ];

        return self::$values = array_replace($defaults, self::REGIONS[self::$region], $overrides, $regionOverrides);
    }
}
