<?php

declare(strict_types=1);

use KwInfo\Database;
use KwInfo\KierownikPlusClient;

require dirname(__DIR__) . '/src/Database.php';
require dirname(__DIR__) . '/src/KierownikPlusClient.php';

$root = dirname(__DIR__);
$errors = [];
$warnings = [];

function result(string $label, bool $success, string $failure, array &$errors): void
{
    echo ($success ? '[OK]    ' : '[BŁĄD] ') . $label . PHP_EOL;
    if (!$success) {
        $errors[] = $failure;
    }
}

result('PHP 8.1 lub nowszy (' . PHP_VERSION . ')', version_compare(PHP_VERSION, '8.1.0', '>='), 'Hosting wymaga PHP 8.1 lub nowszego.', $errors);
foreach (['curl', 'pdo_sqlite', 'mbstring', 'json', 'openssl'] as $extension) {
    result('Rozszerzenie PHP: ' . $extension, extension_loaded($extension), 'Brak rozszerzenia PHP ' . $extension . '.', $errors);
}

$requiredFiles = [
    'public/assets/app.css',
    'public/assets/app.js',
    'public/assets/vendor/bootstrap/bootstrap.min.css',
    'public/assets/vendor/bootstrap/bootstrap.bundle.min.js',
    'public/assets/vendor/bootstrap-icons/bootstrap-icons.min.css',
    'public/assets/vendor/leaflet/leaflet.css',
    'public/assets/vendor/leaflet/leaflet.js',
    'public/data/kw_gtfs_routes.json',
    'public/data/koleo_stations.json',
    'config/cacert.pem',
];
foreach ($requiredFiles as $relativePath) {
    result('Plik: ' . $relativePath, is_file($root . '/' . $relativePath), 'Brak pliku ' . $relativePath . '.', $errors);
}

$storage = $root . '/storage';
$storageReady = is_dir($storage) && is_writable($storage);
if ($storageReady) {
    $probe = $storage . '/.write-test-' . bin2hex(random_bytes(4));
    $storageReady = file_put_contents($probe, 'ok') !== false;
    if (is_file($probe)) {
        unlink($probe);
    }
}
result('Katalog storage jest zapisywalny', $storageReady, 'Nadaj PHP prawo zapisu do katalogu storage.', $errors);

try {
    $pdo = Database::connect();
    $pdo->query('SELECT COUNT(*) FROM notices')->fetchColumn();
    result('Baza SQLite działa', true, '', $errors);
} catch (Throwable $exception) {
    result('Baza SQLite działa', false, 'SQLite: ' . $exception->getMessage(), $errors);
}

$environmentHash = getenv('KW_ADMIN_PASSWORD_HASH');
$passwordFile = $root . '/config/admin-password.php';
$passwordConfigured = is_string($environmentHash) && trim($environmentHash) !== '';
if (!$passwordConfigured && is_file($passwordFile)) {
    $configuredHash = require $passwordFile;
    $passwordConfigured = is_string($configuredHash) && str_starts_with($configuredHash, '$');
}
result('Produkcyjne hasło administratora', $passwordConfigured, 'Ustaw KW_ADMIN_PASSWORD_HASH albo utwórz config/admin-password.php.', $errors);

try {
    $feed = json_decode((string) file_get_contents($root . '/public/data/kw_gtfs_routes.json'), true, 512, JSON_THROW_ON_ERROR);
    $validUntil = DateTimeImmutable::createFromFormat('!Ymd', (string) ($feed['validUntil'] ?? ''), new DateTimeZone('Europe/Warsaw'));
    $today = new DateTimeImmutable('today', new DateTimeZone('Europe/Warsaw'));
    $gtfsValid = $validUntil instanceof DateTimeImmutable && $validUntil >= $today;
    result('GTFS ważny do ' . ($validUntil?->format('d.m.Y') ?? 'nieznanej daty'), $gtfsValid, 'Rozkład GTFS jest nieważny lub nie ma daty ważności.', $errors);
    if ($gtfsValid && $today->diff($validUntil)->days <= 14) {
        $warnings[] = 'GTFS wygaśnie w ciągu ' . $today->diff($validUntil)->days . ' dni — podmień plik przed tą datą.';
    }
} catch (Throwable $exception) {
    result('Plik GTFS można odczytać', false, 'GTFS: ' . $exception->getMessage(), $errors);
}

try {
    $payload = (new KierownikPlusClient())->trains(['west' => 14.0, 'south' => 50.5, 'east' => 19.8, 'north' => 54.0]);
    echo '[OK]    Kierownik Plus API odpowiada (' . count($payload['trains']) . ' pozycji)' . PHP_EOL;
} catch (Throwable $exception) {
    echo '[UWAGA] Kierownik Plus API: ' . $exception->getMessage() . PHP_EOL;
    $warnings[] = 'Hosting musi zezwalać na wychodzące połączenia HTTPS do Kierownik Plus API.';
}

foreach ($warnings as $warning) {
    echo '[UWAGA] ' . $warning . PHP_EOL;
}

if ($errors !== []) {
    echo PHP_EOL . 'Wdrożenie zablokowane:' . PHP_EOL;
    foreach ($errors as $error) {
        echo ' - ' . $error . PHP_EOL;
    }
    exit(1);
}

echo PHP_EOL . 'Projekt spełnia wymagania wdrożeniowe.' . PHP_EOL;
