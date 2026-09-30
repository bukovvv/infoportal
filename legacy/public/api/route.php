<?php

declare(strict_types=1);

require dirname(__DIR__, 2) . '/src/GtfsRepository.php';
require dirname(__DIR__, 2) . '/src/KoleoRouteClient.php';

use KwInfo\GtfsRepository;
use KwInfo\KoleoRouteClient;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');

$number = trim((string) ($_GET['train'] ?? ''));
if (preg_match('/^\d{3,6}$/', $number) !== 1) {
    http_response_code(422);
    echo json_encode(['error' => 'Podaj prawidłowy numer pociągu.'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $repository = new GtfsRepository(dirname(__DIR__) . '/data/kw_gtfs_routes.json');
    try {
        $route = $repository->route($number);
    } catch (RuntimeException $primaryError) {
        $lat = filter_input(INPUT_GET, 'lat', FILTER_VALIDATE_FLOAT);
        $lon = filter_input(INPUT_GET, 'lon', FILTER_VALIDATE_FLOAT);
        if ($lat === false || $lat === null || $lon === false || $lon === null) {
            throw $primaryError;
        }
        $client = new KoleoRouteClient(
            dirname(__DIR__) . '/data/koleo_stations.json',
            dirname(__DIR__) . '/data/kw_gtfs_routes.json',
            dirname(__DIR__, 2) . '/config/cacert.pem'
        );
        $route = $client->route($number, (float) $lat, (float) $lon);
    }
    echo json_encode($route, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
} catch (RuntimeException $exception) {
    http_response_code(404);
    echo json_encode(['error' => $exception->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (Throwable) {
    http_response_code(500);
    echo json_encode(['error' => 'Nie udało się odczytać trasy pociągu.'], JSON_UNESCAPED_UNICODE);
}
