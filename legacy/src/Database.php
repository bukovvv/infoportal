<?php

declare(strict_types=1);

namespace KwInfo;

use PDO;

final class Database
{
    public static function connect(): PDO
    {
        $storage = dirname(__DIR__) . '/storage';
        if (!is_dir($storage)) {
            mkdir($storage, 0775, true);
        }

        $pdo = new PDO('sqlite:' . $storage . '/infoportal.sqlite', null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $pdo->exec('PRAGMA foreign_keys = ON');
        $pdo->exec('PRAGMA journal_mode = WAL');
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS notices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                line TEXT NOT NULL,
                severity TEXT NOT NULL DEFAULT "info" CHECK (severity IN ("info", "warning", "danger")),
                starts_at TEXT NULL,
                ends_at TEXT NULL,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )'
        );
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS app_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )'
        );

        return $pdo;
    }
}
