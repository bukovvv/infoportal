<?php

declare(strict_types=1);

namespace KwInfo\Auth;

use KwInfo\Config;
use KwInfo\Http\ApiException;

/**
 * Logowanie administratora (sesja PHP + token CSRF w nagłówku X-CSRF-Token). Hasło: zmienna
 * KW_ADMIN_PASSWORD_HASH albo server/config/admin-password.php. Hasło demonstracyjne „kw-demo” działa
 * wyłącznie na lokalnym serwerze PHP (php -S na localhost).
 *
 * Ochrona: ciasteczko HttpOnly + Secure + SameSite=Strict tylko dla /api/admin, sesje w storage/sessions
 * (nie we wspólnym /tmp hostingu), wygasanie po bezczynności i po czasie od zalogowania, sprawdzanie
 * nagłówka Origin przy zmianach, blokada po nieudanych logowaniach (z jednego adresu i łącznie).
 */
final class AdminAuth
{
    private const USERNAME = 'admin';
    private const DEVELOPMENT_PASSWORD_HASH = '$2y$12$wX86c7SNfoj4pnMJ7SklyereiN.7NLRjP3L7nx1pSIjDyJlxgBxY.';
    private const COOKIE = 'kw_admin';
    /** nieudane logowania z jednego adresu IP w oknie FAILURE_WINDOW */
    public const MAX_FAILURES = 5;
    /** nieudane logowania łącznie (z wielu adresów) w oknie FAILURE_WINDOW */
    public const MAX_FAILURES_TOTAL = 40;
    public const FAILURE_WINDOW = 900;
    private const IDLE_TIMEOUT = 2 * 3600;
    private const MAX_LIFETIME = 12 * 3600;

    public static function start(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        $dir = Config::path('storage') . '/sessions';
        if (!is_dir($dir)) {
            @mkdir($dir, 0700, true);
        }
        if (is_dir($dir) && is_writable($dir)) {
            session_save_path($dir);
            ini_set('session.gc_maxlifetime', (string) self::MAX_LIFETIME);
            ini_set('session.gc_probability', '1');
            ini_set('session.gc_divisor', '50');
        }
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.use_trans_sid', '0');
        session_name(self::COOKIE);
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/api/admin',
            'secure' => PHP_SAPI !== 'cli-server' || (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
        session_start();
    }

    /** @return array{username: string, csrf: string} */
    public static function login(string $username, string $password): array
    {
        self::checkOrigin();
        $ip = self::ip();
        [$fromIp, $total] = self::failures($ip);
        if ($fromIp >= self::MAX_FAILURES || $total >= self::MAX_FAILURES_TOTAL) {
            AdminLog::write('login-blocked', null, ['username' => mb_substr(trim($username), 0, 40)]);
            throw new ApiException('Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za 15 minut.', 429, ['Retry-After' => (string) self::FAILURE_WINDOW]);
        }
        $hash = self::passwordHash();
        if ($hash === null) {
            throw new ApiException('Logowanie wymaga konfiguracji hasła administratora na serwerze.', 503);
        }
        if (!hash_equals(self::USERNAME, trim($username)) || !password_verify($password, $hash)) {
            self::recordFailure($ip);
            AdminLog::write('login-failed', null, ['username' => mb_substr(trim($username), 0, 40)]);
            usleep(400_000);
            throw new ApiException('Nieprawidłowa nazwa użytkownika lub hasło.', 401);
        }
        self::start();
        session_regenerate_id(true);
        $_SESSION = [
            'admin' => true,
            'csrf' => bin2hex(random_bytes(32)),
            'since' => time(),
            'seen' => time(),
        ];
        AdminLog::write('login');

        return ['username' => self::USERNAME, 'csrf' => $_SESSION['csrf']];
    }

    public static function logout(): void
    {
        self::checkOrigin();
        if (self::session() !== null) {
            AdminLog::write('logout');
        }
        if (session_status() !== PHP_SESSION_ACTIVE) {
            return;
        }
        $_SESSION = [];
        session_destroy();
        setcookie(self::COOKIE, '', ['expires' => 1, 'path' => '/api/admin', 'secure' => PHP_SAPI !== 'cli-server', 'httponly' => true, 'samesite' => 'Strict']);
    }

    /** @return array{username: string, csrf: string}|null */
    public static function session(): ?array
    {
        // bez ciasteczka nie zakładamy sesji (odwiedzający /admin nie zostawiają plików na serwerze)
        if (session_status() !== PHP_SESSION_ACTIVE && !isset($_COOKIE[self::COOKIE])) {
            return null;
        }
        self::start();
        if (($_SESSION['admin'] ?? false) !== true) {
            return null;
        }
        $now = time();
        if ($now - (int) ($_SESSION['seen'] ?? 0) > self::IDLE_TIMEOUT || $now - (int) ($_SESSION['since'] ?? 0) > self::MAX_LIFETIME) {
            $_SESSION = [];
            session_destroy();
            return null;
        }
        $_SESSION['seen'] = $now;
        $_SESSION['csrf'] ??= bin2hex(random_bytes(32));

        return ['username' => self::USERNAME, 'csrf' => (string) $_SESSION['csrf']];
    }

    public static function require(bool $mutating): void
    {
        if (self::session() === null) {
            throw new ApiException('Zaloguj się ponownie.', 401);
        }
        if ($mutating) {
            self::checkOrigin();
            $token = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
            if ($token === '' || !hash_equals((string) $_SESSION['csrf'], $token)) {
                throw new ApiException('Sesja formularza wygasła. Odśwież stronę i spróbuj ponownie.', 419);
            }
        }
    }

    public static function isConfigured(): bool
    {
        return self::passwordHash() !== null;
    }

    public static function ip(): string
    {
        return (string) ($_SERVER['REMOTE_ADDR'] ?? 'cli');
    }

    /** Żądanie zmieniające dane musi przyjść z tej samej strony (Origin, gdy przeglądarka go wysyła, = własny host). */
    private static function checkOrigin(): void
    {
        $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
        if ($origin === '') {
            return;
        }
        $parts = parse_url($origin) ?: [];
        $from = strtolower(($parts['host'] ?? '') . (isset($parts['port']) ? ':' . $parts['port'] : ''));
        // lokalnie proxy Vite (5173) podmienia Host na adres php -S (8080)
        $local = PHP_SAPI === 'cli-server' && in_array($parts['host'] ?? '', ['localhost', '127.0.0.1'], true);
        if ($from !== strtolower((string) ($_SERVER['HTTP_HOST'] ?? '')) && !$local) {
            throw new ApiException('Żądanie z innej strony zostało odrzucone.', 403);
        }
    }

    private static function passwordHash(): ?string
    {
        $env = getenv('KW_ADMIN_PASSWORD_HASH');
        if (is_string($env) && trim($env) !== '') {
            return trim($env);
        }
        $file = Config::path('root') . '/config/admin-password.php';
        if (is_file($file)) {
            $hash = require $file;
            if (is_string($hash) && trim($hash) !== '') {
                return trim($hash);
            }
        }
        $host = preg_replace('/:\d+$/', '', strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''))) ?: '';
        if (PHP_SAPI === 'cli-server' && in_array($host, ['localhost', '127.0.0.1', '[::1]'], true)) {
            return self::DEVELOPMENT_PASSWORD_HASH;
        }

        return null;
    }

    /** @return array{0: int, 1: int} nieudane próby z adresu i łącznie w oknie */
    public static function failures(string $ip): array
    {
        $data = self::failureLog(static fn (array $d): array => $d);
        $since = time() - self::FAILURE_WINDOW;
        $count = static fn (array $times): int => count(array_filter($times, static fn (int $t): bool => $t > $since));
        $total = 0;
        foreach ($data as $times) {
            $total += $count($times);
        }

        return [$count($data[$ip] ?? []), $total];
    }

    public static function recordFailure(string $ip): void
    {
        $since = time() - self::FAILURE_WINDOW;
        self::failureLog(static function (array $data) use ($ip, $since): array {
            foreach ($data as $key => $times) {
                $data[$key] = array_values(array_filter($times, static fn (int $t): bool => $t > $since));
                if ($data[$key] === []) {
                    unset($data[$key]);
                }
            }
            $data[$ip][] = time();

            return $data;
        }, true);
    }

    /**
     * Odczyt (i zapis, gdy $write) dziennika nieudanych prób pod blokadą pliku.
     * @param callable(array<string, array<int, int>>): array<string, array<int, int>> $change
     * @return array<string, array<int, int>>
     */
    private static function failureLog(callable $change, bool $write = false): array
    {
        $file = Config::path('storage') . '/login-failures.json';
        $handle = @fopen($file, 'c+');
        if ($handle === false) {
            return [];
        }
        flock($handle, $write ? LOCK_EX : LOCK_SH);
        $data = json_decode((string) stream_get_contents($handle), true);
        $data = $change(is_array($data) ? $data : []);
        if ($write) {
            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, (string) json_encode($data));
            fflush($handle);
        }
        flock($handle, LOCK_UN);
        fclose($handle);

        return $data;
    }
}
