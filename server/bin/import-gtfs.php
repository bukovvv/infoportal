<?php

declare(strict_types=1);

// CRON: raz na dobę, np. 30 3 * * * php /ścieżka/server/bin/import-gtfs.php
// Opcje: --force (import mimo braku zmian), --file=ścieżka.zip (lokalne archiwum), --region=malopolska (tylko jeden region)
// Bez --region importuje po kolei wszystkie regiony z jednego pobranego archiwum.

require dirname(__DIR__) . '/bootstrap.php';

use KwInfo\Config;
use KwInfo\Gtfs\GtfsImporter;
use KwInfo\Vehicles\KwVehicleTypes;

if (PHP_SAPI !== 'cli') {
    exit(1);
}
ini_set('memory_limit', '512M');
set_time_limit(0);

$options = getopt('', ['force', 'file:', 'region:']);
$regions = isset($options['region']) ? [(string) $options['region']] : Config::regions();
foreach ($regions as $region) {
    if (!Config::isRegion($region)) {
        fwrite(STDERR, "Nieznany region: $region (dostępne: " . implode(', ', Config::regions()) . ")\n");
        exit(1);
    }
}
$lock = fopen(sys_get_temp_dir() . '/kw-import-gtfs.lock', 'c');
if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
    fwrite(STDERR, "Import już trwa.\n");
    exit(0);
}

$failed = false;
foreach ($regions as $i => $region) {
    Config::useRegion($region);
    try {
        $importer = new GtfsImporter(static function (string $line) use ($region): void {
            echo '[' . date('H:i:s') . '] [' . $region . '] ' . $line . PHP_EOL;
        });
        // archiwum pobiera tylko pierwszy region, kolejne korzystają z tego samego pliku
        $importer->run(isset($options['force']), isset($options['file']) ? (string) $options['file'] : null, $i === 0);
        // rodzaj pojazdu z rozkładu przewoźnika (tylko Wielkopolska); błąd nie przerywa importu
        KwVehicleTypes::refresh(static function (string $line) use ($region): void {
            echo '[' . date('H:i:s') . '] [' . $region . '] ' . $line . PHP_EOL;
        }, isset($options['force']));
    } catch (Throwable $exception) {
        fwrite(STDERR, '[BŁĄD] [' . $region . '] ' . $exception->getMessage() . PHP_EOL);
        $failed = true;
    }
}
Config::useRegion(Config::DEFAULT_REGION);
exit($failed ? 1 : 0);
