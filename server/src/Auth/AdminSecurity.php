<?php

declare(strict_types=1);

namespace KwInfo\Auth;

use KwInfo\Config;

/**
 * Ustawienia bezpieczeństwa konta admina w storage/admin-security.json (poza WWW, zostaje przy wdrożeniu):
 * kod z aplikacji (sekret TOTP, ostatni użyty krok, skróty kodów zapasowych) i numer „pokolenia” sesji —
 * „Wyloguj wszędzie” go podbija, a sesje z innym numerem przestają działać.
 */
final class AdminSecurity
{
    public const RECOVERY_CODES = 8;
    private const RECOVERY_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
    private static ?string $file = null;

    /** Inny plik (selftest). */
    public static function useFile(?string $file): void
    {
        self::$file = $file;
    }

    public static function twoFactorEnabled(): bool
    {
        return isset(self::read()['totp']['secret']);
    }

    /** @return array{twoFactor: bool, recoveryLeft: int, since: ?int} */
    public static function status(): array
    {
        $t = self::read()['totp'] ?? null;

        return ['twoFactor' => $t !== null, 'recoveryLeft' => count($t['recovery'] ?? []), 'since' => $t['since'] ?? null];
    }

    /**
     * Włącza kod z aplikacji, gdy $code pasuje do $secret. Zwraca kody zapasowe (pokazywane raz) albo null.
     * @return list<string>|null
     */
    public static function enable(string $secret, string $code, int $time): ?array
    {
        $step = Totp::verify($secret, $code, $time);
        if ($step === null) {
            return null;
        }
        $codes = [];
        for ($i = 0; $i < self::RECOVERY_CODES; $i++) {
            $c = '';
            for ($j = 0; $j < 8; $j++) {
                $c .= self::RECOVERY_ALPHABET[random_int(0, strlen(self::RECOVERY_ALPHABET) - 1)];
            }
            $codes[] = substr($c, 0, 4) . '-' . substr($c, 4);
        }
        self::update(static function (array $d) use ($secret, $step, $codes, $time): array {
            $d['totp'] = ['secret' => $secret, 'lastStep' => $step, 'since' => $time,
                'recovery' => array_map(static fn (string $c): string => hash('sha256', $c), $codes)];

            return $d;
        });

        return $codes;
    }

    public static function disable(): void
    {
        self::update(static function (array $d): array {
            unset($d['totp']);

            return $d;
        });
    }

    /**
     * Sprawdza kod z aplikacji albo kod zapasowy i od razu go „zużywa” (ten sam kod nie zadziała drugi raz).
     * @return 'totp'|'recovery'|null
     */
    public static function useCode(string $code, int $time): ?string
    {
        $result = null;
        self::update(static function (array $d) use ($code, $time, &$result): array {
            $t = $d['totp'] ?? null;
            if ($t === null) {
                return $d;
            }
            $step = Totp::verify($t['secret'], $code, $time, (int) ($t['lastStep'] ?? -1));
            if ($step !== null) {
                $d['totp']['lastStep'] = $step;
                $result = 'totp';

                return $d;
            }
            // kod zapasowy: xxxx-xxxx (kreska i wielkość liter bez znaczenia)
            $plain = strtolower(preg_replace('/[^a-z0-9]/i', '', $code) ?? '');
            $hash = strlen($plain) === 8 ? hash('sha256', substr($plain, 0, 4) . '-' . substr($plain, 4)) : '';
            foreach ($t['recovery'] ?? [] as $i => $h) {
                if ($hash !== '' && hash_equals($h, $hash)) {
                    array_splice($d['totp']['recovery'], $i, 1);
                    $result = 'recovery';

                    return $d;
                }
            }

            return $d;
        });

        return $result;
    }

    public static function generation(): int
    {
        return (int) (self::read()['generation'] ?? 0);
    }

    /** Kończy wszystkie sesje admina; zwraca nowy numer pokolenia. */
    public static function bumpGeneration(): int
    {
        $gen = 0;
        self::update(static function (array $d) use (&$gen): array {
            $d['generation'] = $gen = (int) ($d['generation'] ?? 0) + 1;

            return $d;
        });

        return $gen;
    }

    /** @return array<string, mixed> */
    private static function read(): array
    {
        return self::update(null);
    }

    /**
     * Odczyt (i zapis, gdy podano $change) pod blokadą pliku.
     * @param (callable(array<string, mixed>): array<string, mixed>)|null $change
     * @return array<string, mixed>
     */
    private static function update(?callable $change): array
    {
        $file = self::$file ?? Config::path('storage') . '/admin-security.json';
        $handle = @fopen($file, 'c+');
        if ($handle === false) {
            return [];
        }
        flock($handle, $change ? LOCK_EX : LOCK_SH);
        $data = json_decode((string) stream_get_contents($handle), true);
        $data = is_array($data) ? $data : [];
        if ($change) {
            $data = $change($data);
            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, (string) json_encode($data, JSON_PRETTY_PRINT));
            fflush($handle);
        }
        flock($handle, LOCK_UN);
        fclose($handle);
        @chmod($file, 0600);

        return $data;
    }
}
