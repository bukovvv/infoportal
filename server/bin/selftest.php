<?php

declare(strict_types=1);

// Testy logiki backendu bez zewnętrznych zależności: php server/bin/selftest.php

require dirname(__DIR__) . '/bootstrap.php';

use KwInfo\Http\ApiException;
use KwInfo\Api\PublicApi;
use KwInfo\Clock;
use KwInfo\Config;
use KwInfo\Gtfs\ConnectionFinder;
use KwInfo\Gtfs\DayTimetable;
use KwInfo\Gtfs\GtfsImporter;
use KwInfo\Gtfs\PositionEstimator;
use KwInfo\Gtfs\Timetable;
use KwInfo\Live\GtfsRtDecoder;
use KwInfo\Live\Realtime;

$failed = 0;
$passed = 0;
function check(string $name, bool $ok, string $detail = ''): void
{
    global $failed, $passed;
    $ok ? $passed++ : $failed++;
    echo ($ok ? '[OK]   ' : '[BŁĄD] ') . $name . ($ok || $detail === '' ? '' : ' — ' . $detail) . PHP_EOL;
}

// --- numery pociągów
check('splitNumbers 77610/1', GtfsImporter::splitNumbers('77610/1') === ['77610', '77611']);
check('splitNumbers pojedynczy', GtfsImporter::splitNumbers('77345') === ['77345']);

// --- upraszczanie kształtu zachowuje końce i odległości
$line = [[52.0, 16.0, 0.0], [52.00001, 16.5, 5.0], [52.0, 17.0, 10.0], [52.5, 17.0, 20.0]];
$simple = GtfsImporter::simplify($line, 0.001);
check('simplify usuwa punkt współliniowy', count($simple) === 3 && $simple[0] === $line[0] && end($simple) === end($line));

// --- czas rozkładowy
$date = 20261001;
check('Clock::at ponad 24 h', Clock::at($date, 25 * 3600 + 60)->format('Y-m-d H:i') === '2026-10-02 01:01');
check('Clock::secondsSince', Clock::secondsSince($date, new DateTimeImmutable('2026-10-02 00:30', Clock::zone())) === 24 * 3600 + 1800);
check('Clock::parseGtfsTime', Clock::parseGtfsTime('25:14:30') === 25 * 3600 + 14 * 60 + 30 && Clock::parseGtfsTime('x') === null);

// --- estymacja pozycji: w połowie odcinka wzdłuż kształtu
$stops = [
    ['arr' => 1000, 'dep' => 1000, 'dist' => 0.0, 'lat' => 52.0, 'lon' => 16.0],
    ['arr' => 1600, 'dep' => 1660, 'dist' => 10.0, 'lat' => 52.0, 'lon' => 17.0],
    ['arr' => 2200, 'dep' => 2200, 'dist' => 20.0, 'lat' => 52.5, 'lon' => 17.0],
];
$shape = [[52.0, 16.0, 0.0], [52.0, 17.0, 10.0], [52.5, 17.0, 20.0]];
$p = PositionEstimator::estimate($stops, 1300, $shape);
check('pozycja w połowie odcinka', $p !== null && abs($p['lon'] - 16.5) < 0.001 && $p['prev'] === 0 && $p['next'] === 1 && !$p['dwelling']);
check('prędkość z odległości', $p !== null && $p['speed'] === 60);
$p = PositionEstimator::estimate($stops, 1630, $shape);
check('postój na stacji', $p !== null && $p['dwelling'] && $p['prev'] === 1);
check('poza kursem brak pozycji', PositionEstimator::estimate($stops, 5000, $shape) === null);

// --- dekoder GTFS-RT na ręcznie zakodowanym feedzie
function varint(int $v): string
{
    $out = '';
    do {
        $byte = $v & 0x7F;
        $v >>= 7;
        $out .= chr($v ? $byte | 0x80 : $byte);
    } while ($v);
    return $out;
}
function field(int $no, int|string $value): string
{
    return is_int($value) ? varint($no << 3) . varint($value) : varint(($no << 3) | 2) . varint(strlen($value)) . $value;
}
$event = static fn (int $time): string => field(2, $time);
$tripKw = field(1, 'PLK_KW_2026_1') . field(3, '20261001') . field(4, 0);
$stu = field(1, 3) . field(2, $event(1790000120)) . field(3, $event(1790000180));
$skip = field(1, 4) . field(5, 1);
$entityKw = field(1, 'U_1') . field(3, field(1, $tripKw) . field(2, $stu) . field(2, $skip));
$entityOther = field(1, 'U_2') . field(3, field(1, field(1, 'PLK_IC_2026_9') . field(3, '20261001') . field(4, 3)));
$entityCancelled = field(1, 'U_3') . field(3, field(1, field(1, 'PLK_KW_2026_2') . field(3, '20261001') . field(4, 3)));
$feed = field(1, field(1, '2.0') . field(3, 1790000000)) . field(2, $entityKw) . field(2, $entityOther) . field(2, $entityCancelled);
$decoded = GtfsRtDecoder::decode($feed, 'PLK_KW_');
check('RT: nagłówek', $decoded['timestamp'] === 1790000000);
check('RT: filtr przewoźnika', count($decoded['trips']) === 2);
$t = $decoded['trips'][0];
check('RT: postój i czasy', $t['tripId'] === 'PLK_KW_2026_1' && $t['startDate'] === 20261001 && $t['stops'][0]['seq'] === 3 && $t['stops'][0]['depTime'] === 1790000180);
check('RT: pominięty postój', $t['stops'][1]['skipped'] === true);
check('RT: odwołany kurs', $decoded['trips'][1]['cancelled'] === true);

// --- propagacja opóźnień
$trip = ['key' => 'T@20261001', 'stops' => [[0, 'A', 1000, 1000], [1, 'B', 1600, 1660], [2, 'C', 2200, 2200], [3, 'D', 2800, 2800]]];
$rt = new Realtime(['T@20261001' => ['c' => 0, 's' => ['1' => [120, 180, 0]]]]);
$exp = $rt->apply($trip, 1500);
check('RT: brak danych przed pierwszą aktualizacją', $exp['stops'][0]['depDelay'] === null);
check('RT: opóźnienie przeniesione dalej', $exp['stops'][2]['arrDelay'] === 180 && $exp['stops'][3]['arr'] === 2980);
check('RT: bieżące opóźnienie', $exp['delay'] === 180 && $exp['source'] === 'rt');
$gps = (new Realtime([], ['T@20261001' => 4]))->apply($trip, 1700);
check('GPS: opóźnienie tylko na przyszłych postojach', $gps['stops'][0]['depDelay'] === null && $gps['stops'][2]['arrDelay'] === 240);

// --- integracja z prawdziwą bazą (jeśli zaimportowana)
if (is_file(Config::path('gtfs_db'))) {
    $tt = new Timetable();
    $range = [str_replace('-', '', $tt->meta()['validFrom']), str_replace('-', '', $tt->meta()['validUntil'])];
    $day = DayTimetable::load($tt, max((int) $range[0], Clock::today()));
    $byName = array_column($tt->stations(), 'id', 'name');
    $found = (new ConnectionFinder($day))->find($byName['Leszno'] ?? '', $byName['Gniezno'] ?? '', 7 * 3600, 5);
    check('baza: połączenia Leszno → Gniezno', $found !== [] && $found[0]['dep'] >= 7 * 3600, count($found) . ' wyników');
    $sorted = true;
    foreach ($found as $i => $c) {
        if ($i > 0 && $c['dep'] < $found[$i - 1]['dep']) {
            $sorted = false;
        }
        foreach ($found as $j => $o) {
            if ($i !== $j && $o['arr'] <= $c['arr'] && $o['dep'] >= $c['dep'] && count($o['legs']) <= count($c['legs']) && $o !== $c) {
                $sorted = false;
            }
        }
    }
    check('baza: wyniki posortowane i bez zdominowanych', $sorted);

    // dwie przesiadki: Włoszakowice → Rogoźno Wlkp. nie ma połączenia z jedną przesiadką
    $found = (new ConnectionFinder($day))->find($byName['Włoszakowice'] ?? '', $byName['Rogoźno Wielkopolskie'] ?? '', 4 * 3600, 5);
    $chained = $found !== [];
    foreach ($found as $c) {
        $prev = null;
        foreach ($c['legs'] as $i => $l) {
            $stop = $day->trips[$l['key']]['stops'][$l['from']];
            if ($prev !== null && ($prev[DayTimetable::STATION] !== $stop[DayTimetable::STATION] || $c['waits'][$i - 1] < 180)) {
                $chained = false;
            }
            $prev = $day->trips[$l['key']]['stops'][$l['to']];
        }
        $chained = $chained && count($c['legs']) === 3 && $prev[DayTimetable::STATION] === $byName['Rogoźno Wielkopolskie'];
    }
    check('baza: połączenia z dwiema przesiadkami', $chained, count($found) . ' wyników');

    // API: tablica na wybrany dzień i godzinę, wyszukiwarka z datą
    $api = new PublicApi();
    $isoDay = Clock::isoDate(max((int) $range[0], Clock::addDays(Clock::today(), 1)));
    $_GET = ['date' => $isoDay, 'time' => '12:00', 'limit' => '5'];
    $rows = $api->board(['id' => $byName['Poznań Główny'] ?? ''])->data['rows'];
    check('API: tablica od wybranej daty i godziny', $rows !== [] && substr($rows[0]['scheduled'], 0, 16) >= $isoDay . 'T12:00' && $rows[0]['expected'] === null);
    $_GET = ['date' => '2000-01-01'];
    try {
        $api->board(['id' => $byName['Poznań Główny'] ?? '']);
        check('API: data spoza rozkładu odrzucona', false);
    } catch (ApiException) {
        check('API: data spoza rozkładu odrzucona', true);
    }
    $_GET = ['from' => $byName['Leszno'] ?? '', 'to' => $byName['Gniezno'] ?? '', 'date' => $isoDay, 'time' => '07:00'];
    $conn = $api->connections()->data;
    check('API: wyszukiwarka z datą', $conn['date'] === $isoDay && $conn['connections'] !== []);
    $_GET = [];
} else {
    echo "[POMINIĘTO] testy na bazie — uruchom najpierw import-gtfs.php\n";
}

echo PHP_EOL . "Wynik: {$passed} OK, {$failed} błędów" . PHP_EOL;
exit($failed > 0 ? 1 : 0);
