<?php

declare(strict_types=1);

namespace KwInfo\Live;

use RuntimeException;

/**
 * Minimalny dekoder protobuf GTFS-Realtime (FeedMessage → TripUpdate). Obsługuje tylko pola potrzebne portalowi.
 * Encje bez prefiksu trip_id (np. inni przewoźnicy) są pomijane bez dekodowania.
 */
final class GtfsRtDecoder
{
    public const CANCELED = 3;
    public const SKIPPED = 1;

    /**
     * @return array{timestamp: int|null, trips: array<int, array{tripId: string, startDate: int|null, cancelled: bool, stops: array<int, array{seq: int|null, stopId: string|null, arrTime: int|null, arrDelay: int|null, depTime: int|null, depDelay: int|null, skipped: bool}>}>}
     */
    public static function decode(string $buf, ?string $tripPrefix = null): array
    {
        $timestamp = null;
        $trips = [];
        $pos = 0;
        $len = strlen($buf);
        while ($pos < $len) {
            [$field, $wire] = self::key($buf, $pos);
            if ($wire !== 2) {
                self::skip($buf, $pos, $wire);
                continue;
            }
            $size = self::varint($buf, $pos);
            $chunk = substr($buf, $pos, $size);
            $pos += $size;
            if ($field === 1) {
                $timestamp = self::header($chunk);
            } elseif ($field === 2 && ($tripPrefix === null || str_contains($chunk, $tripPrefix))) {
                $trip = self::entity($chunk);
                if ($trip !== null && ($tripPrefix === null || str_starts_with($trip['tripId'], $tripPrefix))) {
                    $trips[] = $trip;
                }
            }
        }

        return ['timestamp' => $timestamp, 'trips' => $trips];
    }

    private static function header(string $buf): ?int
    {
        $ts = null;
        foreach (self::fields($buf) as [$field, $value]) {
            if ($field === 3) {
                $ts = (int) $value;
            }
        }

        return $ts;
    }

    /** @return array{tripId: string, startDate: int|null, cancelled: bool, stops: array<int, array<string, mixed>>}|null */
    private static function entity(string $buf): ?array
    {
        foreach (self::fields($buf) as [$field, $value]) {
            if ($field === 3 && is_string($value)) {
                return self::tripUpdate($value);
            }
        }

        return null;
    }

    /** @return array{tripId: string, startDate: int|null, cancelled: bool, stops: array<int, array<string, mixed>>}|null */
    private static function tripUpdate(string $buf): ?array
    {
        $trip = null;
        $stops = [];
        foreach (self::fields($buf) as [$field, $value]) {
            if ($field === 1 && is_string($value)) {
                $trip = ['tripId' => '', 'startDate' => null, 'cancelled' => false];
                foreach (self::fields($value) as [$f, $v]) {
                    if ($f === 1) {
                        $trip['tripId'] = (string) $v;
                    } elseif ($f === 3) {
                        $trip['startDate'] = (int) $v;
                    } elseif ($f === 4) {
                        $trip['cancelled'] = (int) $v === self::CANCELED;
                    }
                }
            } elseif ($field === 2 && is_string($value)) {
                $stop = ['seq' => null, 'stopId' => null, 'arrTime' => null, 'arrDelay' => null, 'depTime' => null, 'depDelay' => null, 'skipped' => false];
                foreach (self::fields($value) as [$f, $v]) {
                    if ($f === 1) {
                        $stop['seq'] = (int) $v;
                    } elseif ($f === 4) {
                        $stop['stopId'] = (string) $v;
                    } elseif (($f === 2 || $f === 3) && is_string($v)) {
                        $prefix = $f === 2 ? 'arr' : 'dep';
                        foreach (self::fields($v) as [$ef, $ev]) {
                            if ($ef === 1) {
                                $stop[$prefix . 'Delay'] = self::int32((int) $ev);
                            } elseif ($ef === 2) {
                                $stop[$prefix . 'Time'] = (int) $ev;
                            }
                        }
                    } elseif ($f === 5) {
                        $stop['skipped'] = (int) $v === self::SKIPPED;
                    }
                }
                $stops[] = $stop;
            }
        }
        if ($trip === null || $trip['tripId'] === '') {
            return null;
        }
        $trip['stops'] = $stops;

        return $trip;
    }

    /** @return iterable<int, array{0: int, 1: int|string}> */
    private static function fields(string $buf): iterable
    {
        $pos = 0;
        $len = strlen($buf);
        while ($pos < $len) {
            [$field, $wire] = self::key($buf, $pos);
            if ($wire === 0) {
                yield [$field, self::varint($buf, $pos)];
            } elseif ($wire === 2) {
                $size = self::varint($buf, $pos);
                yield [$field, substr($buf, $pos, $size)];
                $pos += $size;
            } else {
                self::skip($buf, $pos, $wire);
            }
        }
    }

    /** @return array{0: int, 1: int} */
    private static function key(string $buf, int &$pos): array
    {
        $key = self::varint($buf, $pos);

        return [$key >> 3, $key & 7];
    }

    private static function varint(string $buf, int &$pos): int
    {
        $result = 0;
        $shift = 0;
        $len = strlen($buf);
        while ($pos < $len) {
            $byte = ord($buf[$pos++]);
            if ($shift < 64) {
                $result |= ($byte & 0x7F) << $shift;
            }
            if (($byte & 0x80) === 0) {
                return $result;
            }
            $shift += 7;
        }
        throw new RuntimeException('Uszkodzony plik GTFS-RT (varint).');
    }

    private static function skip(string $buf, int &$pos, int $wire): void
    {
        match ($wire) {
            0 => self::varint($buf, $pos),
            1 => $pos += 8,
            2 => $pos += self::varint($buf, $pos),
            5 => $pos += 4,
            default => throw new RuntimeException('Nieobsługiwany typ pola protobuf: ' . $wire),
        };
    }

    private static function int32(int $v): int
    {
        $v &= 0xFFFFFFFF;

        return $v >= 0x80000000 ? $v - 0x100000000 : $v;
    }
}
