<?php

declare(strict_types=1);

header_remove('X-Powered-By'); // expose_php w .user.ini nie działa (ustawienie tylko dla całego serwera)

// Front controller API. Katalog server/ leży obok public/ (zalecane) albo wewnątrz katalogu dokumentów
// (hosting bez zmiany docroot — wtedy chroniony przez .htaccess).
$server = getenv('KW_SERVER_DIR') ?: null;
foreach ([dirname(__DIR__, 2) . '/server', dirname(__DIR__) . '/server'] as $candidate) {
    if ($server === null && is_file($candidate . '/bootstrap.php')) {
        $server = $candidate;
    }
}
if ($server === null) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"error":"Brak katalogu server/."}';
    exit;
}

require $server . '/bootstrap.php';

$path = (string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
$path = preg_replace('#^.*?/api(?=/|$)#', '', $path) ?? '/';
// region inny niż domyślny: /api/malopolska/stations → /stations z danymi Małopolski
if (preg_match('#^/([a-z]+)(?=/|$)#', $path, $m) === 1 && $m[1] !== KwInfo\Config::DEFAULT_REGION && KwInfo\Config::isRegion($m[1])) {
    KwInfo\Config::useRegion($m[1]);
    $path = substr($path, strlen($m[0])) ?: '/';
}
/** @var KwInfo\Http\Router $router */
$router = require $server . '/routes.php';
$router->dispatch((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'), $path)->send();
