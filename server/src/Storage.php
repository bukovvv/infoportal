<?php

declare(strict_types=1);

namespace KwInfo;

final class Storage
{
    /** Atomowy zapis JSON (tmp + rename). */
    public static function writeJson(string $file, array $data): void
    {
        $dir = dirname($file);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $tmp = $file . '.' . bin2hex(random_bytes(3)) . '.tmp';
        file_put_contents($tmp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        if (!@rename($tmp, $file)) {
            @unlink($file);
            if (!@rename($tmp, $file)) {
                @unlink($tmp);
                throw new \RuntimeException('Nie udało się zapisać ' . basename($file));
            }
        }
    }
}
