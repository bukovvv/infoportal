<?php

declare(strict_types=1);

namespace KwInfo\Net;

use KwInfo\Config;
use RuntimeException;

final class HttpClient
{
    /**
     * @param array<int, string> $headers
     * @return array{status: int, body: string, headers: array<string, string>}
     */
    public static function get(string $url, array $headers = [], int $timeout = 12, ?string $toFile = null): array
    {
        $handle = curl_init($url);
        if ($handle === false) {
            throw new RuntimeException('Nie udało się otworzyć połączenia: ' . $url);
        }
        $responseHeaders = [];
        $file = null;
        $options = [
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_ENCODING => '',
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_USERAGENT => (string) Config::get('user_agent'),
            CURLOPT_HEADERFUNCTION => static function ($curl, string $line) use (&$responseHeaders): int {
                $parts = explode(':', $line, 2);
                if (count($parts) === 2) {
                    $responseHeaders[strtolower(trim($parts[0]))] = trim($parts[1]);
                }
                return strlen($line);
            },
        ];
        $cacert = Config::path('cacert');
        if (is_file($cacert)) {
            $options[CURLOPT_CAINFO] = $cacert;
        }
        if ($toFile !== null) {
            $file = fopen($toFile, 'wb');
            if ($file === false) {
                throw new RuntimeException('Nie można zapisać pliku ' . $toFile);
            }
            $options[CURLOPT_FILE] = $file;
        } else {
            $options[CURLOPT_RETURNTRANSFER] = true;
        }
        curl_setopt_array($handle, $options);
        $body = curl_exec($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $error = curl_error($handle);
        curl_close($handle);
        if ($file !== null) {
            fclose($file);
        }
        if ($body === false) {
            throw new RuntimeException($error !== '' ? $error : 'Brak odpowiedzi z ' . parse_url($url, PHP_URL_HOST));
        }

        return ['status' => $status, 'body' => is_string($body) ? $body : '', 'headers' => $responseHeaders];
    }
}
