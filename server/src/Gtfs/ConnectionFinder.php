<?php

declare(strict_types=1);

namespace KwInfo\Gtfs;

use KwInfo\Gtfs\DayTimetable as D;

/**
 * Połączenia bezpośrednie i z jedną przesiadką na tej samej stacji. Wynik jest filtrowany (Pareto):
 * zostają połączenia, których nie da się poprawić wcześniejszym przyjazdem, późniejszym odjazdem
 * i mniejszą liczbą przesiadek jednocześnie.
 */
final class ConnectionFinder
{
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
        $results = [];
        foreach ($this->day->byStation[$from] ?? [] as [$key, $k]) {
            $trip = $trips[$key];
            $board = $trip['stops'][$k];
            $dep = $board[D::DEP];
            if ($dep === null || $dep < $time || $dep > $time + $this->window || $board[D::PICKUP] === 1 || $this->cancelled($key)) {
                continue;
            }
            $count = count($trip['stops']);
            for ($j = $k + 1; $j < $count; $j++) {
                $stop = $trip['stops'][$j];
                $arr = $stop[D::ARR] ?? $stop[D::DEP];
                if ($stop[D::STATION] === $to) {
                    if ($stop[D::DROPOFF] !== 1) {
                        $results[] = ['dep' => $dep, 'arr' => $arr, 'legs' => [['key' => $key, 'from' => $k, 'to' => $j]], 'waits' => [], 'via' => []];
                    }
                    break;
                }
                if ($directOnly || $stop[D::DROPOFF] === 1) {
                    continue;
                }
                foreach ($this->day->byStation[$stop[D::STATION]] ?? [] as [$key2, $k2]) {
                    if ($key2 === $key || $this->cancelled($key2)) {
                        continue;
                    }
                    $trip2 = $trips[$key2];
                    $board2 = $trip2['stops'][$k2];
                    $dep2 = $board2[D::DEP];
                    if ($dep2 === null || $board2[D::PICKUP] === 1) {
                        continue;
                    }
                    $wait = $dep2 - $arr;
                    if ($wait < $this->minTransfer || $wait > $this->maxTransfer) {
                        continue;
                    }
                    $j2 = D::indexOf($trip2, $to, $k2);
                    if ($j2 === null || $trip2['stops'][$j2][D::DROPOFF] === 1) {
                        continue;
                    }
                    // nie wracamy przez stację początkową
                    if (D::indexOf($trip2, $from, $k2) !== null && D::indexOf($trip2, $from, $k2) < $j2) {
                        continue;
                    }
                    $arr2 = $trip2['stops'][$j2][D::ARR] ?? $trip2['stops'][$j2][D::DEP];
                    $results[] = [
                        'dep' => $dep,
                        'arr' => $arr2,
                        'legs' => [['key' => $key, 'from' => $k, 'to' => $j], ['key' => $key2, 'from' => $k2, 'to' => $j2]],
                        'waits' => [$wait],
                        'via' => [$stop[D::STATION]],
                    ];
                }
            }
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
        usort($useful, static fn (array $a, array $b): int => [$a['dep'], $a['arr']] <=> [$b['dep'], $b['arr']]);

        return array_slice($useful, 0, max(1, $limit));
    }

    private function cancelled(string $key): bool
    {
        return $this->isCancelled !== null && ($this->isCancelled)($key);
    }
}
