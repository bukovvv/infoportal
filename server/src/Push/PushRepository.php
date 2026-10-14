<?php

declare(strict_types=1);

namespace KwInfo\Push;

use KwInfo\Clock;
use KwInfo\Http\ApiException;
use KwInfo\Notices\NoticeRepository;
use PDO;

/**
 * Obserwowane podróże z włączonymi powiadomieniami (app.sqlite). Wiersz = subskrypcja push przeglądarki + odcinki podróży;
 * znika po zakończeniu podróży, po wyłączeniu powiadomień albo gdy usługa push zgłosi wygaśnięcie subskrypcji.
 */
final class PushRepository
{
    public const MAX_PER_ENDPOINT = 20;
    public const MAX_TOTAL = 5000;

    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? NoticeRepository::connect();
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS push_watches (
                endpoint TEXT NOT NULL,
                journey_id TEXT NOT NULL,
                p256dh TEXT NOT NULL,
                auth TEXT NOT NULL,
                legs TEXT NOT NULL,
                state TEXT NOT NULL DEFAULT "{}",
                ends_at INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (endpoint, journey_id)
            )'
        );
    }

    /** Identyfikator podróży z przeglądarki (klucze kursów i godzina) zapisujemy jako skrót. */
    public static function journeyId(string $id): string
    {
        return substr(hash('sha256', $id), 0, 32);
    }

    /** @param array<int, array{key: string, from: string, to: string}> $legs */
    public function save(string $endpoint, string $p256dh, string $auth, string $journeyId, array $legs, int $endsAt): void
    {
        $exists = $this->pdo->prepare('SELECT 1 FROM push_watches WHERE endpoint = ? AND journey_id = ?');
        $exists->execute([$endpoint, $journeyId]);
        if (!$exists->fetchColumn()) {
            $count = $this->pdo->prepare('SELECT COUNT(*) FROM push_watches WHERE endpoint = ?');
            $count->execute([$endpoint]);
            if ((int) $count->fetchColumn() >= self::MAX_PER_ENDPOINT) {
                throw new ApiException('Masz już włączone powiadomienia dla ' . self::MAX_PER_ENDPOINT . ' podróży. Wyłącz którąś, żeby dodać nową.', 422);
            }
            if ((int) $this->pdo->query('SELECT COUNT(*) FROM push_watches')->fetchColumn() >= self::MAX_TOTAL) {
                throw new ApiException('Powiadomienia są chwilowo niedostępne. Spróbuj później.', 503);
            }
        }
        $this->pdo->prepare(
            'INSERT INTO push_watches (endpoint, journey_id, p256dh, auth, legs, state, ends_at, created_at)
             VALUES (:endpoint, :journey, :p256dh, :auth, :legs, "{}", :ends, :created)
             ON CONFLICT (endpoint, journey_id) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, legs = excluded.legs, ends_at = excluded.ends_at'
        )->execute([
            'endpoint' => $endpoint, 'journey' => $journeyId, 'p256dh' => $p256dh, 'auth' => $auth,
            'legs' => json_encode($legs, JSON_UNESCAPED_SLASHES), 'ends' => $endsAt, 'created' => Clock::now()->format(DATE_ATOM),
        ]);
    }

    public function delete(string $endpoint, ?string $journeyId = null): void
    {
        if ($journeyId === null) {
            $this->pdo->prepare('DELETE FROM push_watches WHERE endpoint = ?')->execute([$endpoint]);
            return;
        }
        $this->pdo->prepare('DELETE FROM push_watches WHERE endpoint = ? AND journey_id = ?')->execute([$endpoint, $journeyId]);
    }

    /** Usuwa podróże zakończone przed $now. */
    public function purge(int $now): int
    {
        $stmt = $this->pdo->prepare('DELETE FROM push_watches WHERE ends_at < ?');
        $stmt->execute([$now]);

        return $stmt->rowCount();
    }

    /** @return array<int, array{endpoint: string, journey_id: string, p256dh: string, auth: string, legs: array<int, array<string, string>>, state: array<string, mixed>}> */
    public function all(): array
    {
        $rows = $this->pdo->query('SELECT endpoint, journey_id, p256dh, auth, legs, state FROM push_watches')->fetchAll();

        return array_map(static function (array $row): array {
            $row['legs'] = json_decode((string) $row['legs'], true) ?: [];
            $row['state'] = json_decode((string) $row['state'], true) ?: [];
            return $row;
        }, $rows);
    }

    /** @param array<string, mixed> $state */
    public function saveState(string $endpoint, string $journeyId, array $state): void
    {
        $this->pdo->prepare('UPDATE push_watches SET state = ? WHERE endpoint = ? AND journey_id = ?')
            ->execute([json_encode($state), $endpoint, $journeyId]);
    }

    public function count(): int
    {
        return (int) $this->pdo->query('SELECT COUNT(*) FROM push_watches')->fetchColumn();
    }
}
