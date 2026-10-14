<?php

declare(strict_types=1);

// Kontrola przed wdrożeniem i po nim: php server/bin/preflight.php

require dirname(__DIR__) . '/bootstrap.php';

use KwInfo\Auth\AdminAuth;
use KwInfo\Clock;
use KwInfo\Config;
use KwInfo\Gtfs\Timetable;
use KwInfo\Live\Realtime;
use KwInfo\Notices\NoticeRepository;
use KwInfo\Push\PushRepository;
use KwInfo\Push\WebPush;

$errors = [];
$warnings = [];
$line = static function (string $label, bool $ok, string $failure, bool $warnOnly = false) use (&$errors, &$warnings): void {
    echo ($ok ? '[OK]    ' : ($warnOnly ? '[UWAGA] ' : '[BŁĄD]  ')) . $label . PHP_EOL;
    if (!$ok) {
        $warnOnly ? $warnings[] = $failure : $errors[] = $failure;
    }
};

$line('PHP 8.1 lub nowszy (' . PHP_VERSION . ')', version_compare(PHP_VERSION, '8.1.0', '>='), 'Wymagany PHP 8.1+.');
foreach (['curl', 'pdo_sqlite', 'mbstring', 'json', 'openssl'] as $ext) {
    $line('Rozszerzenie ' . $ext, extension_loaded($ext), 'Brak rozszerzenia PHP ' . $ext . '.');
}
$line('Rozszerzenie zip (import rozkładu)', extension_loaded('zip'), 'Brak rozszerzenia zip — import użyje systemowego tar, jeśli jest dostępny.', true);

$root = dirname(__DIR__, 2);
// lokalnie public/, na hostingu DirectAdmin public_html/ obok server/
$public = $root . '/public';
foreach ([$root . '/public', $root . '/public_html', $root] as $candidate) {
    if (is_file($candidate . '/api/index.php')) {
        $public = $candidate;
        break;
    }
}
$publicName = basename($public);
foreach (['index.html', 'api/index.php', '.htaccess'] as $file) {
    $line("Plik {$publicName}/{$file}", is_file($public . '/' . $file), "Brak {$publicName}/{$file} — zbuduj frontend (npm run build) i wyślij cały katalog public.");
}
$line('Certyfikaty CA (server/config/cacert.pem)', is_file(Config::path('cacert')), 'Brak server/config/cacert.pem.', true);

$storage = Config::path('storage');
$writable = is_dir($storage) && is_writable($storage);
if ($writable) {
    $probe = $storage . '/.probe-' . bin2hex(random_bytes(3));
    $writable = @file_put_contents($probe, 'ok') !== false;
    @unlink($probe);
}
$line('Zapis do server/storage', $writable, 'Nadaj PHP prawo zapisu do server/storage.');

try {
    (new NoticeRepository())->all();
    $line('Baza komunikatów (app.sqlite)', true, '');
} catch (Throwable $e) {
    $line('Baza komunikatów (app.sqlite)', false, 'SQLite: ' . $e->getMessage());
}

try {
    $keys = WebPush::keys();
    $line('Powiadomienia push (klucze VAPID, obserwowane podróże: ' . (new PushRepository())->count() . ')', strlen(WebPush::unb64($keys['public'])) === 65, 'Nieprawidłowy klucz VAPID w server/storage/vapid.json.', true);
} catch (Throwable $e) {
    $line('Powiadomienia push', false, 'Powiadomienia nie zadziałają: ' . $e->getMessage(), true);
}

$line('Hasło administratora', AdminAuth::isConfigured() || PHP_SAPI === 'cli' && (getenv('KW_ADMIN_PASSWORD_HASH') || is_file(Config::path('root') . '/config/admin-password.php')),
    'Ustaw KW_ADMIN_PASSWORD_HASH albo utwórz server/config/admin-password.php (zob. DEPLOYMENT.md).');

try {
    $meta = (new Timetable())->meta();
    $daysLeft = (int) floor((strtotime($meta['validUntil']) - strtotime(Clock::isoDate(Clock::today()))) / 86400);
    $line("Rozkład zaimportowany ({$meta['trips']} kursów, ważny do {$meta['validUntil']})", $daysLeft >= 0, 'Rozkład wygasł — uruchom server/bin/import-gtfs.php.');
    $line('Rozkład aktualizowany w ostatnich 3 dniach', strtotime($meta['importedAt']) > time() - 3 * 86400, 'Sprawdź CRON z import-gtfs.php.', true);
} catch (Throwable $e) {
    $line('Rozkład zaimportowany', false, 'Uruchom: php server/bin/import-gtfs.php');
}

$live = Realtime::readJson(Config::path('live_file'));
$age = isset($live['generatedAt']) ? time() - strtotime((string) $live['generatedAt']) : null;
$line('Dane na żywo (live.json)' . ($age !== null ? " — {$age} s temu" : ''), $age !== null && $age < 300, 'Dodaj CRON z refresh-live.php co minutę.', true);
if ($age !== null) {
    if ($live['sources']['gps']['enabled'] ?? false) {
        $line('GPS: ' . ($live['sources']['gps']['provider'] ?? 'brak'), (bool) ($live['sources']['gps']['ok'] ?? false), 'GPS: ' . ($live['sources']['gps']['error'] ?? 'brak danych'), true);
    } else {
        echo "[INFO]  GPS wyłączony — pozycje wyliczane z rozkładu i opóźnień PLK" . PHP_EOL;
    }
    $line('GTFS-RT (opóźnienia PKP PLK)', (bool) ($live['sources']['rt']['ok'] ?? false), 'GTFS-RT: ' . ($live['sources']['rt']['error'] ?? 'brak danych'), true);
}

$backups = glob(Config::path('storage') . '/backups/app-*.sqlite') ?: [];
$newest = $backups === [] ? null : max(array_map('filemtime', $backups));
$line('Kopia bazy komunikatów' . ($newest ? ' — ' . date('Y-m-d H:i', $newest) . ', kopii: ' . count($backups) : ''), $newest !== null && $newest > time() - 2 * 86400,
    'Brak świeżej kopii app.sqlite — sprawdź CRON z backup-db.php.', true);

foreach ($warnings as $w) {
    echo '  · ' . $w . PHP_EOL;
}
if ($errors !== []) {
    echo PHP_EOL . 'Do poprawienia:' . PHP_EOL;
    foreach ($errors as $e) {
        echo '  - ' . $e . PHP_EOL;
    }
    exit(1);
}
echo PHP_EOL . 'Instalacja gotowa.' . PHP_EOL;
