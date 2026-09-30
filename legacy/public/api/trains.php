<?php

declare(strict_types=1);

require dirname(__DIR__, 2) . '/src/KierownikPlusClient.php';

use KwInfo\KierownikPlusClient;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');

/** @return float */
function coordinate(string $name, float $fallback, float $minimum, float $maximum): float
{
    $value = filter_input(INPUT_GET, $name, FILTER_VALIDATE_FLOAT);
    if ($value === false || $value === null) {
        return $fallback;
    }

    return max($minimum, min($maximum, (float) $value));
}

$bounds = [
    'west' => coordinate('west', 14.0, 13.0, 20.0),
    'south' => coordinate('south', 50.5, 49.0, 55.0),
    'east' => coordinate('east', 19.8, 13.0, 20.0),
    'north' => coordinate('north', 54.0, 49.0, 55.0),
];

if ($bounds['west'] >= $bounds['east'] || $bounds['south'] >= $bounds['north']) {
    http_response_code(422);
    echo json_encode(['error' => 'Nieprawidłowy obszar mapy.'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    echo json_encode((new KierownikPlusClient())->trains($bounds), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
} catch (JsonException | RuntimeException $exception) {
    http_response_code(502);
    echo json_encode(['error' => $exception->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (Throwable) {
    http_response_code(500);
    echo json_encode(['error' => 'Nie udało się pobrać pozycji pociągów.'], JSON_UNESCAPED_UNICODE);
}
