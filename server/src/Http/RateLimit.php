<?php

declare(strict_types=1);

namespace KwInfo\Http;

use KwInfo\Config;

/**
 * Limit zapytań z jednego adresu IP (stałe okno czasu, liczniki w plikach storage/ratelimit pod blokadą).
 * Adres IP nie jest zapisywany wprost: nazwa pliku to skrót z adresu, nazwy limitu i losowej soli serwera.
 * Hosting ma własny limit serii zapytań; ten chroni najcięższe i zapisujące endpointy przed nadużyciem.
 */
final class RateLimit
{
    /** @var array<string, array{0: int, 1: int}> nazwa => [najwyżej zapytań, okno w sekundach] */
    public const LIMITS = [
        'api' => [300, 60],
        'search' => [60, 60],
        'push' => [30, 600],
    ];

    public static function hit(string $name, ?string $ip = null, ?int $now = null): void
    {
        $ip ??= (string) ($_SERVER['REMOTE_ADDR'] ?? '');
        if ($ip === '' || !isset(self::LIMITS[$name])) {
            return;
        }
        [$max, $window] = self::LIMITS[$name];
        $now ??= time();
        $dir = Config::path('storage') . '/ratelimit';
        if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
            return;
        }
        $slot = intdiv($now, $window);
        $handle = @fopen($dir . '/' . substr(hash('sha256', $name . '|' . $ip . '|' . self::salt($dir)), 0, 32), 'c+');
        if ($handle === false) {
            return;
        }
        flock($handle, LOCK_EX);
        [$savedSlot, $count] = array_map('intval', explode(' ', trim((string) stream_get_contents($handle))) + [0, 0]);
        $count = $savedSlot === $slot ? $count + 1 : 1;
        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, $slot . ' ' . $count);
        flock($handle, LOCK_UN);
        fclose($handle);
        if (random_int(1, 500) === 1) {
            self::cleanup($dir, $now);
        }
        if ($count > $max) {
            $retry = ($slot + 1) * $window - $now;
            throw new ApiException('Zbyt wiele zapytań. Spróbuj ponownie za chwilę.', 429, ['Retry-After' => (string) max(1, $retry)]);
        }
    }

    private static function salt(string $dir): string
    {
        $file = $dir . '/.salt';
        $salt = is_file($file) ? trim((string) file_get_contents($file)) : '';
        if ($salt === '') {
            $salt = bin2hex(random_bytes(16));
            @file_put_contents($file, $salt, LOCK_EX);
        }

        return $salt;
    }

    private static function cleanup(string $dir, int $now): void
    {
        foreach (glob($dir . '/*') ?: [] as $file) {
            if (filemtime($file) < $now - 86400) {
                @unlink($file);
            }
        }
    }
}
