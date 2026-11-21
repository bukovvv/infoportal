<?php

declare(strict_types=1);

namespace KwInfo\Notices;

use KwInfo\Clock;
use KwInfo\Config;
use KwInfo\Http\ApiException;
use PDO;

/**
 * Komunikaty i aktualności dla pasażerów (app.sqlite): jawna lista numerów pociągów, stacji (id z rozkładu)
 * i linii (id linii ze schematu połączeń, `web/src/utils/scheme.ts`) — przy nich komunikat się pokazuje.
 */
final class NoticeRepository
{
    public const SEVERITIES = ['info', 'warning', 'danger'];
    public const BODY_MAX = 5000;

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
                trains TEXT NOT NULL DEFAULT "[]",
                stations TEXT NOT NULL DEFAULT "[]",
                lines TEXT NOT NULL DEFAULT "[]"
            )'
        );
        $columns = array_column($pdo->query('PRAGMA table_info(notices)')->fetchAll(), 'name');
        foreach (['trains', 'stations', 'lines'] as $column) {
            if (!in_array($column, $columns, true)) {
                $pdo->exec('ALTER TABLE notices ADD COLUMN ' . $column . ' TEXT NOT NULL DEFAULT "[]"');
            }
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
                 ends_at=:ends_at, active=:active, trains=:trains, stations=:stations, lines=:lines, updated_at=:updated_at WHERE id=:id'
            )->execute($values);
        } else {
            $values['created_at'] = $now;
            $this->pdo->prepare(
                'INSERT INTO notices (title, body, line, severity, starts_at, ends_at, active, trains, stations, lines, created_at, updated_at)
                 VALUES (:title, :body, :line, :severity, :starts_at, :ends_at, :active, :trains, :stations, :lines, :created_at, :updated_at)'
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
        $title = self::plain((string) ($data['title'] ?? ''), 160);
        $body = self::plain((string) ($data['body'] ?? ''), self::BODY_MAX, true);
        $line = self::plain((string) ($data['line'] ?? ''), 120) ?: 'Cała sieć KW';
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
        // sam numer — przewoźnik regionu, „PR 85724” / „IC 1804” — POLREGIO, PKP Intercity
        $trains = self::ids($data['trains'] ?? [], '/^(?:(?:PR|IC) )?\d{3,6}$/', 40);
        // id stacji z rozkładu (GTFS) i linii ze schematu połączeń
        $stations = self::ids($data['stations'] ?? [], '/^[A-Za-z0-9_.:-]{1,40}$/', 40);
        $lines = self::ids($data['lines'] ?? [], '/^[a-z0-9-]{1,30}$/', 20);

        return [
            'title' => $title,
            'body' => $body,
            'line' => $line,
            'severity' => $severity,
            'starts_at' => $starts,
            'ends_at' => $ends,
            'active' => !empty($data['active']) ? 1 : 0,
            'trains' => json_encode($trains),
            'stations' => json_encode($stations),
            'lines' => json_encode($lines),
        ];
    }

    /** @return array<int, string> unikalne wartości pasujące do wzorca, najwyżej $max */
    private static function ids(mixed $values, string $pattern, int $max): array
    {
        $out = [];
        foreach (is_array($values) ? $values : [] as $value) {
            $value = trim(is_scalar($value) ? (string) $value : '');
            if (preg_match($pattern, $value) === 1 && !in_array($value, $out, true)) {
                $out[] = $value;
            }
        }

        return array_slice($out, 0, $max);
    }

    /**
     * Czysty tekst komunikatu: bez znaczników HTML i znaków sterujących (w treści zostają nowe linie).
     * Widoki i tak wstawiają tekst jako tekst (bez v-html) — to druga warstwa, także dla powiadomień i podglądów.
     */
    public static function plain(string $value, int $max, bool $multiline = false): string
    {
        $value = str_replace(["\r\n", "\r"], "\n", mb_scrub($value, 'UTF-8'));
        $value = preg_replace('/<\/?[a-z!?][^<>]*>/iu', '', $value) ?? '';
        $value = preg_replace($multiline ? '/[^\P{C}\n]/u' : '/\p{C}/u', $multiline ? '' : ' ', $value) ?? '';
        $value = preg_replace('/\n{3,}/', "\n\n", $value) ?? '';

        return mb_substr(trim($value), 0, $max);
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
            'stations' => json_decode((string) ($row['stations'] ?? '[]'), true) ?: [],
            'lines' => json_decode((string) ($row['lines'] ?? '[]'), true) ?: [],
            'startsAt' => $row['starts_at'] ?: null,
            'endsAt' => $row['ends_at'] ?: null,
            'active' => (int) $row['active'] === 1,
            'createdAt' => (string) $row['created_at'],
            'updatedAt' => (string) $row['updated_at'],
        ];
    }
}
