<?php

declare(strict_types=1);

namespace KwInfo\Stats;

use KwInfo\Clock;
use KwInfo\Config;
use PDO;

/**
 * Punktualność kursów (stats.sqlite — osobno od app.sqlite, żeby codzienne kopie bazy komunikatów zostały małe).
 * Jeden wiersz na kurs danego dnia: opóźnienie na stacji końcowej (dla POLREGIO i PKP Intercity — ostatniej w Wielkopolsce),
 * odjazdu ze stacji początkowej i największe po drodze albo odwołanie. Zapisuje PunctualityRecorder z danych GTFS-RT PKP PLK.
 */
final class PunctualityRepository
{
    /** na czas = opóźnienie poniżej 6 min (jak w statystykach UTK: do 5 min 59 s) */
    public const ON_TIME = 360;
    public const KEEP_DAYS = 400;
    /**
     * Przyjazd przed czasem liczy się jako na czas (opóźnienie 0). Feed potrafi jednak podać przyjazd godzinę przed czasem
     * (zwłaszcza PKP Intercity na ostatniej stacji w Wielkopolsce) — poniżej tej granicy to błąd danych, kurs pomijamy.
     */
    public const IMPLAUSIBLE = -900;

    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? self::connect();
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS punctuality (
                trip_key TEXT PRIMARY KEY,
                service_date INTEGER NOT NULL,
                number TEXT NOT NULL,
                agency TEXT NOT NULL,
                route_id TEXT NOT NULL,
                origin TEXT NOT NULL,
                destination TEXT NOT NULL,
                scheduled_departure INTEGER NOT NULL,
                departure_delay INTEGER NULL,
                arrival_delay INTEGER NULL,
                max_delay INTEGER NULL,
                skipped INTEGER NOT NULL DEFAULT 0,
                cancelled INTEGER NOT NULL DEFAULT 0,
                recorded_at TEXT NOT NULL
            )'
        );
        $this->pdo->exec('CREATE INDEX IF NOT EXISTS punctuality_number ON punctuality (number, agency, service_date)');
        $this->pdo->exec('CREATE INDEX IF NOT EXISTS punctuality_date ON punctuality (service_date)');
    }

    public static function connect(?string $path = null): PDO
    {
        $path ??= Config::path('stats_db');
        if (!is_dir(dirname($path))) {
            mkdir(dirname($path), 0775, true);
        }
        $pdo = new PDO('sqlite:' . $path, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
        $pdo->exec('PRAGMA journal_mode = WAL');
        $pdo->exec('PRAGMA busy_timeout = 3000');

        return $pdo;
    }

    /** Kursy już zapisane z danego dnia (klucz => true). @return array<string, true> */
    public function recordedKeys(int $serviceDate): array
    {
        $stmt = $this->pdo->prepare('SELECT trip_key FROM punctuality WHERE service_date = ?');
        $stmt->execute([$serviceDate]);

        return array_fill_keys($stmt->fetchAll(PDO::FETCH_COLUMN), true);
    }

    /** @param array<int, array<string, mixed>> $rows wiersze z PunctualityRecorder::outcome @return int ile nowych */
    public function insert(array $rows): int
    {
        if ($rows === []) {
            return 0;
        }
        $stmt = $this->pdo->prepare(
            'INSERT OR IGNORE INTO punctuality (trip_key, service_date, number, agency, route_id, origin, destination, scheduled_departure,
                departure_delay, arrival_delay, max_delay, skipped, cancelled, recorded_at)
             VALUES (:trip_key, :service_date, :number, :agency, :route_id, :origin, :destination, :scheduled_departure,
                :departure_delay, :arrival_delay, :max_delay, :skipped, :cancelled, :recorded_at)'
        );
        $now = Clock::now()->format(DATE_ATOM);
        $added = 0;
        $this->pdo->beginTransaction();
        foreach ($rows as $row) {
            $stmt->execute($row + ['recorded_at' => $now]);
            $added += $stmt->rowCount();
        }
        $this->pdo->commit();

        return $added;
    }

    public function prune(): int
    {
        return $this->pdo->exec('DELETE FROM punctuality WHERE service_date < ' . Clock::addDays(Clock::today(), -self::KEEP_DAYS)) ?: 0;
    }

    /** @return array{count: int, since: int|null} */
    public function info(): array
    {
        $row = $this->pdo->query('SELECT COUNT(*) AS n, MIN(service_date) AS since FROM punctuality')->fetch();

        return ['count' => (int) $row['n'], 'since' => $row['since'] !== null ? (int) $row['since'] : null];
    }

    /**
     * Podsumowanie pociągu (numer jak w rozkładzie, np. „77610/1”) z ostatnich $days dni, z dzisiejszymi kursami, które już dojechały.
     * @return array<string, mixed>
     */
    public function summary(string $number, string $agency, int $days = 30): array
    {
        $from = Clock::addDays(Clock::today(), -$days);
        $stmt = $this->pdo->prepare(
            'SELECT service_date, arrival_delay, cancelled, skipped FROM punctuality
             WHERE number = ? AND agency = ? AND service_date > ? ORDER BY service_date, scheduled_departure'
        );
        $stmt->execute([$number, $agency, $from]);

        $since = $this->info()['since'];

        return self::summarize($stmt->fetchAll(), $days) + ['number' => $number, 'agency' => $agency, 'since' => $since !== null ? Clock::isoDate($since) : null];
    }

    /** @param array<int, array<string, mixed>> $rows @return array<string, mixed> */
    public static function summarize(array $rows, int $days): array
    {
        $rows = array_values(array_filter($rows, static fn (array $r): bool => $r['arrival_delay'] === null || (int) $r['arrival_delay'] >= self::IMPLAUSIBLE));
        $ran = array_values(array_filter($rows, static fn (array $r): bool => (int) $r['cancelled'] === 0 && $r['arrival_delay'] !== null));
        $delays = array_map(static fn (array $r): int => max(0, (int) $r['arrival_delay']), $ran);
        $onTime = count(array_filter($delays, static fn (int $d): bool => $d < self::ON_TIME));
        $cancelled = count(array_filter($rows, static fn (array $r): bool => (int) $r['cancelled'] === 1));

        return [
            'days' => $days,
            'runs' => count($rows),
            'onTime' => $onTime,
            'late' => count($ran) - $onTime,
            'cancelled' => $cancelled,
            // odsetek kursów na czas spośród wszystkich (odwołany = nie na czas)
            'share' => $rows !== [] ? (int) round($onTime / count($rows) * 100) : null,
            'avgDelay' => $delays !== [] ? (int) round(array_sum($delays) / count($delays) / 60) : null,
            'maxDelay' => $delays !== [] ? (int) round(max($delays) / 60) : null,
            'recent' => array_map(static fn (array $r): array => [
                'date' => Clock::isoDate((int) $r['service_date']),
                'delay' => $r['arrival_delay'] !== null && (int) $r['cancelled'] === 0 ? (int) round(max(0, (int) $r['arrival_delay']) / 60) : null,
                'cancelled' => (int) $r['cancelled'] === 1,
            ], array_slice($rows, -30)),
        ];
    }
}
