<?php

declare(strict_types=1);

use KwInfo\Api\AdminApi;
use KwInfo\Api\PublicApi;
use KwInfo\Api\PushApi;
use KwInfo\Http\Router;

$api = new PublicApi();
$admin = new AdminApi();
$push = new PushApi();
$router = new Router();

$router->get('/stations', [$api, 'stations']);
$router->get('/stations/{id}', [$api, 'station']);
$router->get('/stations/{id}/board', [$api, 'board']);
$router->get('/connections', [$api, 'connections']);
$router->get('/trains', [$api, 'searchTrains']);
$router->get('/trains/{number}', [$api, 'trainByNumber']);
$router->get('/trips/{key}', [$api, 'trip']);
$router->get('/network', [$api, 'network']);
$router->get('/live', [$api, 'live']);
$router->get('/status', [$api, 'status']);
$router->get('/notices', [$api, 'notices']);
$router->get('/vehicles/img/{file}', [$api, 'vehicleImage']);
$router->get('/push/key', [$push, 'key']);
$router->post('/push/watch', [$push, 'watch']);
$router->post('/push/unwatch', [$push, 'unwatch']);
$router->post('/push/route-watch', [$push, 'watchRoute']);
$router->post('/push/route-unwatch', [$push, 'unwatchRoute']);

$router->get('/admin/session', [$admin, 'session']);
$router->post('/admin/login', [$admin, 'login']);
$router->post('/admin/logout', [$admin, 'logout']);
$router->get('/admin/notices', [$admin, 'notices']);
$router->post('/admin/notices', [$admin, 'createNotice']);
$router->put('/admin/notices/{id}', [$admin, 'updateNotice']);
$router->delete('/admin/notices/{id}', [$admin, 'deleteNotice']);
$router->get('/admin/health', [$admin, 'health']);
$router->post('/admin/import', [$admin, 'import']);

return $router;
