<?php

declare(strict_types=1);

// CRON: co minutę, np. * * * * * php /ścieżka/server/bin/refresh-live.php

require dirname(__DIR__) . '/bootstrap.php';

use KwInfo\Gtfs\Timetable;
use KwInfo\Live\LiveBuilder;

if (PHP_SAPI !== 'cli') {
    exit(1);
}
ini_set('memory_limit', '256M');
set_time_limit(55);

$lock = fopen(sys_get_temp_dir() . '/kw-refresh-live.lock', 'c');
if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
    exit(0);
}

try {
    (new LiveBuilder(new Timetable(), static function (string $line): void {
        echo '[' . date('H:i:s') . '] ' . $line . PHP_EOL;
    }))->run();
    exit(0);
} catch (Throwable $exception) {
    fwrite(STDERR, '[BŁĄD] ' . $exception->getMessage() . PHP_EOL);
    exit(1);
}
