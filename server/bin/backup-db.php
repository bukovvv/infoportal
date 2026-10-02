<?php

declare(strict_types=1);

// CRON: codziennie, np. 15 3 * * * php /ścieżka/server/bin/backup-db.php
// Kopia bazy komunikatów i ustawień (app.sqlite) do server/storage/backups, zostaje KEEP ostatnich kopii.
// Rozkład (gtfs.sqlite) i dane na żywo nie są kopiowane — odtwarza je import i CRON.

require dirname(__DIR__) . '/bootstrap.php';

use KwInfo\Config;

if (PHP_SAPI !== 'cli') {
    exit(1);
}

const KEEP = 14;

$source = Config::path('app_db');
$dir = Config::path('storage') . '/backups';

try {
    if (!is_file($source)) {
        throw new RuntimeException("Brak bazy $source");
    }
    if (!is_dir($dir) && !mkdir($dir, 0700, true)) {
        throw new RuntimeException("Nie można utworzyć $dir");
    }

    $target = $dir . '/app-' . date('Y-m-d') . '.sqlite';
    if (is_file($target)) {
        unlink($target);
    }
    // VACUUM INTO daje spójną kopię także wtedy, gdy ktoś akurat zapisuje do bazy
    $db = new PDO('sqlite:' . $source, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $db->exec('VACUUM INTO ' . $db->quote($target));
    $db = null;

    $check = new PDO('sqlite:' . $target, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $result = $check->query('PRAGMA integrity_check')->fetchColumn();
    $check = null;
    if ($result !== 'ok') {
        throw new RuntimeException("Kopia uszkodzona: $result");
    }
    chmod($target, 0600);

    $all = glob($dir . '/app-*.sqlite') ?: [];
    rsort($all);
    foreach (array_slice($all, KEEP) as $old) {
        unlink($old);
    }

    printf("Kopia: %s (%d B), kopii: %d\n", basename($target), filesize($target), min(count($all), KEEP));
    exit(0);
} catch (Throwable $exception) {
    fwrite(STDERR, '[' . date('Y-m-d H:i:s') . '] [BŁĄD kopii] ' . $exception->getMessage() . PHP_EOL);
    exit(1);
}
