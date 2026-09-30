<?php

declare(strict_types=1);

require dirname(__DIR__, 2) . '/src/GtfsRepository.php';

use KwInfo\GtfsRepository;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');

$from = trim((string) ($_GET['from'] ?? ''));
$to = trim((string) ($_GET['to'] ?? ''));
$date = trim((string) ($_GET['date'] ?? ''));
$time = trim((string) ($_GET['time'] ?? ''));

if (preg_match('/^[A-Za-z0-9_.:-]+$/', $from) !== 1 || preg_match('/^[A-Za-z0-9_.:-]+$/', $to) !== 1) {
    http_response_code(422);
    echo json_encode(['error' => 'Wybierz stację początkową i końcową.'], JSON_UNESCAPED_UNICODE);
    exit;
}
if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) !== 1 || preg_match('/^\d{2}:\d{2}$/', $time) !== 1) {
    http_response_code(422);
    echo json_encode(['error' => 'Podaj prawidłową datę i godzinę podróży.'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $repository = new GtfsRepository(dirname(__DIR__) . '/data/kw_gtfs_routes.json');
    echo json_encode($repository->connections($from, $to, $date, $time), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
} catch (RuntimeException $exception) {
    http_response_code(422);
    echo json_encode(['error' => $exception->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (Throwable) {
    http_response_code(500);
    echo json_encode(['error' => 'Nie udało się wyszukać połączeń.'], JSON_UNESCAPED_UNICODE);
}
