<?php

declare(strict_types=1);

require dirname(__DIR__, 2) . '/src/GtfsRepository.php';

use KwInfo\GtfsRepository;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');

$stationId = trim((string) ($_GET['station'] ?? ''));
$limit = filter_input(INPUT_GET, 'limit', FILTER_VALIDATE_INT) ?: 10;
if ($stationId === '' || preg_match('/^[A-Za-z0-9_.:-]+$/', $stationId) !== 1) {
    http_response_code(422);
    echo json_encode(['error' => 'Wybierz prawidłową stację.'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $repository = new GtfsRepository(dirname(__DIR__) . '/data/kw_gtfs_routes.json');
    echo json_encode($repository->upcomingDepartures($stationId, $limit), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
} catch (RuntimeException $exception) {
    http_response_code(404);
    echo json_encode(['error' => $exception->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (Throwable) {
    http_response_code(500);
    echo json_encode(['error' => 'Nie udało się pobrać odjazdów.'], JSON_UNESCAPED_UNICODE);
}
