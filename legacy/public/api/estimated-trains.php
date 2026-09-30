<?php

declare(strict_types=1);

require dirname(__DIR__, 2) . '/src/GtfsRepository.php';

use KwInfo\GtfsRepository;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');

try {
    $repository = new GtfsRepository(dirname(__DIR__) . '/data/kw_gtfs_routes.json');
    echo json_encode($repository->estimatedPositions(), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
} catch (RuntimeException $exception) {
    http_response_code(503);
    echo json_encode(['error' => $exception->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (Throwable) {
    http_response_code(500);
    echo json_encode(['error' => 'Nie udało się wyliczyć pozycji estymowanych.'], JSON_UNESCAPED_UNICODE);
}
