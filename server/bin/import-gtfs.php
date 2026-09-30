<?php

declare(strict_types=1);

// CRON: raz na dobę, np. 30 3 * * * php /ścieżka/server/bin/import-gtfs.php
// Opcje: --force (import mimo braku zmian), --file=ścieżka.zip (lokalne archiwum)

require dirname(__DIR__) . '/bootstrap.php';

use KwInfo\Gtfs\GtfsImporter;

if (PHP_SAPI !== 'cli') {
    exit(1);
}
ini_set('memory_limit', '512M');
set_time_limit(0);

$options = getopt('', ['force', 'file:']);
$lock = fopen(sys_get_temp_dir() . '/kw-import-gtfs.lock', 'c');
if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
    fwrite(STDERR, "Import już trwa.\n");
    exit(0);
}

try {
    $importer = new GtfsImporter(static function (string $line): void {
        echo '[' . date('H:i:s') . '] ' . $line . PHP_EOL;
    });
    $importer->run(isset($options['force']), isset($options['file']) ? (string) $options['file'] : null);
    exit(0);
} catch (Throwable $exception) {
    fwrite(STDERR, '[BŁĄD] ' . $exception->getMessage() . PHP_EOL);
    exit(1);
}
