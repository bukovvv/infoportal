<?php

declare(strict_types=1);

// Testy logiki backendu bez zewnętrznych zależności: php server/bin/selftest.php

require dirname(__DIR__) . '/bootstrap.php';
// testy trzymają w pamięci kilka dni rozkładu naraz (z kursami POLREGIO i bez); zapytanie API potrzebuje ok. 40 MB
ini_set('memory_limit', '512M');

use KwInfo\Http\ApiException;
use KwInfo\Auth\AdminLog;
use KwInfo\Http\RateLimit;
use KwInfo\Notices\NoticeRepository;
use KwInfo\Api\PublicApi;
use KwInfo\Clock;
use KwInfo\Config;
use KwInfo\Gtfs\ConnectionFinder;
use KwInfo\Gtfs\DayTimetable;
use KwInfo\Gtfs\GtfsImporter;
use KwInfo\Gtfs\PositionEstimator;
use KwInfo\Gtfs\Region;
use KwInfo\Gtfs\Timetable;
use KwInfo\Live\GtfsRtDecoder;
use KwInfo\Live\Realtime;
use KwInfo\Push\JourneyWatcher;
use KwInfo\Push\RouteWatcher;
use KwInfo\Push\WebPush;
use KwInfo\Stats\PunctualityRecorder;
use KwInfo\Stats\PunctualityRepository;
use KwInfo\Gtfs\GtfsSource;
use KwInfo\Vehicles\KwVehicleTypes;
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
check('splitNumbers z nazwą pociągu', GtfsImporter::splitNumbers('77684/5 Rzepicha') === ['77684', '77685'] && GtfsImporter::splitNumbers('77375 Sokół') === ['77375']);
check('numer pociągu z wyszukiwarki', PublicApi::trainQuery('77600') === '77600' && PublicApi::trainQuery(' KW 77600 ') === '77600' && PublicApi::trainQuery('kw77610/1') === '77610'
    && PublicApi::trainQuery('77375 Sokół') === '77375' && PublicApi::trainQuery('TLK 45102') === '45102' && PublicApi::trainQuery('12') === null && PublicApi::trainQuery('Poznań') === null);

// --- granica Wielkopolski (kursy POLREGIO obcinane do województwa)
$region = new Region();
check('region: Poznań, Piła, Kalisz w środku', $region->contains(52.4019, 16.9113) && $region->contains(53.1458, 16.7417) && $region->contains(51.7536, 18.0753));
check('region: Łódź, Zbąszynek, Głogów poza', !$region->contains(51.7570, 19.4310) && !$region->contains(52.2433, 15.8183) && !$region->contains(51.6573, 16.0866));
check('region: wyjątki przy granicy', $region->contains(52.5900, 17.9000, 'Wydartowo'));

// --- regiony: Małopolska z własnymi plikami i granicą, Wielkopolska bez zmian w ścieżkach
$storage = Config::path('storage');
Config::useRegion('malopolska');
$mp = new Region();
check('regiony: Małopolska — KML, pliki w storage/malopolska, bez panelu', Config::get('agency_id') === 'KML' && Config::get('rt_trip_prefix') === 'PLK_KML_'
    && Config::path('gtfs_db') === $storage . '/malopolska/gtfs.sqlite' && Config::path('app_db') === $storage . '/malopolska/app.sqlite'
    && Config::get('site_path') === '/malopolska' && Config::get('admin_enabled') === false && Config::path('storage') === $storage);
check('regiony: Kraków, Tarnów, Zakopane w Małopolsce; Katowice, Kielce, Poznań poza', $mp->contains(50.0677, 19.9476) && $mp->contains(50.0060, 20.9740)
    && $mp->contains(49.2995, 19.9497) && !$mp->contains(50.2577, 19.0175) && !$mp->contains(50.8746, 20.6300) && !$mp->contains(52.4019, 16.9113));
Config::useRegion(Config::DEFAULT_REGION);
check('regiony: Wielkopolska — KW, pliki jak dotąd w storage/', Config::get('agency_id') === 'KW' && Config::path('gtfs_db') === $storage . '/gtfs.sqlite'
    && Config::get('site_path') === '' && Config::get('admin_enabled') === true && Config::regions() === ['wielkopolska', 'malopolska']);

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
$entityPr = field(1, 'U_4') . field(3, field(1, field(1, 'PLK_PR_2026_7') . field(3, '20261001') . field(4, 0)));
$both = GtfsRtDecoder::decode($feed . field(2, $entityPr), ['PLK_KW_', 'PLK_PR_']);
check('RT: kilku przewoźników (KW + POLREGIO)', array_column($both['trips'], 'tripId') === ['PLK_KW_2026_1', 'PLK_KW_2026_2', 'PLK_PR_2026_7']);

// --- pozycje pojazdów (GPS Kolei Małopolskich): float32 w Position, pojazd bez współrzędnych pominięty
$f32 = static fn (int $no, float $v): string => varint(($no << 3) | 5) . pack('g', $v);
$vehicle = field(1, field(1, '51397284_454329') . field(5, '364951')) . field(2, $f32(1, 50.0672) . $f32(2, 19.9475) . $f32(5, 10.0))
    . field(3, 21) . field(5, 1790000050) . field(8, field(1, '10742'));
$noPosition = field(8, field(1, '10738')) . field(5, 1790000050);
$vfeed = field(1, field(1, '2.0') . field(3, 1790000060)) . field(2, field(1, 'v-10742') . field(4, $vehicle)) . field(2, field(1, 'v-10738') . field(4, $noPosition));
$vehicles = GtfsRtDecoder::vehicles($vfeed);
$v = $vehicles['vehicles'][0] ?? [];
check('RT: pozycje pojazdów (kurs, współrzędne, prędkość, czas)', $vehicles['timestamp'] === 1790000060 && count($vehicles['vehicles']) === 1
    && ($v['tripId'] ?? null) === '51397284_454329' && abs($v['lat'] - 50.0672) < 1e-4 && abs($v['lon'] - 19.9475) < 1e-4
    && abs($v['speed'] - 10.0) < 1e-6 && $v['timestamp'] === 1790000050 && $v['vehicleId'] === '10742' && $v['stopSeq'] === 21);
check('RT: dekoder kursów nie widzi pozycji pojazdów', GtfsRtDecoder::decode($vfeed)['trips'] === []);
$kmlDir = sys_get_temp_dir() . '/kw-selftest-kml-' . bin2hex(random_bytes(3));
mkdir($kmlDir);
file_put_contents($kmlDir . '/trips.txt', "route_id,service_id,trip_id,trip_headsign,direction_id,block_id\n364951,1_1,51397284_454329,OŚWIĘCIM,,39527\n364954,2_2,51397346_454391,KRAKÓW LOTNISKO,,33356/7\n364954,3_3,51397999_1,X,,\n");
check('GPS KMŁ: numer pociągu z block_id', KwInfo\Live\KmlTripMap::build(new KwInfo\Gtfs\GtfsSource($kmlDir)) === ['51397284_454329' => '39527', '51397346_454391' => '33356/7']);
@unlink($kmlDir . '/trips.txt');
@rmdir($kmlDir);

// --- propagacja opóźnień
$trip = ['key' => 'T@20261001', 'stops' => [[0, 'A', 1000, 1000], [1, 'B', 1600, 1660], [2, 'C', 2200, 2200], [3, 'D', 2800, 2800]]];
$rt = new Realtime(['T@20261001' => ['c' => 0, 's' => ['1' => [120, 180, 0]]]]);
$exp = $rt->apply($trip, 1500);
check('RT: brak danych przed pierwszą aktualizacją', $exp['stops'][0]['depDelay'] === null);
check('RT: opóźnienie przeniesione dalej', $exp['stops'][2]['arrDelay'] === 180 && $exp['stops'][3]['arr'] === 2980);
check('RT: bieżące opóźnienie', $exp['delay'] === 180 && $exp['source'] === 'rt');
$early = (new Realtime(['T@20261001' => ['c' => 0, 's' => ['1' => [-3000, null, 0]]]]))->apply($trip, 1500);
check('RT: przyjazd przed czasem nie przyspiesza odjazdu', $early['stops'][1]['arrDelay'] === -3000 && $early['stops'][1]['depDelay'] === 0
    && $early['stops'][3]['arrDelay'] === 0 && $early['stops'][3]['arr'] === 2800);
$ahead = (new Realtime(['T@20261001' => ['c' => 0, 's' => ['2' => [null, -600, 0]]]]))->apply($trip, 1500);
check('RT: prognoza odjazdu przed czasem = planowo', $ahead['stops'][2]['depDelay'] === 0);
$gone = (new Realtime(['T@20261001' => ['c' => 0, 's' => ['1' => [0, -60, 0]]]]))->apply($trip, 1900);
check('RT: faktyczny odjazd przed czasem zostaje', $gone['stops'][1]['depDelay'] === -60);
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

    // tablica: najbliższe 24 h, każdy pociąg raz (Łódź Kaliska: jeden odjazd i jeden przyjazd dziennie, nie dziś + jutro)
    $repeated = [];
    $outside = [];
    foreach (['Łódź Kaliska', 'Wolsztyn', 'Poznań Główny', 'Kępno', 'Głogów'] as $name) {
        if (!isset($byName[$name])) {
            continue;
        }
        foreach ([['mode' => 'dep'], ['mode' => 'arr'], ['mode' => 'dep', 'date' => $isoDay, 'time' => '18:00'], ['mode' => 'arr', 'date' => $isoDay]] as $params) {
            $_GET = $params + ['limit' => '40'];
            $rows = $api->board(['id' => $byName[$name]])->data['rows'];
            $numbers = array_map(static fn (array $r): string => ($r['isBus'] ? 'ZKA ' : '') . $r['number'], $rows);
            if (count($numbers) !== count(array_unique($numbers))) {
                $repeated[] = $name . ' ' . json_encode($params);
            }
            $start = isset($params['date']) ? strtotime($isoDay . ' ' . ($params['time'] ?? '00:00')) : time() - 3600;
            foreach ($rows as $r) {
                if (strtotime($r['scheduled']) >= $start + 86400 + 3600) {
                    $outside[] = $name . ' ' . $r['scheduled'];
                }
            }
        }
    }
    check('API: tablica bez tego samego pociągu dwa razy', $repeated === [], implode('; ', $repeated));
    check('API: tablica sięga najwyżej 24 h naprzód', $outside === [], implode('; ', array_slice($outside, 0, 3)));
    if (isset($byName['Łódź Kaliska'])) {
        $_GET = ['mode' => 'dep', 'date' => $isoDay, 'time' => '00:00', 'limit' => '40'];
        $lodz = $api->board(['id' => $byName['Łódź Kaliska']])->data['rows'];
        check('API: Łódź Kaliska — odjazdy tylko z wybranego dnia', $lodz !== [] && count(array_filter($lodz, static fn (array $r): bool => substr($r['scheduled'], 0, 10) !== $isoDay)) === 0, (string) count($lodz));
    }

    // POLREGIO i PKP Intercity: wszędzie poza mapą, obcięte do Wielkopolski
    $agency = $tt->agency();
    $partnerDay = DayTimetable::load($tt, $day->date, true);
    $partnerTrips = array_filter($partnerDay->trips, static fn (array $t): bool => $t['agency'] !== $agency);
    check('POLREGIO: kursy w bazie', $partnerTrips !== [], 'uruchom import-gtfs.php --force');
    check('POLREGIO: poza mapą (dzień bez partnerów)', array_filter($day->trips, static fn (array $t): bool => $t['agency'] !== $agency) === []);
    $stations = $tt->stations();
    $outsideRegion = [];
    $realEnds = false;
    foreach ($partnerTrips as $t) {
        foreach ($t['stops'] as $s) {
            $st = $stations[$s[DayTimetable::STATION]];
            if (!$region->contains($st['lat'], $st['lon'], $st['name'])) {
                $outsideRegion[$st['name']] = $st['kw'];
            }
        }
        $realEnds = $realEnds || ($t['destinationName'] !== null && $t['destinationName'] !== $stations[end($t['stops'])[DayTimetable::STATION]]['name']);
    }
    // poza województwem tylko stacje KW (np. Mogilno), do których kurs dojeżdża z Wielkopolski
    check('POLREGIO: stacje w Wielkopolsce i stacje KW przy granicy', !in_array(false, $outsideRegion, true), implode(', ', array_keys(array_filter($outsideRegion, static fn (bool $kw): bool => !$kw))));
    if (isset($byName['Mogilno'], $byName['Gniezno'])) {
        $toMogilno = array_filter($partnerTrips, static fn (array $t): bool => DayTimetable::indexOf($t, $byName['Mogilno']) !== null && DayTimetable::indexOf($t, $byName['Gniezno']) !== null);
        check('POLREGIO: Gniezno – Mogilno (stacja KW poza Wielkopolską)', $toMogilno !== []);
    }
    check('POLREGIO: prawdziwa stacja końcowa kursu wyjeżdżającego z Wielkopolski', $realEnds);
    // tablica: POLREGIO też, także na stacji bez KW
    $prOnly = array_values(array_filter($stations, static fn (array $s): bool => !$s['kw']));
    $_GET = ['date' => $isoDay, 'limit' => '40'];
    $prOnBoard = $prOnly !== [] && array_filter($api->board(['id' => $prOnly[0]['id']])->data['rows'], static fn (array $r): bool => $r['agency'] !== $agency) !== [];
    check('POLREGIO: na tablicy odjazdów (stacja tylko POLREGIO)', $prOnBoard, $prOnly[0]['name'] ?? 'brak stacji');
    // przesiadka KW ↔ POLREGIO: Poznań → Złotów (POLREGIO z Piły) albo dowolna trasa z odcinkiem innego przewoźnika
    $mixed = false;
    $partnerLeg = null;
    $tickets = [];
    $icLegs = [];
    $kmOk = true;
    foreach ([['Poznań Główny', 'Złotów'], ['Gniezno', 'Piła Główna'], ['Leszno', 'Kępno'], ['Poznań Główny', 'Konin']] as [$a, $b]) {
        if (!isset($byName[$a], $byName[$b])) {
            continue;
        }
        $_GET = ['from' => $byName[$a], 'to' => $byName[$b], 'date' => $isoDay, 'time' => '06:00', 'limit' => '10'];
        foreach ($api->connections()->data['connections'] as $c) {
            $agencies = array_unique(array_column($c['legs'], 'agency'));
            $mixed = $mixed || count($agencies) > 1;
            // suma odcinków różni się od całości najwyżej zaokrągleniami
            $kmOk = $kmOk && $c['distanceKm'] > 0 && abs($c['distanceKm'] - array_sum(array_column($c['legs'], 'distanceKm'))) <= count($c['legs']);
            foreach ($c['legs'] as $l) {
                if ($l['agency'] === 'PR') {
                    $partnerLeg ??= $l;
                    $tickets[$l['to']['name']][] = $l['kwTickets'];
                } elseif ($l['agency'] === 'IC') {
                    $icLegs[] = $l;
                }
            }
        }
    }
    check('POLREGIO: połączenia z przesiadką KW ↔ POLREGIO', $mixed);
    check('połączenia: kilometry', $kmOk);
    if (isset($byName['Poznań Główny'], $byName['Konin'])) {
        check('Intercity: w wyszukiwarce (Poznań – Konin)', $icLegs !== []);
        check('Intercity: bilety KW nie obowiązują', !in_array(true, array_column($icLegs, 'kwTickets'), true));
        $pk = array_values(array_filter($icLegs, static fn (array $l): bool => $l['from']['name'] === 'Poznań Główny' && $l['to']['name'] === 'Konin'));
        check('Intercity: Poznań – Konin ok. 100 km', $pk === [] || abs($pk[0]['distanceKm'] - 102) <= 8, (string) ($pk[0]['distanceKm'] ?? ''));
        // opcje wyszukiwarki: przewoźnicy, przesiadki, minimalny czas na przesiadkę
        $search = static function (array $extra) use ($api, $byName, $isoDay): array {
            $_GET = ['from' => $byName['Poznań Główny'], 'to' => $byName['Konin'], 'date' => $isoDay, 'time' => '06:00', 'limit' => '10'] + $extra;
            return $api->connections()->data['connections'];
        };
        $kwOnly = $search(['agencies' => 'KW']);
        check('opcje: tylko KW', $kwOnly !== [] && array_diff(array_merge(...array_map(static fn (array $c): array => array_column($c['legs'], 'agency'), $kwOnly)), ['KW']) === []);
        $direct = $search(['transfers' => '0']);
        check('opcje: bez przesiadek', $direct !== [] && max(array_column($direct, 'transfers')) === 0);
        $slow = $search(['minTransfer' => '15', 'agencies' => 'KW,PR']);
        check('opcje: przesiadka co najmniej 15 min', array_filter(array_merge(...array_column($slow, 'waits')), static fn (int $w): bool => $w < 15) === []);
        // obserwowana trasa: pociągi połączeń z odjazdem w okienku 6:00–9:00, z opcjami trasy
        $routeDate = (int) str_replace('-', '', $isoDay);
        $routeLegs = (new RouteWatcher($tt))->legs($byName['Poznań Główny'], $byName['Konin'], ['transfers' => 2, 'minTransfer' => 3, 'agencies' => ['KW', 'PR']], $routeDate, ['start' => 6 * 3600, 'end' => 9 * 3600], new Realtime(), 0);
        $firstDeps = array_map(static fn (array $l): string => date('H:i', $l['dep']), array_filter($routeLegs, static fn (array $l): bool => $l['first']));
        check('trasa: pociągi w okienku, bez Intercity', $routeLegs !== [] && min($firstDeps) >= '06:00' && max($firstDeps) <= '09:00'
            && !in_array('IC', array_column($routeLegs, 'agency'), true) && $routeLegs[0]['route'] === 'Poznań Główny → Konin', implode(' ', $firstDeps));
    }
    // sieć na mapie: także linie tylko partnerów (przycięte)
    $net = $api->network()->data['features'];
    check('mapa: linie POLREGIO / PKP Intercity w sieci', array_filter($net, static fn (array $f): bool => $f['properties']['partner']) !== []);
    // bilet KW na odcinku wspólnym z KW (do Piły) tak, na odcinku bez KW (do Złotowa) nie
    check('POLREGIO: bilety KW tylko na odcinkach wspólnych', !in_array(true, $tickets['Złotów'] ?? [false], true)
        && (!isset($tickets['Piła Główna']) || !in_array(false, $tickets['Piła Główna'], true)), json_encode($tickets, JSON_UNESCAPED_UNICODE));
    if ($partnerLeg !== null) {
        $_GET = [];
        $page = $api->trip(['key' => $partnerLeg['key']])->data;
        check('POLREGIO: strona pociągu bez pojazdu, z kilometrami', $page['agency'] !== $agency && $page['vehicle'] === null && $page['distanceKm'] > 0 && end($page['stops'])['km'] > 0);
        // kształt przycięty: końce blisko którejś z naszych stacji (Wielkopolska i stacje KW za granicą), nie np. w Gdyni
        $near = static function (array $pt) use ($stations): bool {
            foreach ($stations as $st) {
                if (PositionEstimator::distanceKm($pt[0], $pt[1], $st['lat'], $st['lon']) < 30) {
                    return true;
                }
            }
            return false;
        };
        check('POLREGIO: kształt na mapie przycięty do Wielkopolski', $page['shape'] !== [] && $near($page['shape'][0]) && $near(end($page['shape'])));
        $number = GtfsImporter::splitNumbers($partnerLeg['number'])[0];
        $_GET = ['q' => 'PR ' . $number];
        $found = $api->searchTrains()->data['trains'];
        check('POLREGIO: pociąg po numerze', $found !== [] && $found[0]['agency'] !== $agency && $found[0]['exact'], $number);
    }

    // wyszukiwanie pociągów po numerze
    $someTrip = null;
    foreach ($day->trips as $t) {
        if (!$t['isBus'] && preg_match('/^\d{5}$/', $t['number']) === 1) {
            $someTrip = $t;
            break;
        }
    }
    if ($someTrip !== null) {
        $_GET = ['q' => 'KW ' . $someTrip['number']];
        $found = $api->searchTrains()->data['trains'];
        $_GET = ['q' => substr($someTrip['number'], 0, 3)];
        $prefix = $api->searchTrains()->data['trains'];
        check('API: pociąg po numerze', $found !== [] && $found[0]['exact'] && $found[0]['number'] === $someTrip['number']
            && $prefix !== [] && count($prefix) <= 8 && count(array_unique(array_column($prefix, 'number'))) === count($prefix), $someTrip['number']);
    }
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
check('push: adres bez sztuczek z hostem', WebPush::allowedEndpoint('https://wns2-db5p.notify.windows.com/w/?token=BQYAAA%3d%3d')
    && !WebPush::allowedEndpoint('https://evil.com\\@fcm.googleapis.com/x') && !WebPush::allowedEndpoint('https://u@fcm.googleapis.com/x')
    && !WebPush::allowedEndpoint('https://fcm.googleapis.com:8443/x') && !WebPush::allowedEndpoint('https://fcm.googleapis.com.evil.com/x')
    && !WebPush::allowedEndpoint("https://fcm.googleapis.com/x\ny") && !WebPush::allowedEndpoint('https://fcm.googleapis.com/a\\b'));

// --- punktualność: wynik kursu po dojeździe, odwołanie, podsumowanie
$pTrip = ['key' => 'T1@20261020', 'tripId' => 'T1', 'serviceDate' => 20261020, 'offset' => 0, 'number' => '77610/1', 'agency' => 'KW', 'routeId' => 'KW_PKM2',
    'stops' => [[1, 'A', null, 36000, 0.0, null, null, 0, 0], [2, 'B', 36600, 36660, 9.0, null, null, 0, 0], [3, 'C', 37200, null, 18.0, null, null, 0, 0]]];
$pRt = new Realtime(['T1@20261020' => ['s' => ['1' => [null, 60], '2' => [240, 300], '3' => [420, null]]]]);
$early = PunctualityRecorder::outcome($pTrip, $pRt->apply($pTrip, 37500), 37500);
$done = PunctualityRecorder::outcome($pTrip, $pRt->apply($pTrip, 38300), 38300);
$cancelledRt = new Realtime(['T1@20261020' => ['c' => 1]]);
check('punktualność: zapis dopiero 10 min po opóźnionym przyjeździe', $early === null && $done !== null && $done['arrival_delay'] === 420
    && $done['departure_delay'] === 60 && $done['max_delay'] === 420 && $done['number'] === '77610/1' && $done['scheduled_departure'] === 36000);
check('punktualność: odwołany kurs po planowym przyjeździe', PunctualityRecorder::outcome($pTrip, $cancelledRt->apply($pTrip, 37000), 37000) === null
    && PunctualityRecorder::outcome($pTrip, $cancelledRt->apply($pTrip, 37900), 37900)['cancelled'] === 1);
$pSum = PunctualityRepository::summarize([
    ['service_date' => 20261018, 'arrival_delay' => 120, 'cancelled' => 0, 'skipped' => 0], ['service_date' => 20261019, 'arrival_delay' => 359, 'cancelled' => 0, 'skipped' => 0],
    ['service_date' => 20261019, 'arrival_delay' => 600, 'cancelled' => 0, 'skipped' => 0], ['service_date' => 20261020, 'arrival_delay' => null, 'cancelled' => 1, 'skipped' => 0],
    ['service_date' => 20261020, 'arrival_delay' => -60, 'cancelled' => 0, 'skipped' => 0], ['service_date' => 20261020, 'arrival_delay' => -3300, 'cancelled' => 0, 'skipped' => 0],
], 30);
check('punktualność: numer bez nazwy pociągu', PunctualityRecorder::number('1804/5 Bolesław Prus') === '1804/5' && PunctualityRecorder::number('77600') === '77600');
check('punktualność: na czas do 5:59, odwołany liczy się jako nie na czas, przyjazd godzinę przed czasem pominięty', $pSum['runs'] === 5 && $pSum['onTime'] === 3 && $pSum['late'] === 1 && $pSum['cancelled'] === 1
    && $pSum['share'] === 60 && $pSum['maxDelay'] === 10 && $pSum['avgDelay'] === 4 && $pSum['recent'][3] === ['date' => '2026-10-20', 'delay' => null, 'cancelled' => true]);
$pStrict = PunctualityRepository::summarize([['service_date' => 20261020, 'arrival_delay' => 240, 'cancelled' => 0, 'skipped' => 0], ['service_date' => 20261020, 'arrival_delay' => 600, 'cancelled' => 0, 'skipped' => 0]], 7, 3);
$pLoose = PunctualityRepository::summarize([['service_date' => 20261020, 'arrival_delay' => 240, 'cancelled' => 0, 'skipped' => 0], ['service_date' => 20261020, 'arrival_delay' => 600, 'cancelled' => 0, 'skipped' => 0]], 7, 10);
check('punktualność: próg wybrany przez pasażera (do 3 / do 10 min)', $pStrict['onTime'] === 0 && $pStrict['threshold'] === 3 && $pLoose['onTime'] === 2 && $pLoose['share'] === 100);
$statsDb = sys_get_temp_dir() . '/kw-selftest-stats-' . bin2hex(random_bytes(4)) . '.sqlite';
$statsRepo = new PunctualityRepository(PunctualityRepository::connect($statsDb));
check('punktualność: bez podwójnego zapisu kursu', $statsRepo->insert([$done]) === 1 && $statsRepo->insert([$done]) === 0 && isset($statsRepo->recordedKeys(20261020)['T1@20261020']));
unset($statsRepo);
array_map(static fn (string $f) => @unlink($f), [$statsDb, $statsDb . '-wal', $statsDb . '-shm']);

// --- komunikaty: czysty tekst, dziennik panelu, limit zapytań
check('komunikat: bez znaczników HTML i znaków sterujących', NoticeRepository::plain("Opóźnienie <5 min <b>x</b><script>alert(1)</script> a < b\u{200B}\x07!\r\n\r\n\r\n\r\nDalej", 500, true) === "Opóźnienie <5 min xalert(1) a < b!\n\nDalej"
    && NoticeRepository::plain("Tytuł\nw dwóch liniach", 160) === 'Tytuł w dwóch liniach' && NoticeRepository::plain(str_repeat('ą', 200), 160) === str_repeat('ą', 160));
$noticeDb = sys_get_temp_dir() . '/kw-selftest-notices-' . bin2hex(random_bytes(4)) . '.sqlite';
$noticeRepo = new NoticeRepository(NoticeRepository::connect($noticeDb));
$saved = $noticeRepo->save(['title' => 'Zmiany na stacji Konin', 'body' => "Wstęp\n- KW 77600 wcześniej o 3 min", 'active' => true,
    'trains' => ['77600', '77600', 'x1', 12, 'PR 85724', 'PR85724'], 'stations' => ['30601', '<b>', '30601'], 'lines' => ['kutno', 'Zła Linia', 'pkm2']]);
check('komunikat: stacje i linie, bez powtórzeń i złych wartości', $saved['trains'] === ['77600', 'PR 85724'] && $saved['stations'] === ['30601'] && $saved['lines'] === ['kutno', 'pkm2']
    && $noticeRepo->find($saved['id'])['body'] === "Wstęp\n- KW 77600 wcześniej o 3 min" && $noticeRepo->published()[0]['id'] === $saved['id']);
unset($noticeRepo, $saved);
array_map(static fn (string $f) => @unlink($f), [$noticeDb, $noticeDb . '-wal', $noticeDb . '-shm']);
AdminLog::use(new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]));
AdminLog::write('notice-create', 7, ['after' => ['title' => 'Test']]);
AdminLog::write('login-failed', null, ['username' => 'x']);
$log = AdminLog::recent();
check('dziennik panelu: najnowsze na górze, z treścią', count($log) === 2 && $log[0]['action'] === 'login-failed' && $log[1]['noticeId'] === 7 && $log[1]['detail']['after']['title'] === 'Test');
AdminLog::use(null);
$limitIp = 'selftest-' . bin2hex(random_bytes(6));
$limited = 0;
for ($i = 0; $i < RateLimit::LIMITS['push'][0] + 2; $i++) {
    try {
        RateLimit::hit('push', $limitIp, 1_800_000_000);
    } catch (ApiException $e) {
        $limited++;
        $retry = $e->headers['Retry-After'] ?? null;
    }
}
RateLimit::hit('push', $limitIp, 1_800_000_000 + RateLimit::LIMITS['push'][1]);
check('limit zapytań: blokada po limicie, Retry-After, nowe okno od zera', $limited === 2 && $e->status === 429 && (int) $retry > 0);

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

// --- powiadomienia o trasie: okienko czasu i kiedy wysłać
$win = ['dir' => 'ab', 'days' => [1, 2, 3, 4, 5], 'start' => 6 * 3600 + 1800, 'end' => 8 * 3600];
check('trasa: okienko w dzień roboczy od godziny przed', RouteWatcher::active($win, 3, 5 * 3600 + 1800) && RouteWatcher::active($win, 1, 8 * 3600)
    && !RouteWatcher::active($win, 3, 5 * 3600) && !RouteWatcher::active($win, 3, 8 * 3600 + 60) && !RouteWatcher::active($win, 6, 7 * 3600));
$rleg = static fn (array $o): array => $o + ['id' => 'KW_1@20261014|P', 'number' => '77615', 'agency' => 'KW', 'from' => 'Poznań Główny', 'route' => 'Poznań Główny → Gniezno',
    'dep' => $t0 + 1800, 'depDelay' => null, 'cancelled' => false, 'first' => true];
[$m] = RouteWatcher::evaluate([$rleg(['depDelay' => 4])], [], $t0);
check('trasa: opóźnienie 4 min bez powiadomienia', $m === []);
[$m, $st] = RouteWatcher::evaluate([$rleg(['depDelay' => 5])], [], $t0);
check('trasa: opóźnienie 5 min — powiadomienie', count($m) === 1 && str_contains($m[0]['title'], 'KW 77615: opóźnienie +5 min') && str_contains($m[0]['body'], 'Trasa Poznań Główny → Gniezno'));
[$m, $st] = RouteWatcher::evaluate([$rleg(['depDelay' => 8])], $st, $t0);
[$m2, $st] = RouteWatcher::evaluate([$rleg(['depDelay' => 0])], $st, $t0);
check('trasa: zmiana o 3 min bez powiadomienia, powrót do rozkładu z powiadomieniem', $m === [] && count($m2) === 1 && str_contains($m2[0]['title'], 'planowo'));
[$m] = RouteWatcher::evaluate([$rleg(['depDelay' => 12, 'first' => false])], [], $t0);
[$m2, $st] = RouteWatcher::evaluate([$rleg(['cancelled' => true, 'first' => false, 'agency' => 'PR'])], [], $t0);
[$again] = RouteWatcher::evaluate([$rleg(['cancelled' => true, 'first' => false])], $st, $t0);
check('trasa: dalszy odcinek tylko odwołanie, raz', $m === [] && count($m2) === 1 && str_contains($m2[0]['title'], 'PR 77615 odwołany') && $again === []);
$many = array_map(static fn (int $i): array => $rleg(['id' => "KW_$i@20261014|P", 'cancelled' => true]), range(1, 5));
[$m, $st] = RouteWatcher::evaluate($many, [], $t0);
[$m2] = RouteWatcher::evaluate($many, $st, $t0);
check('trasa: najwyżej 3 powiadomienia naraz, reszta w następnym przebiegu', count($m) === 3 && count($m2) === 2);
check('trasa: stan bez starych kursów', RouteWatcher::prune(['c' => ['A@20261001|P' => true, 'B@20261013|P' => true], 'd' => ['C@20261002|P' => 6]], 20261014) === ['c' => ['B@20261013|P' => true]]);

// rodzaj pojazdu z rozkładu KW: numer z dopisanym rodzajem, różny w różne dni
$kwDir = sys_get_temp_dir() . '/kw-selftest-' . bin2hex(random_bytes(3));
mkdir($kwDir);
file_put_contents($kwDir . '/trips.txt', "route_id,service_id,trip_id,trip_headsign,trip_short_name,wheelchair_accessible,bikes_allowed,PKM\n"
    . "KW,1,1,Wolsztyn,77246 PAROWY,2,2,3\nKW,2,2,Wolsztyn,77246 SZYNOBUS,1,1,3\nKW,3,3,Rawicz,17217/6 EZT,1,1,21\nKW,4,4,Gołańcz,77601/0 SZYNOBUS/BUS,,,3\nKW,5,5,X,77999 COSIEK,1,1,0\n");
file_put_contents($kwDir . '/calendar_dates.txt', "service_id,date,exception_type\n1,20261121,1\n2,20261116,1\n2,20261117,1\n2,20261121,1\n3,20261116,1\n4,20261116,1\n5,20261116,1\n");
file_put_contents($kwDir . '/stop_times.txt', "trip_id,stop_id,arrival_time,departure_time,stop_sequence,bus\n"
    . "1,159,15:20:00,15:20:00,1,0\n1,524,17:45:00,17:45:00,2,0\n2,100,7:20:00,7:20:00,1,0\n2,88,8:30:00,8:30:00,2,0\n"
    . "3,1,6:00:00,6:00:00,1,0\n3,2,7:00:00,7:00:00,2,0\n4,1,5:34:00,6:00:00,1,1\n4,2,6:40:00,6:40:00,2,0\n5,1,9:00:00,9:00:00,1,0\n");
$kwTypes = KwVehicleTypes::build(new GtfsSource($kwDir));
array_map('unlink', glob($kwDir . '/*') ?: []);
rmdir($kwDir);
check('pojazd KW: rodzaj według dnia, godziny kursu, numery łamane, nieznany rodzaj pominięty',
    $kwTypes['77246'][0] === ['k' => 'steam', 'w' => false, 'b' => false, 's' => 55200, 'e' => 63900, 'd' => [20261121]]
    && $kwTypes['77246'][1]['d'] === [20261116, 20261117, 20261121]
    && $kwTypes['17216'][0]['k'] === 'emu' && $kwTypes['17217'][0]['k'] === 'emu' && $kwTypes['77600'][0]['k'] === 'dmu' && $kwTypes['77600'][0]['w'] === null
    && !isset($kwTypes['77999']));
$kwLookup = new KwVehicleTypes($kwTypes);
check('pojazd KW: ten sam numer w sobotę — parowóz po południu, szynobus rano; dzień spoza rozkładu tylko przy jednym rodzaju',
    $kwLookup->forTrip(['77246'], 20261121, 55200)['kind'] === 'steam' && $kwLookup->forTrip(['77246'], 20261121, 26400)['kind'] === 'dmu'
    && $kwLookup->forTrip(['77246 Retro'], 20261121, 59000)['kind'] === 'steam' && $kwLookup->forTrip(['77246'], 20261121, 40000) === null
    && $kwLookup->forTrip(['17216/7'], 20270105, 21600)['kind'] === 'emu' && $kwLookup->forTrip(['77246'], 20270105, 26400)['kind'] === 'dmu');

echo PHP_EOL . "Wynik: {$passed} OK, {$failed} błędów" . PHP_EOL;
exit($failed > 0 ? 1 : 0);
