<?php

declare(strict_types=1);

namespace KwInfo;

final class AdminAuth
{
    private const USERNAME = 'admin';
    private const DEVELOPMENT_PASSWORD_HASH = '$2y$12$wX86c7SNfoj4pnMJ7SklyereiN.7NLRjP3L7nx1pSIjDyJlxgBxY.';

    public static function start(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        session_name('kw_infoportal_admin');
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/admin',
            'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
        session_start();
    }

    public static function login(string $username, string $password): bool
    {
        self::start();
        $hash = self::passwordHash();
        if ($hash === null || !hash_equals(self::USERNAME, trim($username)) || !password_verify($password, $hash)) {
            $_SESSION['login_attempts'] = (int) ($_SESSION['login_attempts'] ?? 0) + 1;
            return false;
        }

        session_regenerate_id(true);
        $_SESSION['admin'] = true;
        $_SESSION['login_attempts'] = 0;
        return true;
    }

    public static function logout(): void
    {
        self::start();
        $_SESSION = [];
        session_destroy();
    }

    public static function check(): bool
    {
        self::start();
        return ($_SESSION['admin'] ?? false) === true;
    }

    public static function csrfToken(): string
    {
        self::start();
        if (!isset($_SESSION['csrf'])) {
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
        }
        return (string) $_SESSION['csrf'];
    }

    public static function verifyCsrf(?string $token): bool
    {
        self::start();
        return is_string($token) && hash_equals((string) ($_SESSION['csrf'] ?? ''), $token);
    }

    public static function isLoginConfigured(): bool
    {
        return self::passwordHash() !== null;
    }

    private static function passwordHash(): ?string
    {
        $environmentHash = getenv('KW_ADMIN_PASSWORD_HASH');
        if (is_string($environmentHash) && trim($environmentHash) !== '') {
            return trim($environmentHash);
        }

        $configurationPath = dirname(__DIR__) . '/config/admin-password.php';
        if (is_file($configurationPath)) {
            $configuredHash = require $configurationPath;
            if (is_string($configuredHash) && trim($configuredHash) !== '') {
                return trim($configuredHash);
            }
        }

        $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
        $host = preg_replace('/:\d+$/', '', $host) ?: $host;
        if (PHP_SAPI === 'cli-server' && in_array($host, ['localhost', '127.0.0.1', '[::1]'], true)) {
            return self::DEVELOPMENT_PASSWORD_HASH;
        }

        return null;
    }
}
