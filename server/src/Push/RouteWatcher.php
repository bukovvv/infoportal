<?php

declare(strict_types=1);

namespace KwInfo\Push;

use Closure;
use DateTimeImmutable;
use KwInfo\Clock;
use KwInfo\Gtfs\ConnectionFinder;
use KwInfo\Gtfs\DayTimetable as D;
use KwInfo\Gtfs\Timetable;
use KwInfo\Live\Realtime;
use Throwable;

/**
 * Powiadomienia o obserwowanych trasach (po odświeżeniu danych na żywo, co minutę, razem z JourneyWatcher):
 * w okienku czasu trasy (dni tygodnia + godziny odjazdu) szukamy połączeń jak wyszukiwarka, z opcjami zapisanymi
 * przy trasie, i zgłaszamy opóźnienie odjazdu pociągu ze stacji początkowej od DELAY min (ponownie przy zmianie
 * o DELAY min i po powrocie do rozkładu) oraz odwołanie każdego pociągu tych połączeń. Od LEAD przed okienkiem.
 */
final class RouteWatcher
{
    public const LEAD = 3600;
    public const DELAY = 5;
    /** najwięcej powiadomień o jednej trasie w jednym przebiegu (reszta w następnym) */
    public const MAX_PER_RUN = 3;

    /** @var array<int, D> */
    private array $days = [];
    /** @var array<string, array<int, array<string, mixed>>> */
    private array $found = [];

    /**
     * @param Closure(string): void|null $log
     * @param Closure(array<string, string>, array<string, mixed>): int|null $sender (testy) zamiast WebPush::send
     */
    public function __construct(private Timetable $tt, private ?Closure $log = null, private ?Closure $sender = null)
    {
    }

    public function run(?Realtime $rt = null, ?int $now = null): void
    {
        $repo = new RouteRepository();
        $now ??= time();
        $repo->purge($now);
        $rows = $repo->all();
        if ($rows === []) {
            return;
        }
        $at = (new DateTimeImmutable('@' . $now))->setTimezone(Clock::zone());
        $date = (int) $at->format('Ymd');
        $weekday = (int) $at->format('N');
        $sec = Clock::secondsSince($date, $at);
        $sent = 0;
        foreach ($rows as $r) {
            try {
                $legs = [];
                foreach ($r['windows'] as $w) {
                    if (!self::active($w, $weekday, $sec)) {
                        continue;
                    }
                    $rt ??= Realtime::fromStorage();
                    [$from, $to] = ($w['dir'] ?? 'ab') === 'ba' ? [$r['to_id'], $r['from_id']] : [$r['from_id'], $r['to_id']];
                    foreach ($this->legs($from, $to, $r['options'], $date, $w, $rt, $sec) as $leg) {
                        $legs[$leg['id']] ??= $leg;
                    }
                }
                $old = self::prune($r['state'], $date);
                [$messages, $state] = self::evaluate(array_values($legs), $old, $now);
                foreach ($messages as $message) {
                    $status = ($this->sender ?? WebPush::send(...))(
                        ['endpoint' => $r['endpoint'], 'p256dh' => $r['p256dh'], 'auth' => $r['auth']],
                        $message + ['url' => '/#moje-trasy']
                    );
                    if ($status === 404 || $status === 410) {
                        // subskrypcja wygasła — usuwamy jej trasy i podróże
                        $repo->delete($r['endpoint']);
                        (new PushRepository())->delete($r['endpoint']);
                        continue 2;
                    }
                    $sent++;
                }
                if ($state !== $r['state']) {
                    $repo->saveState($r['endpoint'], $r['route_id'], $state);
                }
            } catch (Throwable $e) {
                $this->log('Powiadomienie o trasie nie wysłane: ' . $e->getMessage());
            }
        }
        if ($sent > 0) {
            $this->log('Powiadomienia o trasach: ' . $sent . ' (obserwowane trasy: ' . count($rows) . ')');
        }
    }

    /** Okienko obowiązuje dziś i trwa (albo zaczyna się w ciągu LEAD). @param array<string, mixed> $w */
    public static function active(array $w, int $weekday, int $sec): bool
    {
        return in_array($weekday, (array) ($w['days'] ?? []), true)
            && $sec >= (int) ($w['start'] ?? 0) - self::LEAD && $sec <= (int) ($w['end'] ?? -1);
    }

    /**
     * Pociągi połączeń z odjazdem w okienku: stan na żywo każdego odcinka.
     * @param array<string, mixed> $options {transfers, minTransfer, agencies}
     * @param array<string, mixed> $w {start, end} w sekundach od północy
     * @return array<int, array{id: string, number: string, agency: string, from: string, route: string, dep: int, depDelay: int|null, cancelled: bool, first: bool}>
     */
    public function legs(string $from, string $to, array $options, int $date, array $w, Realtime $rt, int $sec): array
    {
        $day = $this->days[$date] ??= D::load($this->tt, $date, true);
        $start = (int) $w['start'];
        $end = (int) $w['end'];
        $cache = implode('|', [$from, $to, json_encode($options), $date, $start, $end]);
        if (!isset($this->found[$cache])) {
            $agencies = (array) ($options['agencies'] ?? []);
            $skip = static fn (string $key): bool => $agencies !== [] && !in_array($day->trips[$key]['agency'], $agencies, true);
            $minTransfer = max(2, min(30, (int) ($options['minTransfer'] ?? 3))) * 60;
            $finder = new ConnectionFinder($day, minTransfer: $minTransfer, window: max(60, $end - $start), isCancelled: $skip);
            $this->found[$cache] = array_values(array_filter(
                $finder->find($from, $to, $start, 16, max(0, min(2, (int) ($options['transfers'] ?? 2)))),
                static fn (array $c): bool => $c['dep'] <= $end
            ));
        }
        $route = $this->name($from) . ' → ' . $this->name($to);
        $out = [];
        foreach ($this->found[$cache] as $c) {
            foreach ($c['legs'] as $i => $l) {
                $trip = $day->trips[$l['key']];
                $exp = $rt->apply($trip, $sec);
                $stop = $trip['stops'][$l['from']];
                $out[] = [
                    'id' => $l['key'] . '|' . $stop[D::STATION],
                    'number' => (string) $trip['number'],
                    'agency' => (string) $trip['agency'],
                    'from' => $this->name($stop[D::STATION]),
                    'route' => $route,
                    'dep' => Clock::at($date, (int) $stop[D::DEP])->getTimestamp(),
                    'depDelay' => Realtime::minutes($exp['stops'][$l['from']]['depDelay']),
                    'cancelled' => $exp['cancelled'] || $exp['stops'][$l['from']]['skipped'] || $exp['stops'][$l['to']]['skipped'],
                    'first' => $i === 0,
                ];
            }
        }

        return $out;
    }

    /** Usuwa ze stanu kursy sprzed wczoraj. @param array<string, mixed> $state @return array<string, mixed> */
    public static function prune(array $state, int $date): array
    {
        $min = Clock::addDays($date, -1);
        foreach (['c', 'd'] as $k) {
            foreach (array_keys((array) ($state[$k] ?? [])) as $id) {
                if (preg_match('/@(\d{8})\|/', (string) $id, $m) !== 1 || (int) $m[1] < $min) {
                    unset($state[$k][$id]);
                }
            }
            if (($state[$k] ?? null) === []) {
                unset($state[$k]);
            }
        }

        return $state;
    }

    /**
     * Które powiadomienia wysłać. Czysta funkcja (testy w selftest).
     * @param array<int, array{id: string, number: string, agency: string, from: string, route: string, dep: int, depDelay: int|null, cancelled: bool, first: bool}> $legs
     * @param array<string, mixed> $state co już wysłano: d[id] ostatnio zgłoszone opóźnienie, c[id] odwołanie
     * @return array{0: array<int, array{title: string, body: string, tag: string}>, 1: array<string, mixed>}
     */
    public static function evaluate(array $legs, array $state, int $now): array
    {
        $messages = [];
        $hm = static fn (int $ts): string => (new DateTimeImmutable('@' . $ts))->setTimezone(Clock::zone())->format('H:i');
        foreach ($legs as $leg) {
            if (count($messages) >= self::MAX_PER_RUN) {
                break;
            }
            $id = $leg['id'];
            $expected = $leg['dep'] + (int) ($leg['depDelay'] ?? 0) * 60;
            if ($now > $expected + 60) {
                continue;
            }
            $train = ($leg['agency'] ?: 'KW') . ' ' . $leg['number'];
            $tag = 'trasa-' . substr(hash('sha256', $id), 0, 16);
            if ($leg['cancelled']) {
                if (empty($state['c'][$id])) {
                    $state['c'][$id] = true;
                    $messages[] = [
                        'title' => $train . ' odwołany',
                        'body' => $leg['from'] . ', odjazd ' . $hm($leg['dep']) . ': ten pociąg dziś nie jedzie. Trasa ' . $leg['route'] . '.',
                        'tag' => $tag,
                    ];
                }
                continue;
            }
            // opóźnienia tylko pociągów ze stacji początkowej (dalsze odcinki: same odwołania)
            $delay = $leg['depDelay'];
            if (!$leg['first'] || $delay === null) {
                continue;
            }
            $last = (int) ($state['d'][$id] ?? 0);
            if ($delay >= self::DELAY && abs($delay - $last) >= self::DELAY) {
                $state['d'][$id] = $delay;
                $messages[] = [
                    'title' => $train . ': opóźnienie +' . $delay . ' min',
                    'body' => $leg['from'] . ': odjazd o ' . $hm($expected) . ' zamiast ' . $hm($leg['dep']) . '. Trasa ' . $leg['route'] . '.',
                    'tag' => $tag,
                ];
            } elseif ($last >= self::DELAY && $delay <= 1) {
                $state['d'][$id] = $delay;
                $messages[] = [
                    'title' => $train . ' jedzie planowo',
                    'body' => $leg['from'] . ': odjazd o ' . $hm($expected) . '. Trasa ' . $leg['route'] . '.',
                    'tag' => $tag,
                ];
            }
        }

        return [$messages, $state];
    }

    private function name(string $id): string
    {
        return (string) ($this->tt->station($id)['name'] ?? $id);
    }

    private function log(string $line): void
    {
        if ($this->log !== null) {
            ($this->log)($line);
        }
    }
}
