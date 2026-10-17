<?php

declare(strict_types=1);

namespace KwInfo\Push;

use KwInfo\Http\ApiException;
use KwInfo\Notices\NoticeRepository;
use PDO;

/**
 * Obserwowane trasy z powiadomieniami (app.sqlite): subskrypcja push + para stacji, opcje wyszukiwania i okienka czasu
 * (np. A → B w dni robocze 6:30–8:00). Wiersz zostaje do wyłączenia powiadomień, wygaśnięcia subskrypcji
 * albo STALE dni bez odświeżenia (przeglądarka odnawia wpis przy otwarciu strony).
 */
final class RouteRepository
{
    public const MAX_PER_ENDPOINT = 10;
    public const MAX_TOTAL = 5000;
    public const STALE = 90 * 86400;

    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? NoticeRepository::connect();
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS push_routes (
                endpoint TEXT NOT NULL,
                route_id TEXT NOT NULL,
                p256dh TEXT NOT NULL,
                auth TEXT NOT NULL,
                from_id TEXT NOT NULL,
                to_id TEXT NOT NULL,
                options TEXT NOT NULL,
                windows TEXT NOT NULL,
                state TEXT NOT NULL DEFAULT "{}",
                updated_at INTEGER NOT NULL,
                PRIMARY KEY (endpoint, route_id)
            )'
        );
    }

    /**
     * @param array{transfers: int, minTransfer: int, agencies: array<int, string>} $options
     * @param array<int, array{dir: string, days: array<int, int>, start: int, end: int}> $windows
     */
    public function save(string $endpoint, string $p256dh, string $auth, string $routeId, string $from, string $to, array $options, array $windows, int $now): void
    {
        $exists = $this->pdo->prepare('SELECT 1 FROM push_routes WHERE endpoint = ? AND route_id = ?');
        $exists->execute([$endpoint, $routeId]);
        if (!$exists->fetchColumn()) {
            $count = $this->pdo->prepare('SELECT COUNT(*) FROM push_routes WHERE endpoint = ?');
            $count->execute([$endpoint]);
            if ((int) $count->fetchColumn() >= self::MAX_PER_ENDPOINT) {
                throw new ApiException('Masz już powiadomienia dla ' . self::MAX_PER_ENDPOINT . ' tras. Wyłącz którąś, żeby dodać nową.', 422);
            }
            if ((int) $this->pdo->query('SELECT COUNT(*) FROM push_routes')->fetchColumn() >= self::MAX_TOTAL) {
                throw new ApiException('Powiadomienia są chwilowo niedostępne. Spróbuj później.', 503);
            }
        }
        $this->pdo->prepare(
            'INSERT INTO push_routes (endpoint, route_id, p256dh, auth, from_id, to_id, options, windows, state, updated_at)
             VALUES (:endpoint, :route, :p256dh, :auth, :from, :to, :options, :windows, "{}", :now)
             ON CONFLICT (endpoint, route_id) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, from_id = excluded.from_id,
                to_id = excluded.to_id, options = excluded.options, windows = excluded.windows, updated_at = excluded.updated_at'
        )->execute([
            'endpoint' => $endpoint, 'route' => $routeId, 'p256dh' => $p256dh, 'auth' => $auth, 'from' => $from, 'to' => $to,
            'options' => json_encode($options), 'windows' => json_encode($windows), 'now' => $now,
        ]);
    }

    public function delete(string $endpoint, ?string $routeId = null): void
    {
        if ($routeId === null) {
            $this->pdo->prepare('DELETE FROM push_routes WHERE endpoint = ?')->execute([$endpoint]);
            return;
        }
        $this->pdo->prepare('DELETE FROM push_routes WHERE endpoint = ? AND route_id = ?')->execute([$endpoint, $routeId]);
    }

    /** Usuwa wpisy nieodświeżane od STALE sekund. */
    public function purge(int $now): int
    {
        $stmt = $this->pdo->prepare('DELETE FROM push_routes WHERE updated_at < ?');
        $stmt->execute([$now - self::STALE]);

        return $stmt->rowCount();
    }

    /** @return array<int, array{endpoint: string, route_id: string, p256dh: string, auth: string, from_id: string, to_id: string, options: array<string, mixed>, windows: array<int, array<string, mixed>>, state: array<string, mixed>}> */
    public function all(): array
    {
        $rows = $this->pdo->query('SELECT endpoint, route_id, p256dh, auth, from_id, to_id, options, windows, state FROM push_routes')->fetchAll();

        return array_map(static function (array $row): array {
            foreach (['options', 'windows', 'state'] as $field) {
                $row[$field] = json_decode((string) $row[$field], true) ?: [];
            }
            return $row;
        }, $rows);
    }

    /** @param array<string, mixed> $state */
    public function saveState(string $endpoint, string $routeId, array $state): void
    {
        $this->pdo->prepare('UPDATE push_routes SET state = ? WHERE endpoint = ? AND route_id = ?')
            ->execute([json_encode($state ?: new \stdClass()), $endpoint, $routeId]);
    }

    public function count(): int
    {
        return (int) $this->pdo->query('SELECT COUNT(*) FROM push_routes')->fetchColumn();
    }
}
