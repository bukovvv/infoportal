<?php

declare(strict_types=1);

namespace KwInfo\Auth;

use KwInfo\Config;
use KwInfo\Http\ApiException;

/**
 * Logowanie administratora (sesja PHP + token CSRF w nagłówku X-CSRF-Token). Hasło: zmienna
 * KW_ADMIN_PASSWORD_HASH albo server/config/admin-password.php. Hasło demonstracyjne „kw-demo” działa
 * wyłącznie na lokalnym serwerze PHP (php -S na localhost).
 */
final class AdminAuth
{
    private const USERNAME = 'admin';
    private const DEVELOPMENT_PASSWORD_HASH = '$2y$12$wX86c7SNfoj4pnMJ7SklyereiN.7NLRjP3L7nx1pSIjDyJlxgBxY.';
    private const MAX_FAILURES = 8;
    private const FAILURE_WINDOW = 900;

    public static function start(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        session_name('kw_admin');
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/api/admin',
            'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
        session_start();
    }

    /** @return array{username: string, csrf: string} */
    public static function login(string $username, string $password): array
    {
        self::start();
        $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'cli');
        if (self::failures($ip) >= self::MAX_FAILURES) {
            throw new ApiException('Zbyt wiele nieudanych prób. Spróbuj ponownie za 15 minut.', 429);
        }
        $hash = self::passwordHash();
        if ($hash === null) {
            throw new ApiException('Logowanie wymaga konfiguracji hasła administratora na serwerze.', 503);
        }
        if (!hash_equals(self::USERNAME, trim($username)) || !password_verify($password, $hash)) {
            self::recordFailure($ip);
            usleep(400_000);
            throw new ApiException('Nieprawidłowa nazwa użytkownika lub hasło.', 401);
        }
        session_regenerate_id(true);
        $_SESSION['admin'] = true;
        $_SESSION['csrf'] = bin2hex(random_bytes(32));

        return ['username' => self::USERNAME, 'csrf' => $_SESSION['csrf']];
    }

    public static function logout(): void
    {
        self::start();
        $_SESSION = [];
        session_destroy();
    }

    /** @return array{username: string, csrf: string}|null */
    public static function session(): ?array
    {
        self::start();
        if (($_SESSION['admin'] ?? false) !== true) {
            return null;
        }
        $_SESSION['csrf'] ??= bin2hex(random_bytes(32));

        return ['username' => self::USERNAME, 'csrf' => (string) $_SESSION['csrf']];
    }

    public static function require(bool $mutating): void
    {
        if (self::session() === null) {
            throw new ApiException('Zaloguj się ponownie.', 401);
        }
        if ($mutating) {
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

    private static function failures(string $ip): int
    {
        $data = self::failureLog();
        $since = time() - self::FAILURE_WINDOW;

        return count(array_filter($data[$ip] ?? [], static fn (int $t): bool => $t > $since));
    }

    private static function recordFailure(string $ip): void
    {
        $data = self::failureLog();
        $since = time() - self::FAILURE_WINDOW;
        foreach ($data as $key => $times) {
            $data[$key] = array_values(array_filter($times, static fn (int $t): bool => $t > $since));
            if ($data[$key] === []) {
                unset($data[$key]);
            }
        }
        $data[$ip][] = time();
        @file_put_contents(Config::path('storage') . '/login-failures.json', json_encode($data), LOCK_EX);
    }

    /** @return array<string, array<int, int>> */
    private static function failureLog(): array
    {
        $file = Config::path('storage') . '/login-failures.json';

        return is_file($file) ? (json_decode((string) file_get_contents($file), true) ?: []) : [];
    }
}
