<?php

declare(strict_types=1);

namespace KwInfo\Api;

use KwInfo\Auth\AdminAuth;
use KwInfo\Config;
use KwInfo\Gtfs\GtfsImporter;
use KwInfo\Http\ApiException;
use KwInfo\Http\Response;
use KwInfo\Http\Router;
use KwInfo\Notices\NoticeRepository;
use Throwable;

final class AdminApi
{
    public function session(): Response
    {
        $session = AdminAuth::session();

        return new Response(['loggedIn' => $session !== null, 'configured' => AdminAuth::isConfigured()] + ($session ?? []));
    }

    public function login(): Response
    {
        $body = Router::body();

        return new Response(['loggedIn' => true] + AdminAuth::login((string) ($body['username'] ?? ''), (string) ($body['password'] ?? '')));
    }

    public function logout(): Response
    {
        AdminAuth::logout();

        return new Response(['loggedIn' => false]);
    }

    public function notices(): Response
    {
        AdminAuth::require(false);

        return new Response((new NoticeRepository())->all());
    }

    public function createNotice(): Response
    {
        AdminAuth::require(true);

        return new Response((new NoticeRepository())->save(Router::body()), 201);
    }

    public function updateNotice(array $p): Response
    {
        AdminAuth::require(true);

        return new Response((new NoticeRepository())->save(Router::body(), self::id($p)));
    }

    public function deleteNotice(array $p): Response
    {
        AdminAuth::require(true);
        if (!(new NoticeRepository())->delete(self::id($p))) {
            throw new ApiException('Nie znaleziono komunikatu. Lista mogła zostać odświeżona.', 404);
        }

        return new Response(['deleted' => true]);
    }

    public function health(): Response
    {
        AdminAuth::require(false);
        $storage = Config::path('storage');
        $files = [];
        foreach (['gtfs_db', 'live_file', 'rt_file', 'app_db'] as $key) {
            $path = Config::path($key);
            $files[basename($path)] = is_file($path) ? ['size' => filesize($path), 'modifiedAt' => date(DATE_ATOM, (int) filemtime($path))] : null;
        }

        return new Response(StatusService::build() + [
            'server' => [
                'php' => PHP_VERSION,
                'extensions' => array_combine(['curl', 'pdo_sqlite', 'zip', 'mbstring'], array_map('extension_loaded', ['curl', 'pdo_sqlite', 'zip', 'mbstring'])),
                'storageWritable' => is_writable($storage),
                'passwordConfigured' => AdminAuth::isConfigured(),
                'files' => $files,
            ],
        ]);
    }

    public function import(): Response
    {
        AdminAuth::require(true);
        set_time_limit(300);
        ini_set('memory_limit', '512M');
        $log = [];
        try {
            $stats = (new GtfsImporter(static function (string $line) use (&$log): void {
                $log[] = $line;
            }))->run(force: true);
        } catch (Throwable $e) {
            throw new ApiException('Import nie powiódł się: ' . $e->getMessage(), 502);
        }

        return new Response(['stats' => $stats, 'log' => $log]);
    }

    private static function id(array $p): int
    {
        $id = filter_var($p['id'] ?? null, FILTER_VALIDATE_INT);
        if ($id === false || $id < 1) {
            throw new ApiException('Nieprawidłowy identyfikator komunikatu.', 422);
        }

        return $id;
    }
}
