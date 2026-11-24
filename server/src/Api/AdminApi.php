<?php

declare(strict_types=1);

namespace KwInfo\Api;

use KwInfo\Auth\AdminAuth;
use KwInfo\Auth\AdminLog;
use KwInfo\Auth\AdminSecurity;
use KwInfo\Auth\Totp;
use KwInfo\Config;
use KwInfo\Gtfs\GtfsImporter;
use KwInfo\Http\ApiException;
use KwInfo\Http\FileResponse;
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

        $result = AdminAuth::login((string) ($body['username'] ?? ''), (string) ($body['password'] ?? ''), (string) ($body['code'] ?? ''));

        return new Response(['loggedIn' => !isset($result['twoFactor'])] + $result);
    }

    public function logoutAll(): Response
    {
        AdminAuth::require(true);
        AdminAuth::logoutAll();

        return new Response(['loggedIn' => false]);
    }

    public function security(): Response
    {
        AdminAuth::require(false);

        return new Response(AdminSecurity::status());
    }

    /** Krok 1 włączania kodu z aplikacji: nowy sekret (do wpisania w aplikacji) czeka w sesji na potwierdzenie kodem. */
    public function twoFactorSetup(): Response
    {
        AdminAuth::require(true);
        if (AdminSecurity::twoFactorEnabled()) {
            throw new ApiException('Kod z aplikacji jest już włączony.', 409);
        }
        $_SESSION['totp_pending'] = $secret = Totp::secret();

        return new Response(['secret' => $secret, 'uri' => Totp::uri($secret, 'admin', 'zanimwyjdziesz.pl')]);
    }

    /** Krok 2: kod z aplikacji potwierdza, że sekret jest dobrze wpisany; zwraca kody zapasowe (pokazywane raz). */
    public function twoFactorEnable(): Response
    {
        AdminAuth::require(true);
        $secret = (string) ($_SESSION['totp_pending'] ?? '');
        if ($secret === '') {
            throw new ApiException('Zacznij od nowa: kliknij „Włącz kod z aplikacji”.', 409);
        }
        $codes = AdminSecurity::enable($secret, (string) (Router::body()['code'] ?? ''), time());
        if ($codes === null) {
            throw new ApiException('Kod się nie zgadza. Sprawdź, czy klucz jest dobrze wpisany i czy zegar telefonu się nie spieszy.', 422);
        }
        unset($_SESSION['totp_pending']);
        AdminAuth::keepOnlyThisSession();
        AdminLog::write('2fa-enable');

        return new Response(['recoveryCodes' => $codes] + AdminSecurity::status());
    }

    public function twoFactorDisable(): Response
    {
        AdminAuth::require(true);
        $wait = AdminAuth::lockedFor(AdminAuth::ip());
        if ($wait > 0) {
            throw new ApiException('Zbyt wiele błędnych kodów. Spróbuj później.', 429, ['Retry-After' => (string) $wait]);
        }
        if (AdminSecurity::useCode((string) (Router::body()['code'] ?? ''), time()) === null) {
            AdminAuth::recordFailure(AdminAuth::ip());
            throw new ApiException('Nieprawidłowy albo już użyty kod.', 422);
        }
        AdminSecurity::disable();
        AdminLog::write('2fa-disable');

        return new Response(AdminSecurity::status());
    }

    /** Testowa wersja 2.0 (makieta „Tarcza” z server/v20) — tylko z sesją panelu; strona /v20 pokazuje ją w ramce. */
    public function v20(array $p): FileResponse
    {
        AdminAuth::require(false);
        $types = ['index.html' => 'text/html; charset=utf-8', 'app.js' => 'text/javascript; charset=utf-8', 'inter-latin.woff2' => 'font/woff2', 'inter-latin-ext.woff2' => 'font/woff2',
            // MapLibre (kopia z web/node_modules/maplibre-gl/dist — przy aktualizacji biblioteki podmienić)
            'maplibre-gl.mjs' => 'text/javascript; charset=utf-8', 'maplibre-gl-shared.mjs' => 'text/javascript; charset=utf-8', 'maplibre-gl-worker.mjs' => 'text/javascript; charset=utf-8', 'maplibre-gl.css' => 'text/css; charset=utf-8'];
        $type = $types[$p['file']] ?? throw new ApiException('Nie znaleziono pliku.', 404);

        return new FileResponse(dirname(__DIR__, 2) . '/v20/' . $p['file'], $type, 0, true);
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
        $notice = (new NoticeRepository())->save(Router::body());
        AdminLog::write('notice-create', $notice['id'], ['after' => self::logged($notice)]);

        return new Response($notice, 201);
    }

    public function updateNotice(array $p): Response
    {
        AdminAuth::require(true);
        $repo = new NoticeRepository();
        $id = self::id($p);
        $before = $repo->find($id);
        $notice = $repo->save(Router::body(), $id);
        AdminLog::write('notice-update', $id, ['before' => $before ? self::logged($before) : null, 'after' => self::logged($notice)]);

        return new Response($notice);
    }

    public function deleteNotice(array $p): Response
    {
        AdminAuth::require(true);
        $repo = new NoticeRepository();
        $id = self::id($p);
        $before = $repo->find($id);
        if (!$repo->delete($id)) {
            throw new ApiException('Nie znaleziono komunikatu. Lista mogła zostać odświeżona.', 404);
        }
        AdminLog::write('notice-delete', $id, ['before' => $before ? self::logged($before) : null]);

        return new Response(['deleted' => true]);
    }

    /** Dziennik panelu: logowania i zmiany komunikatów (ostatnie wpisy). */
    public function log(): Response
    {
        AdminAuth::require(false);

        return new Response(AdminLog::recent(150));
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
            'ops' => self::ops($storage),
        ]);
    }

    /** Utrzymanie: pobranie rozkładu, sprawdzanie feedu opóźnień, kopie bazy, alerty e-mail i błędy CRON-a. */
    private static function ops(string $storage): array
    {
        $json = static fn (string $file): array => is_file($file) ? (json_decode((string) file_get_contents($file), true) ?: []) : [];
        $iso = static fn (int|string|null $t): ?string => $t === null || $t === '' ? null : date(DATE_ATOM, is_int($t) ? $t : (int) strtotime($t));

        $download = $json($storage . '/gtfs-download.json');
        // stan wspólnego feedu GTFS-RT (RtFeed), nie dekodowania w regionie
        $rtMeta = $json($storage . '/rt-feed.json');
        $alert = $json($storage . '/alert-state.json');
        $backups = glob($storage . '/backups/*') ?: [];
        usort($backups, static fn (string $a, string $b): int => filemtime($b) <=> filemtime($a));
        $cronLog = $storage . '/cron-errors.log';
        $cronLines = [];
        if (is_file($cronLog) && filesize($cronLog) > 0) {
            $handle = fopen($cronLog, 'rb');
            fseek($handle, max(0, filesize($cronLog) - 4096));
            $cronLines = array_slice(array_values(array_filter(array_map('trim', explode("\n", (string) stream_get_contents($handle))))), -5);
            fclose($handle);
        }

        return [
            'gtfsSourceModifiedAt' => $iso($download['lastModified'] ?? null),
            'gtfsDownloadedAt' => $iso($download['downloadedAt'] ?? null),
            'rtCheckedAt' => $iso($rtMeta['checkedAt'] ?? null),
            'rtSourceModifiedAt' => $iso($rtMeta['lastModified'] ?? null),
            'backups' => [
                'count' => count($backups),
                'latestAt' => $backups ? $iso(filemtime($backups[0])) : null,
                'latestSize' => $backups ? filesize($backups[0]) : null,
            ],
            'alerts' => [
                'configured' => trim((string) Config::get('alert_email')) !== '',
                'problemSince' => $iso($alert['since'] ?? null),
                'alertedAt' => $iso($alert['alertedAt'] ?? null),
            ],
            'cronErrors' => [
                'modifiedAt' => is_file($cronLog) ? $iso(filemtime($cronLog)) : null,
                'lines' => $cronLines,
            ],
        ];
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
            AdminLog::write('import');
        } catch (Throwable $e) {
            AdminLog::write('import-failed');
            throw new ApiException('Import nie powiódł się: ' . $e->getMessage(), 502);
        }

        return new Response(['stats' => $stats, 'log' => $log]);
    }

    /** @param array<string, mixed> $n @return array<string, mixed> pola komunikatu zapisywane w dzienniku */
    private static function logged(array $n): array
    {
        return array_intersect_key($n, array_flip(['title', 'body', 'line', 'severity', 'trains', 'stations', 'lines', 'startsAt', 'endsAt', 'active']));
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
