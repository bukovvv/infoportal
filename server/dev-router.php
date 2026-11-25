<?php

declare(strict_types=1);

// Router dla wbudowanego serwera PHP (odpowiednik public/.htaccess):
//   php -S localhost:8080 -t public server/dev-router.php

$public = dirname(__DIR__) . '/public';
$path = (string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);

if (str_starts_with($path, '/api/') || $path === '/api' || $path === '/sitemap.xml') {
    require $public . '/api/index.php';
    return true;
}
if ($path !== '/' && is_file($public . $path)) {
    return false;
}
if ($path !== '/' && is_file($public . rtrim($path, '/') . '/index.html')) {
    readfile($public . rtrim($path, '/') . '/index.html'); // katalog z index.html (np. /v20/), jak DirectoryIndex
    return true;
}
if (preg_match('#^/v2(/|$)#', $path) && is_file($public . '/v2/index.html')) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($public . '/v2/index.html'); // wersja 2.0 (vue-router pod /v2), jak reguła w .htaccess
    return true;
}
if (is_file($public . '/index.html')) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($public . '/index.html');
    return true;
}
http_response_code(404);
echo 'Brak zbudowanego frontendu. Uruchom: npm run build (w katalogu web/) albo npm run dev.';
return true;
