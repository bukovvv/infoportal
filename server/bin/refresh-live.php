<?php

declare(strict_types=1);

// CRON: co minutę, np. * * * * * php /ścieżka/server/bin/refresh-live.php
// Odświeża po kolei wszystkie regiony z zaimportowanym rozkładem (feed GTFS-RT pobierany raz — RtFeed).
// Opcje: --stats (punktualność od razu), --plk (utrudnienia PKP PLK od razu), --region=malopolska (tylko jeden region)

require dirname(__DIR__) . '/bootstrap.php';

use KwInfo\Config;
use KwInfo\Gtfs\Timetable;
use KwInfo\Live\LiveBuilder;
use KwInfo\Notices\PlkDisruptions;
use KwInfo\Push\JourneyWatcher;
use KwInfo\Push\RouteWatcher;
use KwInfo\Stats\PunctualityRecorder;

if (PHP_SAPI !== 'cli') {
    exit(1);
}
ini_set('memory_limit', '256M');
set_time_limit(55);

$lock = fopen(sys_get_temp_dir() . '/kw-refresh-live.lock', 'c');
if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
    exit(0);
}

$options = getopt('', ['stats', 'plk', 'region:']);
$regions = isset($options['region']) ? [(string) $options['region']] : Config::regions();
$stats = (int) date('i') % 15 === 7 || isset($options['stats']);
$plk = (int) date('i') % 10 === 3 || isset($options['plk']);
$failed = false;
foreach ($regions as $region) {
    if (!Config::isRegion($region)) {
        fwrite(STDERR, "Nieznany region: $region\n");
        exit(1);
    }
    Config::useRegion($region);
    // region bez zaimportowanego rozkładu (np. przed pierwszym importem po wdrożeniu) — pomijany po cichu
    // region bez danych na żywo (nowyrj27) i region bez zaimportowanego rozkładu (np. przed pierwszym importem po wdrożeniu) — pomijane po cichu
    if (!Config::get('live_enabled') || ($region !== Config::DEFAULT_REGION && !is_file(Config::path('gtfs_db')))) {
        continue;
    }
    $log = static function (string $line) use ($region): void {
        echo '[' . date('H:i:s') . '] [' . $region . '] ' . $line . PHP_EOL;
    };
    $err = static function (string $what, Throwable $exception) use ($region): void {
        fwrite(STDERR, '[BŁĄD' . ($what !== '' ? ' ' . $what : '') . '] [' . $region . '] ' . $exception->getMessage() . PHP_EOL);
    };
    try {
        $tt = new Timetable();
        (new LiveBuilder($tt, $log))->run();
    } catch (Throwable $exception) {
        $err('', $exception);
        $failed = true;
        continue;
    }
    // powiadomienia o obserwowanych podróżach — ich błąd nie psuje odświeżania danych
    try {
        (new JourneyWatcher($tt, $log))->run();
    } catch (Throwable $exception) {
        $err('powiadomień', $exception);
    }
    // powiadomienia o obserwowanych trasach (okienka czasu) — osobno, żeby błąd jednych nie blokował drugich
    try {
        (new RouteWatcher($tt, $log))->run();
    } catch (Throwable $exception) {
        $err('powiadomień o trasach', $exception);
    }
    // punktualność dojechanych kursów — co kwadrans (albo z --stats), bez osobnego CRON-a
    if ($stats) {
        try {
            (new PunctualityRecorder($tt, null, $log))->run();
        } catch (Throwable $exception) {
            $err('punktualności', $exception);
        }
    }
    // utrudnienia PKP PLK → szkice komunikatów — co 10 min, tylko region z komunikatami (Wielkopolska)
    $plkKey = trim((string) Config::get('plk_api_key'));
    if ($plk && $plkKey !== '' && $region === Config::DEFAULT_REGION) {
        try {
            PlkDisruptions::create($log)->run($plkKey);
        } catch (Throwable $exception) {
            $err('utrudnień PKP PLK', $exception);
        }
    }
}
Config::useRegion(Config::DEFAULT_REGION);
exit($failed ? 1 : 0);
