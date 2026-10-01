<?php

declare(strict_types=1);

namespace KwInfo\Api;

use KwInfo\Clock;
use KwInfo\Config;
use KwInfo\Gtfs\Timetable;
use KwInfo\Live\Realtime;
use KwInfo\Notices\NoticeRepository;
use Throwable;

/** Uczciwy stan danych: czy rozkład jest ważny, jak świeże są pozycje i opóźnienia. */
final class StatusService
{
    /** @return array<string, mixed> */
    public static function build(?NoticeRepository $notices = null): array
    {
        $messages = [];
        $level = 'ok';
        $raise = static function (string $to) use (&$level): void {
            $order = ['ok' => 0, 'degraded' => 1, 'down' => 2];
            if ($order[$to] > $order[$level]) {
                $level = $to;
            }
        };

        $timetable = ['ok' => false];
        try {
            $meta = (new Timetable())->meta();
            $today = Clock::isoDate(Clock::today());
            $daysLeft = (int) floor((strtotime($meta['validUntil']) - strtotime($today)) / 86400);
            $timetable = [
                'ok' => $daysLeft >= 0,
                'validFrom' => $meta['validFrom'] ?? null,
                'validUntil' => $meta['validUntil'] ?? null,
                'daysLeft' => $daysLeft,
                'importedAt' => $meta['importedAt'] ?? null,
                'feedVersion' => $meta['feedVersion'] ?? null,
                'trips' => (int) ($meta['trips'] ?? 0),
                'stations' => (int) ($meta['stations'] ?? 0),
                'attribution' => json_decode($meta['attribution'] ?? '[]', true) ?: [],
            ];
            if ($daysLeft < 0) {
                $raise('down');
                $messages[] = ['level' => 'error', 'text' => 'Rozkład jazdy wygasł ' . date('d.m.Y', strtotime($meta['validUntil'])) . '. Godziny mogą być nieaktualne.'];
            } elseif ($daysLeft <= 3) {
                $raise('degraded');
                $messages[] = ['level' => 'warning', 'text' => 'Rozkład jazdy jest ważny jeszcze ' . $daysLeft . ' dni i czeka na aktualizację.'];
            }
            if (!empty($meta['importedAt']) && strtotime($meta['importedAt']) < time() - 3 * 86400) {
                $raise('degraded');
                $messages[] = ['level' => 'warning', 'text' => 'Rozkład nie był aktualizowany od ' . date('d.m.Y', strtotime($meta['importedAt'])) . '.'];
            }
        } catch (Throwable) {
            $raise('down');
            $messages[] = ['level' => 'error', 'text' => 'Rozkład jazdy jest niedostępny.'];
        }

        $liveData = Realtime::readJson(Config::path('live_file'));
        $age = isset($liveData['generatedAt']) ? max(0, time() - strtotime((string) $liveData['generatedAt'])) : null;
        $trains = $liveData['trains'] ?? [];
        $live = [
            'ok' => $age !== null && $age <= 300,
            'generatedAt' => $liveData['generatedAt'] ?? null,
            'ageSeconds' => $age,
            'trains' => count($trains),
            'gpsTrains' => count(array_filter($trains, static fn (array $t): bool => $t['source'] === 'gps')),
            'rtTrains' => count(array_filter($trains, static fn (array $t): bool => ($t['delaySource'] ?? null) === 'rt')),
            'gpsEnabled' => (bool) ($liveData['sources']['gps']['enabled'] ?? Config::get('gps_enabled')),
            'gps' => $liveData['sources']['gps'] ?? null,
            'rt' => $liveData['sources']['rt'] ?? null,
        ];
        if (!$live['ok']) {
            $raise('degraded');
            $messages[] = ['level' => 'warning', 'text' => $age === null
                ? 'Dane na żywo nie są jeszcze dostępne. Pokazujemy rozkład.'
                : 'Dane na żywo są nieaktualne (ostatnio ' . date('H:i', strtotime((string) $liveData['generatedAt'])) . '). Pokazujemy rozkład.'];
        } else {
            if ($live['gpsEnabled'] && !($live['gps']['ok'] ?? false)) {
                $raise('degraded');
                $messages[] = ['level' => 'warning', 'text' => 'Pozycje GPS są chwilowo niedostępne. Na mapie widać pozycje wyliczone z rozkładu.'];
            }
            if (!($live['rt']['ok'] ?? false)) {
                $raise('degraded');
                $messages[] = ['level' => 'warning', 'text' => 'Opóźnienia z systemu PKP PLK są chwilowo niedostępne.'];
            }
        }

        $published = [];
        try {
            $published = ($notices ?? new NoticeRepository())->published();
        } catch (Throwable) {
        }

        return [
            'level' => $level,
            'generatedAt' => Clock::now()->format(DATE_ATOM),
            'timetable' => $timetable,
            'live' => $live,
            'notices' => [
                'active' => count($published),
                'danger' => count(array_filter($published, static fn (array $n): bool => $n['severity'] === 'danger')),
                'warning' => count(array_filter($published, static fn (array $n): bool => $n['severity'] === 'warning')),
            ],
            'messages' => $messages,
        ];
    }
}
