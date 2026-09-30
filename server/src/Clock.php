<?php

declare(strict_types=1);

namespace KwInfo;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Czas rozkładowy: data kursowania jako int YYYYMMDD, godziny jako sekundy od północy tej daty
 * (mogą przekraczać 24 h, jak w GTFS).
 */
final class Clock
{
    private static ?DateTimeZone $zone = null;
    private static ?DateTimeImmutable $frozen = null;

    public static function zone(): DateTimeZone
    {
        return self::$zone ??= new DateTimeZone('Europe/Warsaw');
    }

    public static function now(): DateTimeImmutable
    {
        return self::$frozen ?? new DateTimeImmutable('now', self::zone());
    }

    /** Tylko do testów. */
    public static function freeze(?DateTimeImmutable $at): void
    {
        self::$frozen = $at?->setTimezone(self::zone());
    }

    public static function today(): int
    {
        return (int) self::now()->format('Ymd');
    }

    public static function addDays(int $date, int $days): int
    {
        return (int) self::midnight($date)->modify(($days >= 0 ? '+' : '') . $days . ' day')->format('Ymd');
    }

    public static function midnight(int $date): DateTimeImmutable
    {
        return DateTimeImmutable::createFromFormat('!Ymd', (string) $date, self::zone());
    }

    /** Sekundy od północy podanej daty dla chwili $at. */
    public static function secondsSince(int $date, ?DateTimeImmutable $at = null): int
    {
        $at ??= self::now();
        $base = self::midnight($date);
        $days = (int) $base->diff($at->setTime(0, 0))->format('%r%a');

        return $days * 86400 + (int) $at->format('G') * 3600 + (int) $at->format('i') * 60 + (int) $at->format('s');
    }

    public static function at(int $date, int $seconds): DateTimeImmutable
    {
        $days = intdiv($seconds, 86400);
        $rest = $seconds - $days * 86400;
        if ($rest < 0) {
            $days--;
            $rest += 86400;
        }
        $base = self::midnight($date);
        if ($days !== 0) {
            $base = $base->modify(($days > 0 ? '+' : '') . $days . ' day');
        }

        return $base->setTime(intdiv($rest, 3600), intdiv($rest % 3600, 60), $rest % 60);
    }

    public static function iso(int $date, ?int $seconds): ?string
    {
        return $seconds === null ? null : self::at($date, $seconds)->format(DATE_ATOM);
    }

    public static function isoDate(int $date): string
    {
        $s = (string) $date;

        return substr($s, 0, 4) . '-' . substr($s, 4, 2) . '-' . substr($s, 6, 2);
    }

    public static function parseGtfsTime(string $value): ?int
    {
        if (preg_match('/^(\d{1,3}):(\d{2}):(\d{2})$/', trim($value), $m) !== 1) {
            return null;
        }

        return (int) $m[1] * 3600 + (int) $m[2] * 60 + (int) $m[3];
    }
}
