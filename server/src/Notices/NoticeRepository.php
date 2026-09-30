<?php

declare(strict_types=1);

namespace KwInfo\Notices;

use KwInfo\Clock;
use KwInfo\Config;
use KwInfo\Http\ApiException;
use PDO;

/** Komunikaty dla pasażerów (app.sqlite). Rozszerzenie wersji 0.2 o jawną listę numerów pociągów. */
final class NoticeRepository
{
    public const SEVERITIES = ['info', 'warning', 'danger'];

    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? self::connect();
    }

    public static function connect(?string $path = null): PDO
    {
        $path ??= Config::path('app_db');
        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $pdo = new PDO('sqlite:' . $path, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
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
                updated_at TEXT NOT NULL,
                trains TEXT NOT NULL DEFAULT "[]"
            )'
        );
        $columns = array_column($pdo->query('PRAGMA table_info(notices)')->fetchAll(), 'name');
        if (!in_array('trains', $columns, true)) {
            $pdo->exec('ALTER TABLE notices ADD COLUMN trains TEXT NOT NULL DEFAULT "[]"');
        }

        return $pdo;
    }

    /** @return array<int, array<string, mixed>> */
    public function published(): array
    {
        $now = Clock::now()->format('Y-m-d\TH:i');
        $stmt = $this->pdo->prepare(
            'SELECT * FROM notices
             WHERE active = 1
               AND (starts_at IS NULL OR starts_at = "" OR starts_at <= :now)
               AND (ends_at IS NULL OR ends_at = "" OR ends_at >= :now)
             ORDER BY CASE severity WHEN "danger" THEN 1 WHEN "warning" THEN 2 ELSE 3 END, updated_at DESC'
        );
        $stmt->execute(['now' => $now]);

        return array_map([self::class, 'present'], $stmt->fetchAll());
    }

    /** @return array<int, array<string, mixed>> */
    public function all(): array
    {
        return array_map([self::class, 'present'], $this->pdo->query('SELECT * FROM notices ORDER BY updated_at DESC')->fetchAll());
    }

    /** @return array<string, mixed>|null */
    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM notices WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row ? self::present($row) : null;
    }

    /** @param array<string, mixed> $data @return array<string, mixed> */
    public function save(array $data, ?int $id = null): array
    {
        $values = self::validate($data);
        $now = Clock::now()->format(DATE_ATOM);
        $values['updated_at'] = $now;
        if ($id !== null) {
            if ($this->find($id) === null) {
                throw new ApiException('Nie znaleziono komunikatu. Lista mogła zostać odświeżona.', 404);
            }
            $values['id'] = $id;
            $this->pdo->prepare(
                'UPDATE notices SET title=:title, body=:body, line=:line, severity=:severity, starts_at=:starts_at,
                 ends_at=:ends_at, active=:active, trains=:trains, updated_at=:updated_at WHERE id=:id'
            )->execute($values);
        } else {
            $values['created_at'] = $now;
            $this->pdo->prepare(
                'INSERT INTO notices (title, body, line, severity, starts_at, ends_at, active, trains, created_at, updated_at)
                 VALUES (:title, :body, :line, :severity, :starts_at, :ends_at, :active, :trains, :created_at, :updated_at)'
            )->execute($values);
            $id = (int) $this->pdo->lastInsertId();
        }

        return $this->find($id);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM notices WHERE id = ?');
        $stmt->execute([$id]);

        return $stmt->rowCount() === 1;
    }

    /** @param array<string, mixed> $data @return array<string, mixed> */
    private static function validate(array $data): array
    {
        $text = static fn (string $key, int $max): string => mb_substr(trim((string) ($data[$key] ?? '')), 0, $max);
        $title = $text('title', 160);
        $body = $text('body', 1200);
        $line = $text('line', 120) ?: 'Cała sieć KW';
        if ($title === '' || $body === '') {
            throw new ApiException('Tytuł i treść komunikatu są wymagane.', 422);
        }
        $severity = in_array($data['severity'] ?? '', self::SEVERITIES, true) ? $data['severity'] : 'info';
        $date = static function (mixed $value): ?string {
            $value = trim((string) $value);
            if ($value === '') {
                return null;
            }
            if (preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/', $value) !== 1) {
                throw new ApiException('Podaj datę publikacji w formacie RRRR-MM-DDTGG:MM.', 422);
            }
            return $value;
        };
        $starts = $date($data['startsAt'] ?? '');
        $ends = $date($data['endsAt'] ?? '');
        if ($starts !== null && $ends !== null && $ends < $starts) {
            throw new ApiException('Koniec publikacji nie może być wcześniejszy niż jej początek.', 422);
        }
        $trains = [];
        foreach ((array) ($data['trains'] ?? []) as $number) {
            $number = trim((string) $number);
            if (preg_match('/^\d{3,6}$/', $number) === 1) {
                $trains[] = $number;
            }
        }

        return [
            'title' => $title,
            'body' => $body,
            'line' => $line,
            'severity' => $severity,
            'starts_at' => $starts,
            'ends_at' => $ends,
            'active' => !empty($data['active']) ? 1 : 0,
            'trains' => json_encode(array_values(array_unique(array_slice($trains, 0, 10)))),
        ];
    }

    /** @param array<string, mixed> $row @return array<string, mixed> */
    private static function present(array $row): array
    {
        $trains = json_decode((string) ($row['trains'] ?? '[]'), true) ?: [];
        if ($trains === [] && preg_match_all('/(?:Pociąg|KW)\s+(\d{3,6})/ui', $row['title'] . ' ' . $row['body'], $m)) {
            $trains = array_values(array_unique($m[1]));
        }

        return [
            'id' => (int) $row['id'],
            'title' => (string) $row['title'],
            'body' => (string) $row['body'],
            'line' => (string) $row['line'],
            'severity' => (string) $row['severity'],
            'trains' => $trains,
            'startsAt' => $row['starts_at'] ?: null,
            'endsAt' => $row['ends_at'] ?: null,
            'active' => (int) $row['active'] === 1,
            'createdAt' => (string) $row['created_at'],
            'updatedAt' => (string) $row['updated_at'],
        ];
    }
}
