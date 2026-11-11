<?php

declare(strict_types=1);

namespace KwInfo\Push;

use Closure;
use KwInfo\Clock;
use KwInfo\Config;
use KwInfo\Gtfs\DayTimetable as D;
use KwInfo\Gtfs\Timetable;
use KwInfo\Live\Realtime;
use Throwable;

/**
 * Powiadomienia o obserwowanych podróżach (uruchamiane po odświeżeniu danych na żywo, co minutę):
 * opóźnienie odjazdu (od 3 min, potem przy zmianie o 3 min i po powrocie do rozkładu), odwołanie kursu
 * i zagrożona przesiadka. Treść liczona na serwerze z rozkładu i danych PKP PLK.
 */
final class JourneyWatcher
{
    /** Powiadamiamy o odcinku, który odjeżdża najwyżej tyle przed czasem. */
    private const LOOKAHEAD = 3 * 3600;

    /** @var array<int, D> */
    private array $days = [];

    /**
     * @param Closure(string): void|null $log
     * @param Closure(array<string, string>, array<string, mixed>): int|null $sender (testy) zamiast WebPush::send
     */
    public function __construct(private Timetable $tt, private ?Closure $log = null, private ?Closure $sender = null)
    {
    }

    public function run(?Realtime $rt = null, ?int $now = null): void
    {
        $repo = new PushRepository();
        $now ??= time();
        $repo->purge($now);
        $watches = $repo->all();
        if ($watches === []) {
            return;
        }
        $rt ??= Realtime::fromStorage();
        $sent = 0;
        foreach ($watches as $w) {
            try {
                $legs = $this->legs($w['legs'], $rt);
                if ($legs === null) {
                    $repo->delete($w['endpoint'], $w['journey_id']);
                    continue;
                }
                [$messages, $state, $done] = self::evaluate($legs, $w['state'], $now);
                foreach ($messages as $message) {
                    $status = ($this->sender ?? WebPush::send(...))(
                        ['endpoint' => $w['endpoint'], 'p256dh' => $w['p256dh'], 'auth' => $w['auth']],
                        $message + ['tag' => 'podroz-' . $w['journey_id'], 'url' => Config::get('site_path') . '/#moje-podroze']
                    );
                    if ($status === 404 || $status === 410) {
                        // subskrypcja wygasła (np. wyczyszczone dane przeglądarki) — usuwamy wszystkie jej podróże
                        $repo->delete($w['endpoint']);
                        continue 2;
                    }
                    $sent++;
                }
                $done ? $repo->delete($w['endpoint'], $w['journey_id']) : $repo->saveState($w['endpoint'], $w['journey_id'], $state);
            } catch (Throwable $e) {
                $this->log('Powiadomienie nie wysłane: ' . $e->getMessage());
            }
        }
        if ($sent > 0) {
            $this->log('Powiadomienia: ' . $sent . ' (obserwowane podróże: ' . count($watches) . ')');
        }
    }

    /**
     * Stan odcinków z rozkładu i danych na żywo; null, gdy któregoś kursu nie ma już w rozkładzie.
     * @param array<int, array<string, string>> $legs [{key, from, to}]
     * @return array<int, array{number: string, from: string, to: string, dep: int, arr: int, depDelay: int|null, arrDelay: int|null, cancelled: bool}>|null
     */
    public function legs(array $legs, Realtime $rt): ?array
    {
        $out = [];
        foreach ($legs as $leg) {
            if (preg_match('/@(\d{8})$/', (string) ($leg['key'] ?? ''), $m) !== 1) {
                return null;
            }
            $date = (int) $m[1];
            // z kursami POLREGIO — podróż z wyszukiwarki może mieć odcinek innego przewoźnika
            $day = $this->days[$date] ??= D::load($this->tt, $date, true);
            $trip = $day->trips[$leg['key']] ?? null;
            $from = $trip ? D::indexOf($trip, (string) $leg['from']) : null;
            $to = $trip && $from !== null ? D::indexOf($trip, (string) $leg['to'], $from) : null;
            if ($trip === null || $from === null || $to === null) {
                return null;
            }
            $exp = $rt->apply($trip, Clock::secondsSince($date));
            $s = $trip['stops'];
            $out[] = [
                'number' => (string) $trip['number'],
                'agency' => (string) ($trip['agency'] ?? $this->tt->agency()),
                'from' => (string) ($this->tt->station($s[$from][D::STATION])['name'] ?? $s[$from][D::STATION]),
                'to' => (string) ($this->tt->station($s[$to][D::STATION])['name'] ?? $s[$to][D::STATION]),
                'dep' => Clock::at($date, (int) ($s[$from][D::DEP] ?? $s[$from][D::ARR]))->getTimestamp(),
                'arr' => Clock::at($date, (int) ($s[$to][D::ARR] ?? $s[$to][D::DEP]))->getTimestamp(),
                'depDelay' => Realtime::minutes($exp['stops'][$from]['depDelay']),
                'arrDelay' => Realtime::minutes($exp['stops'][$to]['arrDelay']),
                'cancelled' => $exp['cancelled'] || $exp['stops'][$from]['skipped'] || $exp['stops'][$to]['skipped'],
            ];
        }

        return $out === [] ? null : $out;
    }

    /** Czas zakończenia podróży (planowy przyjazd + zapas) — po nim wiersz jest usuwany. @param array<int, array<string, mixed>> $legs */
    public static function endsAt(array $legs): int
    {
        $last = end($legs);

        return $last['arr'] + (int) ($last['arrDelay'] ?? 0) * 60 + 1800;
    }

    /**
     * Które powiadomienia wysłać. Czysta funkcja (testy w selftest).
     * @param array<int, array{number: string, from: string, to: string, dep: int, arr: int, depDelay: int|null, arrDelay: int|null, cancelled: bool}> $legs
     * @param array<string, mixed> $state co już wysłano: d[i] ostatnio zgłoszone opóźnienie, c[i] odwołanie, t[i] przesiadka
     * @return array{0: array<int, array{title: string, body: string}>, 1: array<string, mixed>, 2: bool}
     */
    public static function evaluate(array $legs, array $state, int $now): array
    {
        $messages = [];
        $hm = static fn (int $ts): string => date('H:i', $ts);
        // „KW 77600”, „KML 30121”, „PR 85724” — odcinek bez przewoźnika: przewoźnik regionu
        $label = static fn (array $leg): string => ($leg['agency'] ?? Config::get('agency_id')) . ' ' . $leg['number'];
        $trip = $legs[0]['from'] . ' → ' . end($legs)['to'];
        foreach ($legs as $i => $leg) {
            $expected = $leg['dep'] + (int) ($leg['depDelay'] ?? 0) * 60;
            if ($now > $expected + 60 || $leg['dep'] - $now > self::LOOKAHEAD) {
                continue;
            }
            if ($leg['cancelled']) {
                if (empty($state['c'][$i])) {
                    $state['c'][$i] = true;
                    $messages[] = [
                        'title' => $label($leg) . ' odwołany',
                        'body' => $leg['from'] . ', odjazd ' . $hm($leg['dep']) . ': ten pociąg dziś nie jedzie. Znajdź inne połączenie (' . $trip . ').',
                    ];
                }
                continue;
            }
            $delay = $leg['depDelay'];
            if ($delay === null) {
                continue;
            }
            $last = (int) ($state['d'][$i] ?? 0);
            if ($delay >= 3 && abs($delay - $last) >= 3) {
                $state['d'][$i] = $delay;
                $messages[] = [
                    'title' => $label($leg) . ': opóźnienie +' . $delay . ' min',
                    'body' => $leg['from'] . ': odjazd o ' . $hm($expected) . ' zamiast ' . $hm($leg['dep']) . '. Podróż ' . $trip . '.',
                ];
            } elseif ($last >= 3 && $delay <= 1) {
                $state['d'][$i] = $delay;
                $messages[] = [
                    'title' => $label($leg) . ' jedzie planowo',
                    'body' => $leg['from'] . ': odjazd o ' . $hm($expected) . '. Podróż ' . $trip . '.',
                ];
            }
        }
        for ($i = 0; $i < count($legs) - 1; $i++) {
            [$a, $b] = [$legs[$i], $legs[$i + 1]];
            if (!empty($state['t'][$i]) || $a['arrDelay'] === null || $b['cancelled'] || $now > $b['dep'] || $b['dep'] - $now > self::LOOKAHEAD) {
                continue;
            }
            $arrive = $a['arr'] + $a['arrDelay'] * 60;
            $leave = $b['dep'] + (int) ($b['depDelay'] ?? 0) * 60;
            // mniej niż 2 minuty na przesiadkę, a planowo było więcej
            if ($leave - $arrive < 120 && $b['dep'] - $a['arr'] >= 120) {
                $state['t'][$i] = true;
                $messages[] = [
                    'title' => 'Przesiadka zagrożona: ' . $a['to'],
                    'body' => $label($a) . ' przyjedzie o ' . $hm($arrive) . ', a ' . $label($b) . ' odjeżdża o ' . $hm($leave) . '.',
                ];
            }
        }

        return [$messages, $state, $now > self::endsAt($legs) - 900];
    }

    private function log(string $line): void
    {
        if ($this->log !== null) {
            ($this->log)($line);
        }
    }
}
