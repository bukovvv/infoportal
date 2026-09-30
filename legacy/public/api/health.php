<?php

declare(strict_types=1);

require dirname(__DIR__, 2) . '/src/Database.php';
require dirname(__DIR__, 2) . '/src/KierownikPlusClient.php';

use KwInfo\Database;
use KwInfo\KierownikPlusClient;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');

$timezone = new DateTimeZone('Europe/Warsaw');
$now = new DateTimeImmutable('now', $timezone);
$checks = [];

try {
    $pdo = Database::connect();
    $noticeCount = (int) $pdo->query('SELECT COUNT(*) FROM notices')->fetchColumn();
    $checks['database'] = ['ok' => true, 'label' => 'Baza komunikatów', 'detail' => $noticeCount . ' zapisanych komunikatów'];
} catch (Throwable) {
    $checks['database'] = ['ok' => false, 'label' => 'Baza komunikatów', 'detail' => 'Brak zapisu do SQLite'];
}

$storage = dirname(__DIR__, 2) . '/storage';
$checks['storage'] = [
    'ok' => is_dir($storage) && is_writable($storage),
    'label' => 'Katalog danych',
    'detail' => is_dir($storage) && is_writable($storage) ? 'Zapis działa poprawnie' : 'Brak praw zapisu',
];

try {
    $feed = json_decode((string) file_get_contents(dirname(__DIR__) . '/data/kw_gtfs_routes.json'), true, 512, JSON_THROW_ON_ERROR);
    $validUntil = DateTimeImmutable::createFromFormat('!Ymd', (string) ($feed['validUntil'] ?? ''), $timezone);
    $days = $validUntil instanceof DateTimeImmutable ? (int) $now->setTime(0, 0)->diff($validUntil)->format('%r%a') : -1;
    $checks['gtfs'] = [
        'ok' => $days >= 0,
        'warning' => $days >= 0 && $days <= 14,
        'label' => 'Rozkład GTFS',
        'detail' => $validUntil instanceof DateTimeImmutable ? 'Ważny do ' . $validUntil->format('d.m.Y') . ' · ' . max(0, $days) . ' dni' : 'Brak daty ważności',
        'validUntil' => $validUntil?->format('Y-m-d'),
        'daysRemaining' => $days,
    ];
} catch (Throwable) {
    $checks['gtfs'] = ['ok' => false, 'label' => 'Rozkład GTFS', 'detail' => 'Nie można odczytać rozkładu'];
}

try {
    $gps = (new KierownikPlusClient())->trains(['west' => 14.0, 'south' => 50.5, 'east' => 19.8, 'north' => 54.0]);
    $checks['gps'] = ['ok' => true, 'label' => 'Kierownik Plus API', 'detail' => count($gps['trains']) . ' aktualnych pozycji GPS'];
} catch (Throwable) {
    $checks['gps'] = ['ok' => false, 'warning' => true, 'label' => 'Kierownik Plus API', 'detail' => 'API chwilowo nie odpowiada'];
}

$ok = count(array_filter($checks, static fn (array $check): bool => ($check['ok'] ?? false) === false && ($check['warning'] ?? false) === false)) === 0;
echo json_encode(['ok' => $ok, 'generatedAt' => $now->format(DATE_ATOM), 'checks' => $checks], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
