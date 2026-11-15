<?php

declare(strict_types=1);

namespace KwInfo\Vehicles;

use KwInfo\Clock;
use KwInfo\Config;
use KwInfo\Gtfs\GtfsSource;
use KwInfo\Live\Realtime;
use KwInfo\Net\HttpClient;
use KwInfo\Storage;
use Throwable;

/**
 * Rodzaj pojazdu z rozkładu Kolei Wielkopolskich (GTFS przewoźnika, ws.kolejewlkp.pl — otwarte dane z BIP KW).
 * W trips.txt numer pociągu ma dopisany rodzaj („77541 EZT”, „70222 SZYNOBUS”, „77246 PAROWY”, „77601/0 SZYNOBUS/BUS”),
 * są też wheelchair_accessible i bikes_allowed. Ten sam numer w różne dni bywa innym pojazdem (Wolsztyn: parowóz albo
 * lokomotywa spalinowa), więc zapisujemy rodzaj dla każdego dnia kursowania. Rozkład KW nie ma kształtów ani peronów,
 * dlatego zostaje tylko dodatkiem do rozkładu z mkuran.pl. Odświeżane przy imporcie rozkładu (bin/import-gtfs.php).
 */
final class KwVehicleTypes
{
    /** rodzaj w rozkładzie KW => rodzaj w API */
    private const KINDS = ['EZT' => 'emu', 'SZYNOBUS' => 'dmu', 'PAROWY' => 'steam', 'SPALINOWY' => 'diesel'];

    /** @var array<string, mixed>|null */
    private ?array $data = null;

    /** @param array<string, mixed>|null $trains wynik build() (testy); domyślnie z pliku */
    public function __construct(?array $trains = null)
    {
        if ($trains !== null) {
            $this->data = ['trains' => $trains];
        }
    }

    public static function file(): string
    {
        return Config::path('region_storage') . '/kw-vehicles.json';
    }

    /** Pobiera rozkład KW (warunkowo) i przelicza rodzaje pojazdów. Bez adresu w regionie — nic. */
    public static function refresh(callable $log, bool $force = false): void
    {
        $url = (string) Config::get('kw_gtfs_url');
        if ($url === '') {
            return;
        }
        $file = self::file();
        $data = Realtime::readJson($file);
        $part = Config::path('region_storage') . '/kw-gtfs.zip.part';
        try {
            $headers = !$force && isset($data['trains']) && !empty($data['lastModified']) ? ['If-Modified-Since: ' . $data['lastModified']] : [];
            $response = HttpClient::get($url, $headers, 60, $part);
            if ($response['status'] === 304) {
                $log('Rodzaje pojazdów KW: bez zmian');
                return;
            }
            if ($response['status'] !== 200 || filesize($part) < 1000) {
                throw new \RuntimeException('HTTP ' . $response['status']);
            }
            $trains = self::build(new GtfsSource($part));
            if ($trains === []) {
                throw new \RuntimeException('brak kursów z rodzajem pojazdu');
            }
            Storage::writeJson($file, [
                'lastModified' => $response['headers']['last-modified'] ?? null,
                'builtAt' => Clock::now()->format(DATE_ATOM),
                'trains' => $trains,
            ]);
            $log('Rodzaje pojazdów KW: ' . count($trains) . ' numerów pociągów');
        } catch (Throwable $e) {
            // stare dane zostają — rodzaj pojazdu to tylko dodatek
            fwrite(STDERR, '[UWAGA] Rodzaje pojazdów KW: ' . $e->getMessage() . PHP_EOL);
        } finally {
            @unlink($part);
        }
    }

    /**
     * numer pociągu => wpisy {k: rodzaj, w: dla wózków, b: rowery, s/e: pierwszy odjazd i ostatni przyjazd (s od północy),
     * d: dni RRRRMMDD}. Godziny rozróżniają pociągi o tym samym numerze (KW 77246: szynobus Leszno – Krotoszyn w dni robocze,
     * parowóz Poznań – Wolsztyn w soboty).
     * @return array<string, list<array{k: string, w: bool|null, b: bool|null, s: int, e: int, d: list<int>}>>
     */
    public static function build(GtfsSource $src): array
    {
        $dates = [];
        foreach ($src->rows('calendar_dates.txt') as $r) {
            if ((string) $r['exception_type'] === '1') {
                $dates[(string) $r['service_id']][] = (int) $r['date'];
            }
        }
        $span = [];
        foreach ($src->rows('stop_times.txt') as $r) {
            $id = (string) $r['trip_id'];
            foreach ([(string) $r['arrival_time'], (string) $r['departure_time']] as $time) {
                if (preg_match('/^(\d+):(\d{2}):(\d{2})$/', trim($time), $m) === 1) {
                    $sec = (int) $m[1] * 3600 + (int) $m[2] * 60 + (int) $m[3];
                    $span[$id] = [min($span[$id][0] ?? $sec, $sec), max($span[$id][1] ?? $sec, $sec)];
                }
            }
        }
        $out = [];
        foreach ($src->rows('trips.txt') as $t) {
            if (preg_match('#^(\d+(?:/\d+)?)\s+([A-ZĄĆĘŁŃÓŚŹŻ]+)#u', trim((string) $t['trip_short_name']), $m) !== 1 || !isset(self::KINDS[$m[2]])) {
                continue;
            }
            $days = $dates[(string) $t['service_id']] ?? [];
            $times = $span[(string) $t['trip_id']] ?? null;
            if ($days === [] || $times === null) {
                continue;
            }
            $entry = [
                'k' => self::KINDS[$m[2]],
                'w' => self::flag((string) ($t['wheelchair_accessible'] ?? '')),
                'b' => self::flag((string) ($t['bikes_allowed'] ?? '')),
                's' => $times[0],
                'e' => $times[1],
            ];
            foreach (VehicleRepository::expandNumber($m[1]) as $number) {
                $list = &$out[$number];
                $list ??= [];
                $found = false;
                foreach ($list as &$e) {
                    if (array_diff_key($e, ['d' => 0]) === $entry) {
                        $e['d'] = array_merge($e['d'], $days);
                        $found = true;
                        break;
                    }
                }
                unset($e);
                if (!$found) {
                    $list[] = $entry + ['d' => $days];
                }
                unset($list);
            }
        }
        foreach ($out as &$list) {
            foreach ($list as &$e) {
                $e['d'] = array_values(array_unique($e['d']));
                sort($e['d']);
            }
            unset($e);
        }
        unset($list);
        ksort($out, SORT_STRING);

        return $out;
    }

    private static function flag(string $value): ?bool
    {
        return match ($value) {
            '1' => true,
            '2' => false,
            default => null,
        };
    }

    /**
     * Rodzaj pojazdu kursu o jednym z numerów w danym dniu, odjeżdżającego o $start (s od północy dnia kursowania) —
     * kurs KW musi w tej chwili jechać (ten sam numer bywa innym pociągiem). Dzień spoza rozkładu KW (np. rozkład mkuran
     * sięga dalej) — rodzaj tylko wtedy, gdy ten pociąg o tej porze zawsze jeździ tym samym rodzajem pojazdu.
     * @param array<int, string> $numbers @return array{kind: string, wheelchair: bool|null, bikes: bool|null}|null
     */
    public function forTrip(array $numbers, int $date, ?int $start = null): ?array
    {
        $trains = ($this->data ??= Realtime::readJson(self::file()))['trains'] ?? [];
        if ($trains === []) {
            return null;
        }
        $singles = [];
        foreach ($numbers as $n) {
            if (preg_match('#^\d+(?:/\d+)?#', trim($n), $m) === 1) {
                array_push($singles, ...VehicleRepository::expandNumber($m[0]));
            }
        }
        $fallback = null;
        foreach (array_unique($singles) as $number) {
            // odcinek kursu (np. pociąg przed autobusem zastępczym) zaczyna się w trakcie kursu KW; 5 min zapasu na różnice w rozkładach
            $entries = array_values(array_filter(
                $trains[$number] ?? [],
                static fn (array $e): bool => $start === null || ($start >= $e['s'] - 300 && $start <= $e['e'])
            ));
            foreach ($entries as $e) {
                if (in_array($date, $e['d'], true)) {
                    return self::out($e);
                }
            }
            $kinds = array_unique(array_map(static fn (array $e): string => $e['k'], $entries));
            if ($fallback === null && count($kinds) === 1) {
                $fallback = self::out($entries[0]);
            }
        }

        return $fallback;
    }

    /** @param array<string, mixed> $e @return array{kind: string, wheelchair: bool|null, bikes: bool|null} */
    private static function out(array $e): array
    {
        return ['kind' => (string) $e['k'], 'wheelchair' => $e['w'], 'bikes' => $e['b']];
    }
}
