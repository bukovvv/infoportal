<?php

declare(strict_types=1);

namespace KwInfo\Push;

use KwInfo\Config;
use KwInfo\Storage;
use OpenSSLAsymmetricKey;
use RuntimeException;

/**
 * Web Push bez zewnętrznych bibliotek: klucze VAPID (RFC 8292), szyfrowanie treści aes128gcm (RFC 8291)
 * i wysyłka do usługi push przeglądarki. Wymaga rozszerzenia openssl (ECDH P-256, AES-128-GCM).
 */
final class WebPush
{
    /** Nagłówek DER klucza publicznego P-256 (SubjectPublicKeyInfo) przed surowym punktem 0x04||X||Y. */
    private const P256_SPKI = '3059301306072a8648ce3d020106082a8648ce3d030107034200';

    /** Usługi push przeglądarek — tylko na te adresy serwer wysyła żądania (bez dowolnych URL-i od klientów). */
    private const PUSH_HOSTS = ['googleapis.com', 'push.services.mozilla.com', 'push.apple.com', 'notify.windows.com'];

    /**
     * Klucze VAPID serwera; tworzone przy pierwszym użyciu w storage/vapid.json (zostaje przy wdrożeniu).
     * @return array{public: string, pem: string} public: surowy punkt w base64url (dla przeglądarki), pem: klucz prywatny
     */
    public static function keys(): array
    {
        $file = Config::path('storage') . '/vapid.json';
        $data = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
        if (is_array($data) && isset($data['public'], $data['pem'])) {
            return ['public' => (string) $data['public'], 'pem' => (string) $data['pem']];
        }
        $key = self::newKey();
        $keys = ['public' => self::b64(self::rawPublic($key)), 'pem' => self::exportPem($key)];
        Storage::writeJson($file, $keys);
        @chmod($file, 0600);

        return $keys;
    }

    public static function allowedEndpoint(string $endpoint): bool
    {
        // bez danych logowania, portu, ukośników wstecznych i znaków sterujących — parse_url i curl muszą widzieć ten sam host
        if (strlen($endpoint) > 1000 || preg_match('#^https://[a-z0-9.-]+/[!-~]*$#i', $endpoint) !== 1 || preg_match('#[\\\\@]#', $endpoint) === 1) {
            return false;
        }
        $parts = parse_url($endpoint);
        if ($parts === false || ($parts['scheme'] ?? '') !== 'https' || !isset($parts['host']) || isset($parts['user']) || isset($parts['port'])) {
            return false;
        }
        foreach (self::PUSH_HOSTS as $host) {
            if ($parts['host'] === $host || str_ends_with($parts['host'], '.' . $host)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Wysyła powiadomienie. Zwraca kod HTTP usługi push (404/410 = subskrypcja wygasła).
     * @param array{endpoint: string, p256dh: string, auth: string} $subscription klucze w base64url
     * @param array<string, mixed> $payload
     */
    public static function send(array $subscription, array $payload, int $ttl = 3600): int
    {
        if (!self::allowedEndpoint($subscription['endpoint'])) {
            throw new RuntimeException('Niedozwolony adres usługi push.');
        }
        $body = self::encrypt(
            json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
            self::unb64($subscription['p256dh']),
            self::unb64($subscription['auth'])
        );
        $keys = self::keys();
        $handle = curl_init($subscription['endpoint']);
        if ($handle === false) {
            throw new RuntimeException('Nie udało się otworzyć połączenia z usługą push.');
        }
        $options = [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/octet-stream',
                'Content-Encoding: aes128gcm',
                'TTL: ' . $ttl,
                'Urgency: high',
                'Authorization: ' . self::vapidAuthorization($subscription['endpoint'], $keys),
            ],
            CURLOPT_USERAGENT => (string) Config::get('user_agent'),
        ];
        $cacert = Config::path('cacert');
        if (is_file($cacert)) {
            $options[CURLOPT_CAINFO] = $cacert;
        }
        curl_setopt_array($handle, $options);
        $result = curl_exec($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $error = curl_error($handle);
        curl_close($handle);
        if ($result === false) {
            throw new RuntimeException('Usługa push nie odpowiada: ' . $error);
        }

        return $status;
    }

    /** Nagłówek Authorization: podpisany JWT (ES256) dla adresata usługi push i klucz publiczny serwera. @param array{public: string, pem: string} $keys */
    public static function vapidAuthorization(string $endpoint, array $keys, ?int $now = null): string
    {
        $parts = parse_url($endpoint);
        $claims = [
            'aud' => $parts['scheme'] . '://' . $parts['host'],
            'exp' => ($now ?? time()) + 12 * 3600,
            'sub' => (string) Config::get('site_url'),
        ];
        $unsigned = self::b64((string) json_encode(['typ' => 'JWT', 'alg' => 'ES256'])) . '.' . self::b64((string) json_encode($claims, JSON_UNESCAPED_SLASHES));
        if (!openssl_sign($unsigned, $der, $keys['pem'], OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('Nie udało się podpisać tokenu VAPID.');
        }

        return 'vapid t=' . $unsigned . '.' . self::b64(self::derToRawSignature($der)) . ', k=' . $keys['public'];
    }

    /**
     * Szyfrowanie treści dla przeglądarki (RFC 8291, jeden rekord aes128gcm).
     * $salt i $local podaje się tylko w testach.
     */
    public static function encrypt(string $plaintext, string $uaPublic, string $authSecret, ?string $salt = null, ?OpenSSLAsymmetricKey $local = null): string
    {
        if (strlen($uaPublic) !== 65 || $uaPublic[0] !== "\x04" || strlen($authSecret) !== 16) {
            throw new RuntimeException('Nieprawidłowe klucze subskrypcji push.');
        }
        $local ??= self::newKey();
        $localPublic = self::rawPublic($local);
        $shared = openssl_pkey_derive(self::publicKey($uaPublic), $local, 32);
        if ($shared === false) {
            throw new RuntimeException('Nie udało się uzgodnić klucza ECDH.');
        }
        $salt ??= random_bytes(16);
        $ikm = hash_hkdf('sha256', $shared, 32, "WebPush: info\x00" . $uaPublic . $localPublic, $authSecret);
        $cek = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\x00", $salt);
        $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\x00", $salt);
        // jeden (ostatni) rekord: treść + ogranicznik 0x02
        $cipher = openssl_encrypt($plaintext . "\x02", 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag);
        if ($cipher === false) {
            throw new RuntimeException('Nie udało się zaszyfrować powiadomienia.');
        }

        return $salt . pack('N', 4096) . chr(65) . $localPublic . $cipher . $tag;
    }

    /** Odszyfrowanie po stronie przeglądarki — tylko do testów (selftest). */
    public static function decrypt(string $body, OpenSSLAsymmetricKey $uaPrivate, string $authSecret): ?string
    {
        $salt = substr($body, 0, 16);
        $idLength = ord($body[20]);
        $serverPublic = substr($body, 21, $idLength);
        $data = substr($body, 21 + $idLength);
        $uaPublic = self::rawPublic($uaPrivate);
        $shared = openssl_pkey_derive(self::publicKey($serverPublic), $uaPrivate, 32);
        $ikm = hash_hkdf('sha256', (string) $shared, 32, "WebPush: info\x00" . $uaPublic . $serverPublic, $authSecret);
        $cek = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\x00", $salt);
        $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\x00", $salt);
        $plain = openssl_decrypt(substr($data, 0, -16), 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, substr($data, -16));

        return $plain === false ? null : rtrim($plain, "\x02");
    }

    public static function newKey(): OpenSSLAsymmetricKey
    {
        $key = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_EC, 'curve_name' => 'prime256v1'] + self::opensslConfig());
        if ($key === false) {
            throw new RuntimeException('Nie udało się utworzyć klucza P-256 (openssl).');
        }

        return $key;
    }

    public static function exportPem(OpenSSLAsymmetricKey $key): string
    {
        if (!openssl_pkey_export($key, $pem, null, self::opensslConfig())) {
            throw new RuntimeException('Nie udało się zapisać klucza (openssl).');
        }

        return $pem;
    }

    /** PHP na Windows nie znajduje domyślnie openssl.cnf — wskazujemy plik z dystrybucji PHP (na serwerze zbędne). @return array<string, string> */
    private static function opensslConfig(): array
    {
        $cnf = dirname(PHP_BINARY) . '/extras/ssl/openssl.cnf';

        return PHP_OS_FAMILY === 'Windows' && getenv('OPENSSL_CONF') === false && is_file($cnf) ? ['config' => $cnf] : [];
    }

    /** Surowy klucz publiczny 0x04||X||Y (65 bajtów). */
    public static function rawPublic(OpenSSLAsymmetricKey $key): string
    {
        $ec = openssl_pkey_get_details($key)['ec'] ?? throw new RuntimeException('To nie jest klucz EC.');

        return "\x04" . str_pad($ec['x'], 32, "\x00", STR_PAD_LEFT) . str_pad($ec['y'], 32, "\x00", STR_PAD_LEFT);
    }

    public static function publicKey(string $raw): OpenSSLAsymmetricKey
    {
        $pem = "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode(hex2bin(self::P256_SPKI) . $raw), 64, "\n") . "-----END PUBLIC KEY-----\n";
        $key = openssl_pkey_get_public($pem);
        if ($key === false) {
            throw new RuntimeException('Nieprawidłowy klucz publiczny P-256.');
        }

        return $key;
    }

    /** Podpis ECDSA z DER (SEQUENCE { INTEGER r, INTEGER s }) do postaci r||s (64 bajty) wymaganej przez JWT. */
    public static function derToRawSignature(string $der): string
    {
        $offset = 2 + (ord($der[1]) & 0x80 ? ord($der[1]) & 0x7f : 0);
        $out = '';
        for ($i = 0; $i < 2; $i++) {
            $length = ord($der[$offset + 1]);
            $int = ltrim(substr($der, $offset + 2, $length), "\x00");
            $out .= str_pad($int, 32, "\x00", STR_PAD_LEFT);
            $offset += 2 + $length;
        }

        return $out;
    }

    /** Odwrotność derToRawSignature — tylko do weryfikacji w testach. */
    public static function rawToDerSignature(string $raw): string
    {
        $int = static function (string $part): string {
            $part = ltrim($part, "\x00");
            if ($part === '' || ord($part[0]) & 0x80) {
                $part = "\x00" . $part;
            }
            return "\x02" . chr(strlen($part)) . $part;
        };
        $body = $int(substr($raw, 0, 32)) . $int(substr($raw, 32, 32));

        return "\x30" . chr(strlen($body)) . $body;
    }

    public static function b64(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    public static function unb64(string $data): string
    {
        $decoded = base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4), true);

        return $decoded === false ? '' : $decoded;
    }
}
