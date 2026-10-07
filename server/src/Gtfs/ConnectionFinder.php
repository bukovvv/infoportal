<?php

declare(strict_types=1);

namespace KwInfo\Gtfs;

use KwInfo\Gtfs\DayTimetable as D;

/**
 * Połączenia bezpośrednie i z maks. dwiema przesiadkami na tej samej stacji. Wynik jest filtrowany (Pareto):
 * zostają połączenia, których nie da się poprawić wcześniejszym przyjazdem, późniejszym odjazdem
 * i mniejszą liczbą przesiadek jednocześnie. Połączenie z dwiema przesiadkami musi dodatkowo przyjechać
 * wyraźnie wcześniej (TWO_TRANSFER_GAIN) niż każde prostsze, które nie odjeżdża wcześniej. Odpada też połączenie
 * z przesiadką, gdy najwyżej EARLIER_SLACK wcześniej odjeżdża inne (bez większej liczby przesiadek), które przyjeżdża
 * co najmniej EARLIER_GAIN wcześniej. Wolniejsze pociągi bezpośrednie zostają.
 */
final class ConnectionFinder
{
    private const TWO_TRANSFER_GAIN = 900;
    private const EARLIER_SLACK = 900;
    private const EARLIER_GAIN = 1800;

    /** @param null|callable(string): bool $isCancelled */
    public function __construct(
        private readonly DayTimetable $day,
        private readonly int $minTransfer = 180,
        private readonly int $maxTransfer = 5400,
        private readonly int $window = 43200,
        private $isCancelled = null,
    ) {
    }

    /**
     * @return array<int, array{dep: int, arr: int, legs: array<int, array{key: string, from: int, to: int}>, waits: array<int, int>, via: array<int, string>}>
     */
    public function find(string $from, string $to, int $time, int $limit = 8, bool $directOnly = false): array
    {
        if ($from === $to) {
            return [];
        }
        $trips = $this->day->trips;
        $lastLegs = $directOnly ? [] : $this->lastLegs($from, $to);
        $results = [];
        foreach ($this->day->byStation[$from] ?? [] as [$key, $k]) {
            $trip = $trips[$key];
            $board = $trip['stops'][$k];
            $dep = $board[D::DEP];
            if ($dep === null || $dep < $time || $dep > $time + $this->window || $board[D::PICKUP] === 1 || $this->cancelled($key)) {
                continue;
            }
            // najlepsze połączenie tym pociągiem dla każdej liczby przesiadek (odjazd jest wspólny)
            $best = [];
            $count = count($trip['stops']);
            for ($j = $k + 1; $j < $count; $j++) {
                $stop = $trip['stops'][$j];
                $station = $stop[D::STATION];
                $arr = $stop[D::ARR] ?? $stop[D::DEP];
                if ($station === $to) {
                    if ($stop[D::DROPOFF] !== 1) {
                        $this->offer($best, ['dep' => $dep, 'arr' => $arr, 'legs' => [['key' => $key, 'from' => $k, 'to' => $j]], 'waits' => [], 'via' => []]);
                    }
                    break;
                }
                if ($directOnly || $stop[D::DROPOFF] === 1 || $station === $from) {
                    continue;
                }
                $leg1 = ['key' => $key, 'from' => $k, 'to' => $j];
                $last = $this->lastLeg($lastLegs[$station] ?? [], $arr, [$key]);
                if ($last !== null) {
                    $this->offer($best, ['dep' => $dep, 'arr' => $last['arr'], 'legs' => [$leg1, $last['leg']], 'waits' => [$last['wait']], 'via' => [$station]]);
                }

                // dwie przesiadki: dowolny kurs ze stacji $station do $station2, stamtąd ostatni odcinek
                foreach ($this->day->byStation[$station] as [$key2, $k2]) {
                    $trip2 = $trips[$key2];
                    $board2 = $trip2['stops'][$k2];
                    $wait = ($board2[D::DEP] ?? -1) - $arr;
                    if ($key2 === $key || $wait < $this->minTransfer || $wait > $this->maxTransfer || $board2[D::PICKUP] === 1 || $this->cancelled($key2)) {
                        continue;
                    }
                    $count2 = count($trip2['stops']);
                    for ($j2 = $k2 + 1; $j2 < $count2; $j2++) {
                        $stop2 = $trip2['stops'][$j2];
                        $station2 = $stop2[D::STATION];
                        $arr2 = $stop2[D::ARR] ?? $stop2[D::DEP];
                        // do celu ten kurs dowozi bez drugiej przesiadki; przez stację początkową nie wracamy;
                        // dalej nie ma sensu szukać, jeśli nawet bez czekania nie da się poprawić wyniku
                        if ($station2 === $to || $station2 === $from || $arr2 >= $this->twoTransferBound($best)) {
                            break;
                        }
                        if ($stop2[D::DROPOFF] === 1 || $station2 === $station) {
                            continue;
                        }
                        // ostatni pociąg nie może jechać przez pierwszą stację przesiadkową: wtedy wystarczy jedna przesiadka
                        $last = $this->lastLeg($lastLegs[$station2] ?? [], $arr2, [$key, $key2], $station);
                        if ($last !== null) {
                            $this->offer($best, [
                                'dep' => $dep,
                                'arr' => $last['arr'],
                                'legs' => [$leg1, ['key' => $key2, 'from' => $k2, 'to' => $j2], $last['leg']],
                                'waits' => [$wait, $last['wait']],
                                'via' => [$station, $station2],
                            ]);
                        }
                    }
                }
            }
            array_push($results, ...array_values($best));
        }

        usort($results, static fn (array $a, array $b): int => [$a['arr'], count($a['legs']), -$a['dep']] <=> [$b['arr'], count($b['legs']), -$b['dep']]);
        $useful = [];
        foreach ($results as $candidate) {
            foreach ($useful as $kept) {
                if ($kept['arr'] <= $candidate['arr'] && $kept['dep'] >= $candidate['dep'] && count($kept['legs']) <= count($candidate['legs'])) {
                    continue 2;
                }
            }
            $useful[] = $candidate;
        }
        $useful = array_values(array_filter($useful, static function (array $c) use ($useful): bool {
            $legs = count($c['legs']);
            if ($legs < 2) {
                return true;
            }
            foreach ($useful as $o) {
                if ($legs === 3 && count($o['legs']) < 3 && $o['dep'] >= $c['dep'] && $o['arr'] < $c['arr'] + self::TWO_TRANSFER_GAIN) {
                    return false;
                }
                // z przesiadką, choć chwilę wcześniej jedzie połączenie dużo szybsze i nie bardziej skomplikowane
                if (count($o['legs']) <= $legs && $o['dep'] < $c['dep'] && $c['dep'] - $o['dep'] <= self::EARLIER_SLACK && $c['arr'] - $o['arr'] >= self::EARLIER_GAIN) {
                    return false;
                }
            }

            return true;
        }));
        usort($useful, static fn (array $a, array $b): int => [$a['dep'], $a['arr']] <=> [$b['dep'], $b['arr']]);

        return array_slice($useful, 0, max(1, $limit));
    }

    /**
     * Ostatnie odcinki: kursy, którymi z danej stacji dojedzie się do celu (bez powrotu przez stację początkową).
     *
     * @return array<string, array<int, array{dep: int, arr: int, key: string, from: int, to: int}>> stacja => posortowane po odjeździe
     */
    private function lastLegs(string $from, string $to): array
    {
        $legs = [];
        foreach ($this->day->trips as $key => $trip) {
            if ($this->cancelled($key)) {
                continue;
            }
            $target = null;
            for ($i = count($trip['stops']) - 1; $i >= 0; $i--) {
                $stop = $trip['stops'][$i];
                $station = $stop[D::STATION];
                if ($station === $to) {
                    $target = $stop[D::DROPOFF] === 1 ? null : $i;
                    continue;
                }
                if ($station === $from) {
                    $target = null;
                    continue;
                }
                if ($target !== null && $stop[D::DEP] !== null && $stop[D::PICKUP] !== 1) {
                    $end = $trip['stops'][$target];
                    $legs[$station][] = ['dep' => $stop[D::DEP], 'arr' => $end[D::ARR] ?? $end[D::DEP], 'key' => $key, 'from' => $i, 'to' => $target];
                }
            }
        }
        foreach ($legs as &$list) {
            usort($list, static fn (array $a, array $b): int => $a['dep'] <=> $b['dep']);
        }

        return $legs;
    }

    /**
     * Najwcześniej przyjeżdżający ostatni odcinek, na który zdążymy po przyjeździe o $arr (przy remisie: dłuższa przesiadka).
     *
     * @param array<int, array{dep: int, arr: int, key: string, from: int, to: int}> $list
     * @param array<int, string> $exclude
     * @param string|null $notThrough stacja, przez którą kurs nie może przejeżdżać przed wejściem
     * @return array{arr: int, wait: int, leg: array{key: string, from: int, to: int}}|null
     */
    private function lastLeg(array $list, int $arr, array $exclude, ?string $notThrough = null): ?array
    {
        $found = null;
        foreach ($list as $leg) {
            $wait = $leg['dep'] - $arr;
            if ($wait > $this->maxTransfer) {
                break;
            }
            if ($wait < $this->minTransfer || in_array($leg['key'], $exclude, true) || ($found !== null && $leg['arr'] > $found['arr'])) {
                continue;
            }
            if ($notThrough !== null && (D::indexOf($this->day->trips[$leg['key']], $notThrough) ?? PHP_INT_MAX) < $leg['from']) {
                continue;
            }
            $found = ['arr' => $leg['arr'], 'wait' => $wait, 'leg' => ['key' => $leg['key'], 'from' => $leg['from'], 'to' => $leg['to']]];
        }

        return $found;
    }

    /**
     * Zapamiętuje połączenie, jeśli jest najlepsze dla swojej liczby przesiadek
     * (wcześniejszy przyjazd, przy remisie dłuższa najkrótsza przesiadka).
     *
     * @param array<int, array<string, mixed>> $best
     * @param array<string, mixed> $c
     */
    private function offer(array &$best, array $c): void
    {
        $n = count($c['legs']) - 1;
        $rank = static fn (array $x): array => [$x['arr'], -min($x['waits'] ?: [0])];
        if (!isset($best[$n]) || $rank($c) < $rank($best[$n])) {
            $best[$n] = $c;
        }
    }

    /** Przyjazd, przed którym połączenie z dwiema przesiadkami tym samym pierwszym pociągiem może się jeszcze przydać. @param array<int, array<string, mixed>> $best */
    private function twoTransferBound(array $best): int
    {
        $bound = PHP_INT_MAX;
        foreach ($best as $n => $c) {
            $bound = min($bound, $n < 2 ? $c['arr'] - self::TWO_TRANSFER_GAIN : $c['arr']);
        }

        return $bound;
    }

    private function cancelled(string $key): bool
    {
        return $this->isCancelled !== null && ($this->isCancelled)($key);
    }
}
