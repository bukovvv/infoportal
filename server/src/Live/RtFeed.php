<?php

declare(strict_types=1);

namespace KwInfo\Live;

use KwInfo\Config;
use KwInfo\Net\HttpClient;
use KwInfo\Storage;
use RuntimeException;

/**
 * Surowy feed GTFS-RT (updates.pb z mkuran.pl) wspólny dla regionów: pobierany warunkowo (ETag / Last-Modified)
 * najwyżej raz na rt_min_interval i zapisywany w storage/rt-feed.pb. Każdy region dekoduje go sam (LiveBuilder),
 * gdy zmieni się wersja — dzięki temu drugi region w tym samym uruchomieniu CRON-a nie pobiera feedu ponownie.
 */
final class RtFeed
{
    /**
     * @return array{version: string, body: string|null} body = null, gdy wersja się nie zmieniła względem $knownVersion
     * @throws RuntimeException przy błędzie pobierania (bez wcześniej pobranego feedu)
     */
    public static function fetch(?string $knownVersion): array
    {
        $storage = Config::path('storage');
        $file = $storage . '/rt-feed.pb';
        $metaFile = $storage . '/rt-feed.json';
        $meta = Realtime::readJson($metaFile);
        $have = is_file($file) && isset($meta['version']);
        // świeżo sprawdzony przez inny region (albo poprzednie uruchomienie) — bez zapytania
        $recent = time() - (int) ($meta['checkedAt'] ?? 0) < max(30, (int) Config::get('rt_min_interval') - 20);
        if (!$recent) {
            $headers = [];
            if ($have && !empty($meta['etag'])) {
                $headers[] = 'If-None-Match: ' . $meta['etag'];
            }
            if ($have && !empty($meta['lastModified'])) {
                $headers[] = 'If-Modified-Since: ' . $meta['lastModified'];
            }
            try {
                $response = HttpClient::get((string) Config::get('gtfs_rt_url'), $headers, 30);
            } catch (\Throwable $e) {
                $meta['checkedAt'] = time();
                $meta['error'] = $e->getMessage();
                Storage::writeJson($metaFile, $meta);
                throw new RuntimeException($e->getMessage(), 0, $e);
            }
            $meta['checkedAt'] = time();
            if ($response['status'] === 200) {
                $tmp = $file . '.' . bin2hex(random_bytes(3)) . '.tmp';
                file_put_contents($tmp, $response['body']);
                if (!@rename($tmp, $file)) {
                    @unlink($file);
                    rename($tmp, $file);
                }
                $meta['version'] = sha1($response['body']);
                $meta['etag'] = $response['headers']['etag'] ?? null;
                $meta['lastModified'] = $response['headers']['last-modified'] ?? null;
                $meta['error'] = null;
                $have = true;
            } elseif ($response['status'] !== 304) {
                $meta['error'] = 'HTTP ' . $response['status'];
                Storage::writeJson($metaFile, $meta);
                throw new RuntimeException('HTTP ' . $response['status']);
            } else {
                $meta['error'] = null;
            }
            Storage::writeJson($metaFile, $meta);
        } elseif (!empty($meta['error'])) {
            // ostatnie sprawdzenie (przez inny region) się nie udało — ten sam błąd, bez ponownego zapytania
            throw new RuntimeException((string) $meta['error']);
        }
        if (!$have) {
            throw new RuntimeException('brak pobranego feedu GTFS-RT');
        }
        $version = (string) $meta['version'];

        return ['version' => $version, 'body' => $version === $knownVersion ? null : (string) file_get_contents($file)];
    }
}
