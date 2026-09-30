<?php

declare(strict_types=1);

namespace KwInfo;

use DateTimeImmutable;
use DateTimeZone;
use PDO;

final class NoticeRepository
{
    public function __construct(private readonly PDO $pdo)
    {
        $this->seed();
    }

    /** @return array<int, array<string, int|string|null>> */
    public function published(): array
    {
        $now = (new DateTimeImmutable('now', new DateTimeZone('Europe/Warsaw')))->format('Y-m-d\TH:i');
        $statement = $this->pdo->prepare(
            'SELECT * FROM notices
             WHERE active = 1
               AND (starts_at IS NULL OR starts_at = "" OR starts_at <= :now)
               AND (ends_at IS NULL OR ends_at = "" OR ends_at >= :now)
             ORDER BY CASE severity WHEN "danger" THEN 1 WHEN "warning" THEN 2 ELSE 3 END, updated_at DESC'
        );
        $statement->execute(['now' => $now]);
        return $statement->fetchAll();
    }

    /** @return array<int, array<string, int|string|null>> */
    public function all(): array
    {
        return $this->pdo->query('SELECT * FROM notices ORDER BY updated_at DESC')->fetchAll();
    }

    /** @param array<string, mixed> $data */
    public function save(array $data): void
    {
        $now = (new DateTimeImmutable('now', new DateTimeZone('Europe/Warsaw')))->format(DATE_ATOM);
        $values = [
            'title' => trim((string) ($data['title'] ?? '')),
            'body' => trim((string) ($data['body'] ?? '')),
            'line' => trim((string) ($data['line'] ?? 'Cała sieć KW')),
            'severity' => in_array($data['severity'] ?? '', ['info', 'warning', 'danger'], true) ? $data['severity'] : 'info',
            'starts_at' => trim((string) ($data['starts_at'] ?? '')) ?: null,
            'ends_at' => trim((string) ($data['ends_at'] ?? '')) ?: null,
            'active' => isset($data['active']) ? 1 : 0,
            'updated_at' => $now,
        ];

        if ($values['title'] === '' || $values['body'] === '') {
            throw new \InvalidArgumentException('Tytuł i treść komunikatu są wymagane.');
        }

        $id = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
        if ($id !== false && $id !== null) {
            $values['id'] = $id;
            $statement = $this->pdo->prepare(
                'UPDATE notices SET title=:title, body=:body, line=:line, severity=:severity,
                 starts_at=:starts_at, ends_at=:ends_at, active=:active, updated_at=:updated_at WHERE id=:id'
            );
        } else {
            $values['created_at'] = $now;
            $statement = $this->pdo->prepare(
                'INSERT INTO notices (title, body, line, severity, starts_at, ends_at, active, created_at, updated_at)
                 VALUES (:title, :body, :line, :severity, :starts_at, :ends_at, :active, :created_at, :updated_at)'
            );
        }
        $statement->execute($values);
    }

    public function delete(int $id): bool
    {
        if ($id < 1) {
            return false;
        }
        $statement = $this->pdo->prepare('DELETE FROM notices WHERE id = :id');
        $statement->execute(['id' => $id]);
        return $statement->rowCount() === 1;
    }

    private function seed(): void
    {
        $seeded = $this->pdo->prepare('SELECT value FROM app_meta WHERE key = :key');
        $seeded->execute(['key' => 'notices_seeded']);
        if ($seeded->fetchColumn() !== false) {
            return;
        }

        $markSeeded = $this->pdo->prepare('INSERT OR REPLACE INTO app_meta (key, value) VALUES (:key, :value)');
        if ((int) $this->pdo->query('SELECT COUNT(*) FROM notices')->fetchColumn() > 0) {
            $markSeeded->execute(['key' => 'notices_seeded', 'value' => '1']);
            return;
        }

        $markSeeded->execute(['key' => 'notices_seeded', 'value' => '1']);
    }
}
