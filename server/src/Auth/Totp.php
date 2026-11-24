<?php

declare(strict_types=1);

namespace KwInfo\Auth;

/** Kody jednorazowe z aplikacji (TOTP, RFC 6238): SHA-1, 6 cyfr, co 30 s — tak liczą Google Authenticator, Aegis, 1Password. */
final class Totp
{
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    private const PERIOD = 30;

    /** Nowy sekret (160 bitów) w base32, jak go wpisuje się do aplikacji. */
    public static function secret(): string
    {
        return self::base32(random_bytes(20));
    }

    public static function code(string $secret, int $step): string
    {
        $hmac = hash_hmac('sha1', pack('J', $step), self::unbase32($secret), true);
        $offset = ord($hmac[19]) & 0x0f;
        $value = (unpack('N', substr($hmac, $offset, 4))[1] & 0x7fffffff) % 1_000_000;

        return str_pad((string) $value, 6, '0', STR_PAD_LEFT);
    }

    public static function step(int $time): int
    {
        return intdiv($time, self::PERIOD);
    }

    /**
     * Krok czasu, do którego pasuje kod (±30 s na rozjechany zegar telefonu), albo null.
     * Kod z kroku ≤ $lastStep jest odrzucany — ten sam kod nie zaloguje drugi raz.
     */
    public static function verify(string $secret, string $code, int $time, int $lastStep = -1): ?int
    {
        $code = preg_replace('/\s+/', '', $code) ?? '';
        if (!preg_match('/^\d{6}$/', $code)) {
            return null;
        }
        $now = self::step($time);
        foreach ([$now, $now - 1, $now + 1] as $step) {
            if ($step > $lastStep && hash_equals(self::code($secret, $step), $code)) {
                return $step;
            }
        }

        return null;
    }

    /** Adres otpauth:// — na telefonie otwiera aplikację z kodami i dodaje konto. */
    public static function uri(string $secret, string $account, string $issuer): string
    {
        return 'otpauth://totp/' . rawurlencode($issuer . ':' . $account) . '?' . http_build_query(['secret' => $secret, 'issuer' => $issuer, 'digits' => 6, 'period' => self::PERIOD], '', '&', PHP_QUERY_RFC3986);
    }

    public static function base32(string $bytes): string
    {
        $bits = '';
        foreach (str_split($bytes) as $c) {
            $bits .= str_pad(decbin(ord($c)), 8, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 5) as $chunk) {
            $out .= self::ALPHABET[bindec(str_pad($chunk, 5, '0'))];
        }

        return $out;
    }

    public static function unbase32(string $text): string
    {
        $bits = '';
        foreach (str_split(strtoupper(preg_replace('/[\s=]/', '', $text) ?? '')) as $c) {
            $i = strpos(self::ALPHABET, $c);
            if ($i !== false) {
                $bits .= str_pad(decbin($i), 5, '0', STR_PAD_LEFT);
            }
        }
        $out = '';
        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) === 8) {
                $out .= chr(bindec($byte));
            }
        }

        return $out;
    }
}
