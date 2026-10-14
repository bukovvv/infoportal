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
use KwInfo\Push\JourneyWatcher;
use KwInfo\Push\WebPush;
use KwInfo\Vehicles\Vagonweb;
use KwInfo\Vehicles\VehicleRepository;

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

// --- vagonWEB: lista, zestawienie (fragment prawdziwej strony), numery i rok rozkładu
$list = "<a href=\"vlak.php?zeme=KW&kategorie=&cislo=77674/5&nazev=PKM3&rok=2026\">x</a><a href='vlak.php?zeme=KW&amp;kategorie=&amp;cislo=67218&amp;nazev=&amp;rok=2026'>y</a>";
check('vagonWEB: lista pociągów', Vagonweb::parseList($list, 2026) === [['number' => '77674/5', 'name' => 'PKM3'], ['number' => '67218', 'name' => '']]);
$page = "<div id='skutecne_razeni'><div id='vlak_220078'><h4 id='2026-10-12' class='color-ex'>Rzeczywiste zestawienie pociągu z dnia: <b>Pn 12.10.2026</b> na odcinku: Wągrowiec - Stęszew</h4></div>"
    . "<table class='vlacek' id='vlacek220078'><tr><td class='bunka_vozu'><table><tr><td class='vagonek'><img class='obrazek_vagonu' src='../popisy/img/KW/36WEh-a.gif'></td></tr></table>"
    . "<div><span class=tab-radam>36WEh<sup></sup></span></div><div><span class='tab-pocmist'><img class='pikto' src='https://www.vagonweb.cz/popisy/ico/tr2.svg'> "
    . "<img class='pikto' src='https://www.vagonweb.cz/popisy/ico/2sed.svg'> 160 <img class='pikto' src='https://www.vagonweb.cz/popisy/ico/inv.svg'> 2 "
    . "<img class='pikto' src='https://www.vagonweb.cz/popisy/ico/klima.svg'> </span></div></td>"
    . "<td class='bunka_vozu'><img class='obrazek_vagonu' src='../popisy/img/KW/48WE-a.gif'><span class='tab-radam'>48WE</span></td></tr></table></div>";
$parsed = Vagonweb::parseTrain($page, 2026);
$first = $parsed[0] ?? null;
check('vagonWEB: zestawienie z dnia', $first !== null && $first['date'] === '2026-10-12' && $first['section'] === 'Wągrowiec - Stęszew'
    && count($first['vehicles']) === 2 && $first['vehicles'][0]['series'] === '36WEh' && $first['vehicles'][0]['seats'] === 160
    && in_array('klima', $first['vehicles'][0]['features'], true) && $first['vehicles'][1]['series'] === '48WE'
    && str_ends_with($first['url'], 'id=220078&lang=pl'), json_encode($first, JSON_UNESCAPED_UNICODE));
check('vagonWEB: strona bez składu', Vagonweb::parseTrain('<h2>pokaż</h2>', 2026) === []);
check('vagonWEB: plik rysunku', Vagonweb::imageFile('../popisy/img/KW/36WEh-a.gif') === 'KW_36WEh-a.gif'
    && Vagonweb::imageFile('../../etc/passwd') === null && VehicleRepository::imagePath('../app.sqlite') === null);
check('vagonWEB: numery łamane', VehicleRepository::expandNumber('77674/5') === ['77674', '77675']
    && VehicleRepository::expandNumber('17214/15') === ['17214', '17215'] && VehicleRepository::expandNumber('70200') === ['70200']);
check('vagonWEB: rok rozkładu', Vagonweb::timetableYear(strtotime('2026-12-12 12:00')) === 2026 && Vagonweb::timetableYear(strtotime('2026-12-13 12:00')) === 2027);

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
    // przesiadka bez sensu: Poznań Gł. → Leszno 07:43 z przesiadką (przyjazd 10:14), gdy o 07:39 jedzie bezpośredni (08:44)
    $pointless = [];
    foreach ([['Poznań Główny', 'Leszno'], ['Poznań Główny', 'Gniezno'], ['Leszno', 'Wolsztyn'], ['Września', 'Gniezno']] as [$a, $b]) {
        foreach ([6, 14] as $hour) {
            $res = (new ConnectionFinder($day))->find($byName[$a] ?? '', $byName[$b] ?? '', $hour * 3600, 8);
            foreach ($res as $c) {
                foreach ($res as $o) {
                    if (count($c['legs']) > 1 && count($o['legs']) <= count($c['legs']) && $o['dep'] < $c['dep'] && $c['dep'] - $o['dep'] <= 900 && $c['arr'] - $o['arr'] >= 1800) {
                        $pointless[] = "$a → $b " . gmdate('H:i', $c['dep']);
                    }
                }
            }
        }
    }
    check('baza: bez przesiadek, gdy chwilę wcześniej jedzie dużo szybsze', $pointless === [], implode(', ', $pointless));

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
    $_GET = ['from' => $byName['Leszno'] ?? '', 'to' => $byName['Gniezno'] ?? '', 'date' => $isoDay, 'time' => '23:30'];
    $late = $api->connections()->data['connections'];
    check('API: wieczorem połączenia z następnego dnia', $late !== [] && substr($late[0]['departure'], 0, 10) > $isoDay, (string) ($late[0]['departure'] ?? 'brak'));
    // przyjazd do 12:00: wszystkie przyjeżdżają na czas, a po ostatnim nie ma późniejszego odjazdu, który zdąży
    $_GET = ['from' => $byName['Leszno'] ?? '', 'to' => $byName['Gniezno'] ?? '', 'date' => $isoDay, 'time' => '12:00', 'arrive' => '1'];
    $arr = $api->connections()->data;
    $limit = $isoDay . 'T12:00';
    $onTime = $arr['arriveBy'] && $arr['connections'] !== [] && max(array_map(static fn (array $c): string => substr($c['arrival'], 0, 16), $arr['connections'])) <= $limit;
    $lastDep = substr((string) end($arr['connections'])['departure'], 11, 5);
    $_GET = ['from' => $byName['Leszno'] ?? '', 'to' => $byName['Gniezno'] ?? '', 'date' => $isoDay, 'time' => date('H:i', strtotime($lastDep) + 60)];
    $after = $api->connections()->data['connections'];
    check('API: przyjazd do wybranej godziny', $onTime && ($after === [] || substr($after[0]['arrival'], 0, 16) > $limit), "ostatni odjazd $lastDep");
    // dzień z następnym: jutrzejsze kursy po 24:00, nocne kursy z dziś tylko raz
    $today = DayTimetable::load($tt, (int) str_replace('-', '', $isoDay));
    $next = DayTimetable::load($tt, Clock::addDays($today->date, 1));
    $span = $today->withDay($next);
    $own = count(array_filter($next->trips, static fn (array $t): bool => $t['serviceDate'] === $next->date));
    $shifted = array_filter($span->trips, static fn (array $t): bool => $t['serviceDate'] === $next->date);
    check('dzień z następnym: kursy jutra przesunięte o 24 h', count($span->trips) === count($today->trips) + $own
        && $shifted !== [] && min(array_map(static fn (array $t): int => $t['stops'][0][DayTimetable::DEP] ?? PHP_INT_MAX, $shifted)) >= 86400);
    // kurs przez północ jest w obu dniach (dziś po 24:00 i jutro jako nocny) — na tablicy tylko raz
    $_GET = ['date' => $isoDay, 'time' => '22:00', 'mode' => 'arr', 'limit' => '40'];
    $keys = [];
    foreach (array_keys($byName) as $name) {
        if (str_starts_with($name, 'Poznań Główny') || $name === 'Wolsztyn' || $name === 'Leszno') {
            $keys = array_merge($keys, array_map(static fn (array $r): string => $name . $r['key'], $api->board(['id' => $byName[$name]])->data['rows']));
        }
    }
    check('API: tablica bez powtórzonych kursów nocnych', $keys !== [] && count($keys) === count(array_unique($keys)));
    $_GET = [];
} else {
    echo "[POMINIĘTO] testy na bazie — uruchom najpierw import-gtfs.php\n";
}

// --- Web Push: szyfrowanie RFC 8291 (zaszyfruj jako serwer, odszyfruj jako przeglądarka) i podpis VAPID
$ua = WebPush::newKey();
$secret = random_bytes(16);
$body = WebPush::encrypt('{"title":"Test ąę"}', WebPush::rawPublic($ua), $secret);
check('push: odszyfrowanie treści', WebPush::decrypt($body, $ua, $secret) === '{"title":"Test ąę"}');
check('push: nagłówek rekordu aes128gcm', strlen($body) === 16 + 4 + 1 + 65 + strlen('{"title":"Test ąę"}') + 1 + 16 && unpack('N', substr($body, 16, 4))[1] === 4096);
$vapid = WebPush::newKey();
$vapidPem = WebPush::exportPem($vapid);
$auth = WebPush::vapidAuthorization('https://fcm.googleapis.com/fcm/send/abc', ['public' => WebPush::b64(WebPush::rawPublic($vapid)), 'pem' => $vapidPem]);
preg_match('/^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/', $auth, $jwt);
$claims = json_decode(WebPush::unb64($jwt[2] ?? ''), true);
check('push: token VAPID z poprawnym podpisem ES256', isset($jwt[4]) && openssl_verify($jwt[1] . '.' . $jwt[2], WebPush::rawToDerSignature(WebPush::unb64($jwt[3])), WebPush::publicKey(WebPush::unb64($jwt[4])), OPENSSL_ALGO_SHA256) === 1
    && ($claims['aud'] ?? '') === 'https://fcm.googleapis.com');
check('push: tylko adresy usług push', WebPush::allowedEndpoint('https://fcm.googleapis.com/fcm/send/x') && WebPush::allowedEndpoint('https://web.push.apple.com/abc')
    && !WebPush::allowedEndpoint('https://example.com/push') && !WebPush::allowedEndpoint('http://fcm.googleapis.com/x') && !WebPush::allowedEndpoint('https://evilgoogleapis.com/x'));

// --- powiadomienia o podróży: kiedy wysłać
$t0 = strtotime('2026-10-14 16:00');
$leg = static fn (array $o): array => $o + ['number' => '77615', 'from' => 'Poznań Główny', 'to' => 'Gniezno', 'dep' => $t0 + 1800, 'arr' => $t0 + 4200, 'depDelay' => null, 'arrDelay' => null, 'cancelled' => false];
[$m] = JourneyWatcher::evaluate([$leg(['depDelay' => 2])], [], $t0);
check('podróż: opóźnienie 2 min bez powiadomienia', $m === []);
[$m, $st] = JourneyWatcher::evaluate([$leg(['depDelay' => 5])], [], $t0);
check('podróż: opóźnienie 5 min — powiadomienie', count($m) === 1 && str_contains($m[0]['title'], '+5 min') && str_contains($m[0]['body'], '16:35 zamiast 16:30'));
[$m, $st] = JourneyWatcher::evaluate([$leg(['depDelay' => 6])], $st, $t0);
check('podróż: zmiana o 1 min bez ponownego powiadomienia', $m === []);
[$m, $st] = JourneyWatcher::evaluate([$leg(['depDelay' => 0])], $st, $t0);
check('podróż: powrót do rozkładu', count($m) === 1 && str_contains($m[0]['title'], 'planowo'));
[$m, $st] = JourneyWatcher::evaluate([$leg(['cancelled' => true])], [], $t0);
[$again] = JourneyWatcher::evaluate([$leg(['cancelled' => true])], $st, $t0);
check('podróż: odwołanie zgłoszone raz', count($m) === 1 && str_contains($m[0]['title'], 'odwołany') && $again === []);
[$m] = JourneyWatcher::evaluate([$leg(['depDelay' => 10, 'dep' => $t0 + 5 * 3600])], [], $t0);
check('podróż: odjazd za kilka godzin — jeszcze bez powiadomień', $m === []);
$transfer = [$leg(['to' => 'Poznań Wschód', 'arr' => $t0 + 2400, 'arrDelay' => 6]), $leg(['number' => '77711', 'from' => 'Poznań Wschód', 'dep' => $t0 + 2700, 'arr' => $t0 + 6000])];
[$m] = JourneyWatcher::evaluate($transfer, [], $t0);
check('podróż: zagrożona przesiadka', count($m) === 1 && str_contains($m[0]['title'], 'Przesiadka zagrożona'));
[, , $done] = JourneyWatcher::evaluate([$leg([])], [], $t0 + 4200 + 1000);
check('podróż: koniec po przyjeździe', $done);

echo PHP_EOL . "Wynik: {$passed} OK, {$failed} błędów" . PHP_EOL;
exit($failed > 0 ? 1 : 0);
