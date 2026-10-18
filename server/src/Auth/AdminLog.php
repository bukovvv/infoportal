<?php

declare(strict_types=1);

namespace KwInfo\Auth;

use KwInfo\Clock;
use KwInfo\Notices\NoticeRepository;
use PDO;
use Throwable;

/**
 * Dziennik panelu administratora (tabela admin_log w app.sqlite): logowania (udane, nieudane, zablokowane),
 * wylogowania, dodanie, zmiana i usunięcie komunikatu (z treścią przed i po), import rozkładu.
 * Wpisy starsze niż KEEP_DAYS są usuwane przy zapisie.
 */
final class AdminLog
{
    public const KEEP_DAYS = 180;

    private static ?PDO $pdo = null;

    /** @param array<string, mixed> $detail */
    public static function write(string $action, ?int $noticeId = null, array $detail = []): void
    {
        try {
            $pdo = self::pdo();
            $pdo->prepare('INSERT INTO admin_log (at, ip, action, notice_id, detail) VALUES (?, ?, ?, ?, ?)')
                ->execute([Clock::now()->format(DATE_ATOM), AdminAuth::ip(), $action, $noticeId, json_encode($detail, JSON_UNESCAPED_UNICODE)]);
            if (random_int(1, 50) === 1) {
                $pdo->prepare('DELETE FROM admin_log WHERE at < ?')
                    ->execute([Clock::now()->modify('-' . self::KEEP_DAYS . ' days')->format(DATE_ATOM)]);
            }
        } catch (Throwable $e) {
            // dziennik nie może blokować pracy panelu; błąd trafia do logu PHP
            error_log('[kw-admin-log] ' . $e->getMessage());
        }
    }

    /** @return array<int, array{id: int, at: string, ip: string, action: string, noticeId: ?int, detail: array<string, mixed>}> */
    public static function recent(int $limit = 100): array
    {
        $stmt = self::pdo()->prepare('SELECT * FROM admin_log ORDER BY id DESC LIMIT ?');
        $stmt->bindValue(1, max(1, min(500, $limit)), PDO::PARAM_INT);
        $stmt->execute();

        return array_map(static fn (array $r): array => [
            'id' => (int) $r['id'],
            'at' => (string) $r['at'],
            'ip' => (string) $r['ip'],
            'action' => (string) $r['action'],
            'noticeId' => $r['notice_id'] !== null ? (int) $r['notice_id'] : null,
            'detail' => json_decode((string) $r['detail'], true) ?: [],
        ], $stmt->fetchAll());
    }

    /** Do testów: dziennik w podanej bazie. */
    public static function use(?PDO $pdo): void
    {
        self::$pdo = $pdo;
        if ($pdo !== null) {
            self::migrate($pdo);
        }
    }

    private static function pdo(): PDO
    {
        if (self::$pdo === null) {
            self::$pdo = NoticeRepository::connect();
            self::migrate(self::$pdo);
        }

        return self::$pdo;
    }

    private static function migrate(PDO $pdo): void
    {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS admin_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                at TEXT NOT NULL,
                ip TEXT NOT NULL,
                action TEXT NOT NULL,
                notice_id INTEGER NULL,
                detail TEXT NOT NULL DEFAULT "{}"
            )'
        );
    }
}
