<?php

declare(strict_types=1);

// CRON: raz na dobę, np. 45 4 * * * php /ścieżka/server/bin/fetch-vehicles.php
// Pobiera z vagonWEB.cz zestawienia pociągów KW i rysunki pojazdów (za zgodą serwisu).
// Opcje: --limit=N (tylko N pociągów, do testów), --pause=S (przerwa między zapytaniami, domyślnie 3 s).

require dirname(__DIR__) . '/bootstrap.php';

use KwInfo\Config;
use KwInfo\Live\Realtime;
use KwInfo\Net\HttpClient;
use KwInfo\Storage;
use KwInfo\Vehicles\Vagonweb;

if (PHP_SAPI !== 'cli') {
    exit(1);
}
set_time_limit(0);

$options = getopt('', ['limit:', 'pause:']);
$limit = isset($options['limit']) ? max(1, (int) $options['limit']) : null;
$pauseSeconds = isset($options['pause']) ? max(0.0, (float) $options['pause']) : 3.0;
$pause = static function () use ($pauseSeconds): void {
    usleep((int) ($pauseSeconds * 1_000_000));
};
$log = static function (string $line): void {
    echo '[' . date('H:i:s') . '] ' . $line . PHP_EOL;
};

$lock = fopen(sys_get_temp_dir() . '/kw-fetch-vehicles.lock', 'c');
if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
    exit(0);
}

$file = Config::path('vehicles_file');
$imgDir = Config::path('vehicles_img_dir');
$old = Realtime::readJson($file);
$year = Vagonweb::timetableYear(time());

try {
    $list = Vagonweb::listTrains($year, $pause);
} catch (Throwable $e) {
    fwrite(STDERR, '[BŁĄD] lista pociągów: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
if ($list === []) {
    fwrite(STDERR, '[BŁĄD] vagonWEB nie zwrócił listy pociągów KW na ' . $year . ' — zostawiam poprzednie dane.' . PHP_EOL);
    exit(1);
}
$log('Pociągów na liście ' . $year . ': ' . count($list));
if ($limit !== null) {
    $list = array_slice($list, 0, $limit);
}

$trains = ($old['year'] ?? null) === $year ? ($old['trains'] ?? []) : [];
$images = $old['images'] ?? [];
$errors = 0;
$withVehicles = 0;
foreach ($list as $train) {
    $key = $train['number'] . '|' . $train['name'];
    $pause();
    try {
        $sightings = Vagonweb::parseTrain(Vagonweb::trainPage($train['number'], $train['name'], $year), $year);
    } catch (Throwable $e) {
        $errors++;
        $log('Błąd ' . $train['number'] . ': ' . $e->getMessage());
        continue;
    }
    if ($sightings === []) {
        unset($trains[$key]);
        continue;
    }
    $withVehicles++;
    $trains[$key] = [
        'number' => $train['number'],
        'name' => $train['name'],
        'url' => Vagonweb::trainUrl($train['number'], $train['name'], $year),
        'checkedAt' => date(DATE_ATOM),
        'sightings' => $sightings,
    ];
    foreach ($sightings as $sighting) {
        foreach ($sighting['vehicles'] as $vehicle) {
            $name = Vagonweb::imageFile($vehicle['image']);
            if ($name === null || isset($images[$name]) && is_file($imgDir . '/' . $name)) {
                continue;
            }
            if (!is_dir($imgDir)) {
                mkdir($imgDir, 0775, true);
            }
            $target = $imgDir . '/' . $name;
            try {
                $pause();
                $response = HttpClient::get(Vagonweb::imageUrl($vehicle['image']), [], 20, $target . '.tmp');
                $size = $response['status'] === 200 ? @getimagesize($target . '.tmp') : false;
                if ($size === false) {
                    throw new RuntimeException('HTTP ' . $response['status']);
                }
                rename($target . '.tmp', $target);
                $images[$name] = [$size[0], $size[1]];
                $log('Rysunek ' . $name . ' (' . $size[0] . '×' . $size[1] . ')');
            } catch (Throwable $e) {
                @unlink($target . '.tmp');
                $log('Błąd rysunku ' . $name . ': ' . $e->getMessage());
            }
        }
    }
}

Storage::writeJson($file, ['fetchedAt' => date(DATE_ATOM), 'year' => $year, 'trains' => $trains, 'images' => $images]);
$log('Zapisano: ' . count($trains) . ' pociągów ze składem (w tym przebiegu ' . $withVehicles . '), błędów: ' . $errors);
exit($errors > count($list) / 2 ? 1 : 0);
