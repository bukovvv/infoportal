<?php

declare(strict_types=1);

namespace KwInfo\Gtfs;

use Generator;
use RuntimeException;
use ZipArchive;

/**
 * Strumieniowy odczyt plików GTFS z archiwum zip. Bez rozszerzenia zip (np. lokalny PHP na Windows)
 * archiwum jest rozpakowywane przez systemowy tar do katalogu tymczasowego.
 */
final class GtfsSource
{
    private ?ZipArchive $zip = null;
    private ?string $dir = null;
    private bool $ownsDir = false;

    public function __construct(string $path)
    {
        if (is_dir($path)) {
            $this->dir = $path;
            return;
        }
        if (class_exists(ZipArchive::class)) {
            $zip = new ZipArchive();
            if ($zip->open($path) !== true) {
                throw new RuntimeException('Nie można otworzyć archiwum GTFS.');
            }
            $this->zip = $zip;
            return;
        }
        $dir = sys_get_temp_dir() . '/kw-gtfs-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);
        exec('tar -xf ' . escapeshellarg($path) . ' -C ' . escapeshellarg($dir) . ' 2>&1', $out, $code);
        if ($code !== 0) {
            throw new RuntimeException('Brak rozszerzenia zip i nie udało się rozpakować archiwum: ' . implode(' ', $out));
        }
        $this->dir = $dir;
        $this->ownsDir = true;
    }

    public function has(string $name): bool
    {
        return $this->zip !== null ? $this->zip->locateName($name) !== false : is_file($this->dir . '/' . $name);
    }

    /** @return Generator<int, array<string, string>> */
    public function rows(string $name): Generator
    {
        if (!$this->has($name)) {
            return;
        }
        $stream = $this->zip !== null ? $this->zip->getStream($name) : fopen($this->dir . '/' . $name, 'rb');
        if ($stream === false) {
            throw new RuntimeException('Nie można odczytać ' . $name);
        }
        try {
            $header = fgetcsv($stream, escape: '');
            if ($header === false) {
                return;
            }
            $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) $header[0]);
            $count = count($header);
            while (($row = fgetcsv($stream, escape: '')) !== false) {
                if ($row === [null]) {
                    continue;
                }
                if (count($row) < $count) {
                    $row = array_pad($row, $count, '');
                }
                yield array_combine($header, array_slice($row, 0, $count));
            }
        } finally {
            fclose($stream);
        }
    }

    public function __destruct()
    {
        $this->zip?->close();
        if ($this->ownsDir && $this->dir !== null) {
            foreach (glob($this->dir . '/*') ?: [] as $file) {
                @unlink($file);
            }
            @rmdir($this->dir);
        }
    }
}
