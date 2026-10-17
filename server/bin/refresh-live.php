<?php

declare(strict_types=1);

// CRON: co minutę, np. * * * * * php /ścieżka/server/bin/refresh-live.php

require dirname(__DIR__) . '/bootstrap.php';

use KwInfo\Gtfs\Timetable;
use KwInfo\Live\LiveBuilder;
use KwInfo\Push\JourneyWatcher;
use KwInfo\Push\RouteWatcher;

if (PHP_SAPI !== 'cli') {
    exit(1);
}
ini_set('memory_limit', '256M');
set_time_limit(55);

$lock = fopen(sys_get_temp_dir() . '/kw-refresh-live.lock', 'c');
if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
    exit(0);
}

$log = static function (string $line): void {
    echo '[' . date('H:i:s') . '] ' . $line . PHP_EOL;
};
try {
    $tt = new Timetable();
    (new LiveBuilder($tt, $log))->run();
    // powiadomienia o obserwowanych podróżach — ich błąd nie psuje odświeżania danych
    try {
        (new JourneyWatcher($tt, $log))->run();
    } catch (Throwable $exception) {
        fwrite(STDERR, '[BŁĄD powiadomień] ' . $exception->getMessage() . PHP_EOL);
    }
    // powiadomienia o obserwowanych trasach (okienka czasu) — osobno, żeby błąd jednych nie blokował drugich
    try {
        (new RouteWatcher($tt, $log))->run();
    } catch (Throwable $exception) {
        fwrite(STDERR, '[BŁĄD powiadomień o trasach] ' . $exception->getMessage() . PHP_EOL);
    }
    exit(0);
} catch (Throwable $exception) {
    fwrite(STDERR, '[BŁĄD] ' . $exception->getMessage() . PHP_EOL);
    exit(1);
}
