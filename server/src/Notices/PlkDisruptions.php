<?php

declare(strict_types=1);

namespace KwInfo\Notices;

use Closure;
use KwInfo\Clock;
use KwInfo\Config;
use KwInfo\Net\HttpClient;
use PDO;
use RuntimeException;

/**
 * Utrudnienia z otwartego API PKP PLK (pdp-api.plk-sa.pl, GET /api/v1/disruptions) → szkice komunikatów w panelu.
 * Bierze tylko utrudnienia z treścią (bez samych kodów przyczyn opóźnień pojedynczych pociągów), dotyczące stacji
 * z rozkładu regionu. Utrudnienia na tym samym odcinku (oba kierunki, odwołanie + komunikacja zastępcza) = jeden szkic.
 * Szkic, którego administrator nie ruszał, jest poprawiany przy zmianie w PLK i usuwany, gdy utrudnienie zniknie;
 * poprawiony albo opublikowany komunikat wtedy wygasa. Usunięty w panelu szkic nie wraca (wpis w plk_notices zostaje).
 */
final class PlkDisruptions
{
    public const URL = 'https://pdp-api.plk-sa.pl/api/v1/disruptions';
    /** ile dni naprzód (API: najwyżej 31) */
    public const DAYS = 7;
    public const SOURCE = 'plk';
    /** regulamin API (pkt 3.3): przy publikacji podać źródło danych */
    public const ATTRIBUTION = 'Źródło: PKP Polskie Linie Kolejowe S.A.';

    private Closure $log;

    public function __construct(private PDO $app, private PDO $gtfs, private NoticeRepository $notices, ?Closure $log = null)
    {
        $this->log = $log ?? static function (string $line): void {
        };
        $app->exec('CREATE TABLE IF NOT EXISTS plk_notices (
            key TEXT PRIMARY KEY,
            notice_id INTEGER NOT NULL,
            hash TEXT NOT NULL,
            written_at TEXT NOT NULL
        )');
    }

    public static function create(?Closure $log = null): self
    {
        $app = NoticeRepository::connect();
        $gtfs = new PDO('sqlite:' . Config::path('gtfs_db'), null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        return new self($app, $gtfs, new NoticeRepository($app), $log);
    }

    public function run(string $key): void
    {
        $today = Clock::now();
        $url = self::URL . '?' . http_build_query([
            'dateFrom' => $today->format('Y-m-d'),
            'dateTo' => $today->modify('+' . self::DAYS . ' days')->format('Y-m-d'),
        ]);
        $response = HttpClient::get($url, ['X-API-Key: ' . $key, 'Accept: application/json'], 30);
        if ($response['status'] !== 200) {
            throw new RuntimeException('PKP PLK: HTTP ' . $response['status'] . ' ' . mb_substr($response['body'], 0, 200));
        }
        $data = json_decode($response['body'], true);
        if (!is_array($data) || !is_array($data['disruptions'] ?? null)) {
            throw new RuntimeException('PKP PLK: nieoczekiwana odpowiedź');
        }
        $stats = $this->sync($data);
        ($this->log)(sprintf('PKP PLK: %d utrudnień, w regionie %d szkiców (nowe %d, zmienione %d, zakończone %d)',
            count($data['disruptions']), $stats['relevant'], $stats['added'], $stats['updated'], $stats['removed']));
    }

    /**
     * @param array<string, mixed> $data pełna odpowiedź /disruptions (bez `since`)
     * @return array{relevant: int, added: int, updated: int, removed: int}
     */
    public function sync(array $data): array
    {
        $stats = ['relevant' => 0, 'added' => 0, 'updated' => 0, 'removed' => 0];
        $known = [];
        foreach ($this->app->query('SELECT * FROM plk_notices') as $row) {
            $known[(string) $row['key']] = $row;
        }
        $seen = [];
        foreach (self::groups($data['disruptions']) as $key => $group) {
            $notice = $this->notice($group, (array) ($data['stations'] ?? []), (array) ($data['disruptionTypes'] ?? []));
            if ($notice === null) {
                continue;
            }
            $seen[$key] = true;
            $stats['relevant']++;
            $hash = md5(json_encode($notice));
            $row = $known[$key] ?? null;
            if ($row === null) {
                $saved = $this->notices->save($notice, null, self::SOURCE);
                $this->remember($key, $saved['id'], $hash, $saved['updatedAt']);
                $stats['added']++;
            } elseif ($row['hash'] !== $hash) {
                $current = $this->notices->find((int) $row['notice_id']);
                if ($current !== null && $this->untouched($current, $row)) {
                    $saved = $this->notices->save($notice, $current['id']);
                    $this->remember($key, $saved['id'], $hash, $saved['updatedAt']);
                    $stats['updated']++;
                } else {
                    // poprawiony, opublikowany albo usunięty w panelu — zostaje, jak jest
                    $this->remember($key, (int) $row['notice_id'], $hash, (string) $row['written_at']);
                }
            }
        }
        // shortcut: pusta lista przy wielu znanych utrudnieniach = raczej błąd API niż koniec wszystkich; gdyby się zdarzało naprawdę — przejść na `since` + removedDisruptionIds
        if ($seen === [] && count($known) >= 5) {
            ($this->log)('PKP PLK: brak utrudnień w regionie — pomijam kończenie znanych');
            return $stats;
        }
        foreach (array_diff_key($known, $seen) as $key => $row) {
            $current = $this->notices->find((int) $row['notice_id']);
            if ($current !== null) {
                $this->untouched($current, $row) ? $this->notices->delete($current['id']) : $this->notices->expire($current['id']);
            }
            $this->app->prepare('DELETE FROM plk_notices WHERE key = ?')->execute([$key]);
            $stats['removed']++;
        }

        return $stats;
    }

    /**
     * Utrudnienia z treścią, pogrupowane: odcinek A–B bez względu na kierunek i rodzaj, inne osobno.
     * Pominięte: sama treść „utr_42” = przyczyna opóźnienia pojedynczych pociągów, nie komunikat.
     * @param array<int, mixed> $disruptions
     * @return array<string, array<int, array<string, mixed>>>
     */
    public static function groups(array $disruptions): array
    {
        $groups = [];
        foreach ($disruptions as $d) {
            if (!is_array($d) || !isset($d['disruptionId']) || preg_match('/^\s*(utr_\d+)?\s*$/', (string) ($d['message'] ?? '')) === 1) {
                continue;
            }
            $a = (int) ($d['startStationId'] ?? 0);
            $b = (int) ($d['endStationId'] ?? 0);
            if ($a > 0 && $b > 0 && $a !== $b) {
                $key = 'odcinek:' . min($a, $b) . '-' . max($a, $b);
            } elseif (preg_match('/^\s*(\p{Lu}[\p{L}. ]*?)\s+-\s+(\p{Lu}[\p{L}. ]*?)\.\s/u', (string) $d['message'], $m) === 1) {
                // utrudnienie z dyżurki bez stacji w danych, treść zaczyna się od odcinka: „Buk - Opalenica. Wypadek…”
                [$d['_from'], $d['_to']] = [$m[1], $m[2]];
                $pair = [mb_strtolower($m[1]), mb_strtolower($m[2])];
                sort($pair);
                $key = 'odcinek:' . implode('-', $pair);
            } else {
                $key = 'id:' . $d['disruptionId'];
            }
            $groups[$key][] = $d;
        }
        foreach ($groups as &$group) {
            // stała kolejność — tytuł i treść nie skaczą między pobraniami
            usort($group, static fn ($x, $y) => strcmp((string) $x['disruptionId'], (string) $y['disruptionId']));
        }

        return $groups;
    }

    /** szkic, którego od zapisu z PLK nikt nie zmieniał */
    private function untouched(array $notice, array $row): bool
    {
        return !$notice['active'] && $notice['updatedAt'] === $row['written_at'];
    }

    private function remember(string $key, int $noticeId, string $hash, string $writtenAt): void
    {
        $this->app->prepare('INSERT OR REPLACE INTO plk_notices (key, notice_id, hash, written_at) VALUES (?, ?, ?, ?)')
            ->execute([$key, $noticeId, $hash, $writtenAt]);
    }

    /**
     * Grupa utrudnień → dane komunikatu (jak z panelu), null gdy nie dotyczy stacji regionu.
     * @param array<int, array<string, mixed>> $group
     * @param array<string|int, string> $names słownik stacji PLK (id → nazwa)
     * @param array<string, string> $types słownik typów utrudnień (kod → nazwa)
     * @return array<string, mixed>|null
     */
    public function notice(array $group, array $names, array $types): ?array
    {
        $routes = [];
        $plkIds = [];
        $messages = [];
        foreach ($group as $d) {
            $own = array_filter((array) ($d['affectedRoutes'] ?? []), 'is_array');
            array_push($routes, ...$own);
            array_push($plkIds, $d['startStationId'] ?? null, $d['endStationId'] ?? null, ...array_column($own, 'stationId'));
            $message = trim(preg_replace('/[ \t]{2,}/', ' ', (string) ($d['message'] ?? '')) ?? '');
            // drugi kierunek ma tę samą treść z zamienionymi stacjami — jedna wystarczy na rodzaj utrudnienia
            $messages[(string) ($d['disruptionTypeCode'] ?? $message)] ??= $message;
        }
        $stations = [];
        $kwStations = [];
        foreach (array_unique(array_filter($plkIds, static fn ($v) => $v !== null)) as $plkId) {
            $station = $this->station((int) $plkId, (string) ($names[$plkId] ?? ''));
            if ($station !== null && !in_array($station['id'], $stations, true)) {
                $stations[] = $station['id'];
                if ($station['kw'] === 1) {
                    $kwStations[] = $station['id'];
                }
            }
        }
        $trains = $this->trains($routes);
        // jedna stacja i żaden nasz pociąg = utrudnienie za granicą regionu (np. Kutno – Skierniewice)
        if ($stations === [] || (count($stations) < 2 && $trains === [])) {
            return null;
        }
        $first = $group[0];
        $from = $names[$first['startStationId'] ?? ''] ?? $first['_from'] ?? null;
        $to = $names[$first['endStationId'] ?? ''] ?? $first['_to'] ?? null;
        $segment = $from !== null && $to !== null && $from !== $to ? $from . ' – ' . $to : ($from ?? $to ?? '');
        $label = self::label($messages, $types[$first['disruptionTypeCode'] ?? ''] ?? '');
        $dates = array_filter(array_map(static fn ($r) => substr((string) ($r['operatingDate'] ?? ''), 0, 10), $routes),
            static fn ($v) => preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) === 1);

        return [
            'title' => $segment !== '' ? $label . ': ' . $segment : $label,
            'body' => implode("\n\n", array_values($messages)) . "\n\n" . self::ATTRIBUTION,
            'line' => $segment !== '' ? $segment : 'Cała sieć KW',
            'severity' => 'warning',
            'startsAt' => null,
            'endsAt' => $dates !== [] ? max($dates) . 'T23:59' : null,
            'active' => false,
            'trains' => $trains,
            'stations' => $kwStations,
            'lines' => [],
        ];
    }

    /** krótki rodzaj do tytułu; nazwy typów PLK bywają całymi zdaniami z {polami} */
    private static function label(array $messages, string $type): string
    {
        $text = mb_strtolower(implode(' ', $messages) . ' ' . $type);
        if (str_contains($text, 'komunikacj') && str_contains($text, 'zastępcz')) {
            return 'Komunikacja zastępcza';
        }
        if (str_contains($text, 'wstrzyman')) {
            return 'Wstrzymany ruch';
        }
        $type = trim($type);

        return $type !== '' && !str_contains($type, '{') && mb_strlen($type) <= 60 ? $type : 'Utrudnienia w ruchu';
    }

    /** @return array{id: string, kw: int}|null stacja rozkładu: po id (rozkład mkuran ma id stacji PLK), inaczej po nazwie */
    private function station(int $plkId, string $name): ?array
    {
        $stmt = $this->gtfs->prepare('SELECT id, kw FROM stations WHERE id = ?');
        $stmt->execute([(string) $plkId]);
        $row = $stmt->fetch();
        if (!$row && $name !== '') {
            $stmt = $this->gtfs->prepare('SELECT id, kw FROM stations WHERE name = ? COLLATE NOCASE');
            $stmt->execute([$name]);
            $row = $stmt->fetch();
        }

        return $row ? ['id' => (string) $row['id'], 'kw' => (int) $row['kw']] : null;
    }

    /**
     * Numery pociągów jak w komunikacie z panelu: sam numer — przewoźnik regionu, „PR …”/„IC …” — partnerzy.
     * trip_id rozkładu mkuran = PLK_{przewoźnik}_{scheduleId}_{orderId}, z komunikacją zastępczą także …_LEG0, _LEG1.
     * @param array<int, array<string, mixed>> $routes
     * @return array<int, string>
     */
    private function trains(array $routes): array
    {
        $own = (string) Config::get('agency_id');
        // „_” < „`” — zakres łapie „…_LEG0” i podobne bez LIKE (indeks na trip_id)
        $stmt = $this->gtfs->prepare('SELECT short_name, agency FROM trips WHERE trip_id = :t OR (trip_id > :t || \'_\' AND trip_id < :t || \'`\') LIMIT 1');
        $orders = [];
        foreach ($routes as $r) {
            foreach ([$r['orderId'] ?? null, $r['trainOrderId'] ?? null] as $order) {
                if ($order !== null) {
                    $orders[(int) ($r['scheduleId'] ?? 0) . '_' . (int) $order] = true;
                }
            }
        }
        $out = [];
        foreach (array_keys($orders) as $suffix) {
            foreach ([$own, 'PR', 'IC'] as $agency) {
                $stmt->execute(['t' => 'PLK_' . $agency . '_' . $suffix]);
                $trip = $stmt->fetch();
                if (!$trip || preg_match('/^(\d{3,6})/', (string) $trip['short_name'], $m) !== 1) {
                    continue;
                }
                $number = $trip['agency'] === $own ? $m[1] : $trip['agency'] . ' ' . $m[1];
                if (!in_array($number, $out, true)) {
                    $out[] = $number;
                }
                break;
            }
        }
        // najpierw pociągi przewoźnika regionu
        usort($out, static fn ($a, $b) => (int) !ctype_digit($a) <=> (int) !ctype_digit($b));

        return array_slice($out, 0, 40);
    }
}
