<?php

declare(strict_types=1);

namespace KwInfo\Vehicles;

use DOMDocument;
use DOMElement;
use DOMXPath;
use KwInfo\Net\HttpClient;
use RuntimeException;

/**
 * Zestawienia pociągów KW z vagonWEB.cz (za zgodą; rysunki pojazdów — autorstwa współpracowników serwisu).
 * Strona pociągu pokazuje skład dopiero po wejściu z tej samej strony („pokaż”), stąd Referer na własny adres.
 */
final class Vagonweb
{
    public const BASE = 'https://www.vagonweb.cz/razeni/';

    /**
     * Rok rozkładu w numeracji vagonWEB: rozkład zmienia się w drugą niedzielę grudnia,
     * od tego dnia obowiązuje rozkład następnego roku.
     */
    public static function timetableYear(int $timestamp): int
    {
        $year = (int) date('Y', $timestamp);
        $secondSunday = strtotime('second sunday of december ' . $year, $timestamp);

        return $timestamp >= $secondSunday ? $year + 1 : $year;
    }

    /**
     * Pociągi KW z listy (wszystkie strony). @return array<int, array{number: string, name: string}>
     */
    public static function listTrains(int $year, callable $pause): array
    {
        $trains = [];
        $pages = 1;
        for ($page = 1; $page <= $pages; $page++) {
            $url = self::BASE . 'razeni.php?' . http_build_query(['zeme' => 'KW', 'rok' => $year, 's' => $page, 'lang' => 'pl']);
            $html = self::fetch($url);
            foreach (self::parseList($html, $year) as $train) {
                $trains[$train['number'] . '|' . $train['name']] = $train;
            }
            if (preg_match_all('/razeni\.php\?zeme=KW&(?:amp;)?rok=' . $year . '(?:&(?:amp;)?lang=\w+)?&(?:amp;)?s=(\d+)/', $html, $m)) {
                $pages = min(20, max($pages, ...array_map('intval', $m[1])));
            }
            if ($page < $pages) {
                $pause();
            }
        }

        return array_values($trains);
    }

    /** @return array<int, array{number: string, name: string}> */
    public static function parseList(string $html, int $year): array
    {
        $out = [];
        $pattern = '/vlak\.php\?zeme=KW&(?:amp;)?kategorie=[^&]*&(?:amp;)?cislo=([^&"\']+)&(?:amp;)?nazev=([^&"\']*)&(?:amp;)?rok=' . $year . '/';
        if (preg_match_all($pattern, $html, $m, PREG_SET_ORDER)) {
            foreach ($m as [, $number, $name]) {
                $number = urldecode($number);
                $out[$number . '|' . $name] = ['number' => $number, 'name' => urldecode($name)];
            }
        }

        return array_values($out);
    }

    public static function trainUrl(string $number, string $name, int $year): string
    {
        return self::BASE . 'vlak.php?' . http_build_query(['zeme' => 'KW', 'kategorie' => '', 'cislo' => $number, 'nazev' => $name, 'rok' => $year, 'lang' => 'pl']);
    }

    /** Strona pociągu ze składem (HTML). */
    public static function trainPage(string $number, string $name, int $year): string
    {
        $url = self::trainUrl($number, $name, $year);

        return self::fetch($url, ['Referer: ' . $url]);
    }

    /**
     * Zestawienia z dnia (najnowsze pierwsze, jak na stronie).
     * @return array<int, array{id: string, date: string|null, section: string|null, url: string, vehicles: array<int, array{series: string, image: string, seats: int|null, features: array<int, string>}>}>
     */
    public static function parseTrain(string $html, int $year): array
    {
        if (!str_contains($html, 'obrazek_vagonu')) {
            return [];
        }
        $doc = new DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $doc->loadHTML('<?xml encoding="utf-8">' . $html, LIBXML_NONET | LIBXML_NOWARNING | LIBXML_NOERROR);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
        $xp = new DOMXPath($doc);
        $sightings = [];
        foreach ($xp->query("//div[starts-with(@id, 'vlak_')]") ?: [] as $block) {
            /** @var DOMElement $block */
            $id = substr($block->getAttribute('id'), 5);
            if (!ctype_digit($id)) {
                continue;
            }
            $h4 = $xp->query('.//h4', $block)->item(0);
            $date = $h4 instanceof DOMElement && preg_match('/^\d{4}-\d{2}-\d{2}$/', $h4->getAttribute('id')) === 1 ? $h4->getAttribute('id') : null;
            $section = null;
            if ($h4 !== null && preg_match('/na odcinku:\s*(.+)$/u', trim($h4->textContent), $m) === 1) {
                $section = trim($m[1]);
            }
            $vehicles = [];
            foreach ($xp->query("//table[@id='vlacek{$id}']//td[contains(@class, 'bunka_vozu')]") ?: [] as $cell) {
                $vehicle = self::parseVehicle($xp, $cell);
                if ($vehicle !== null) {
                    $vehicles[] = $vehicle;
                }
            }
            if ($vehicles !== []) {
                $sightings[] = [
                    'id' => $id,
                    'date' => $date,
                    'section' => $section,
                    'url' => self::BASE . 'vlak.php?' . http_build_query(['rok' => $year, 'id' => $id, 'lang' => 'pl']),
                    'vehicles' => $vehicles,
                ];
            }
        }

        return $sightings;
    }

    /** @return array{series: string, image: string, seats: int|null, features: array<int, string>}|null */
    private static function parseVehicle(DOMXPath $xp, \DOMNode $cell): ?array
    {
        $img = $xp->query(".//img[contains(@class, 'obrazek_vagonu')]", $cell)->item(0);
        $series = $xp->query(".//span[contains(@class, 'tab-radam')]", $cell)->item(0);
        if (!$img instanceof DOMElement || $series === null) {
            return null;
        }
        $name = '';
        foreach ($series->childNodes as $child) {
            if ($child->nodeType === XML_TEXT_NODE) {
                $name .= $child->textContent;
            }
        }
        $features = [];
        $seats = null;
        $icon = null;
        $pocmist = $xp->query(".//span[contains(@class, 'tab-pocmist')]", $cell)->item(0);
        foreach ($pocmist?->childNodes ?? [] as $child) {
            if ($child instanceof DOMElement && $child->tagName === 'img') {
                $icon = pathinfo(parse_url($child->getAttribute('src'), PHP_URL_PATH) ?: '', PATHINFO_FILENAME);
                if ($icon !== '') {
                    $features[] = $icon;
                }
            } elseif ($child->nodeType === XML_TEXT_NODE && $icon !== null && preg_match('/\d+/', $child->textContent, $m) === 1
                && preg_match('/^\dsed$|^\dkup$|^\dsk$/', $icon) === 1) {
                $seats = ($seats ?? 0) + (int) $m[0];
            }
        }

        return [
            'series' => trim(preg_replace('/\s+/u', ' ', $name) ?? ''),
            'image' => $img->getAttribute('src'),
            'seats' => $seats,
            'features' => array_values(array_unique($features)),
        ];
    }

    /** Nazwa pliku rysunku w magazynie (z adresu rysunku na vagonWEB). */
    public static function imageFile(string $src): ?string
    {
        $path = (string) parse_url($src, PHP_URL_PATH);
        if (preg_match('#popisy/img/([A-Za-z0-9_-]+)/([A-Za-z0-9_.-]+\.(?:gif|png))$#', $path, $m) !== 1) {
            return null;
        }

        return $m[1] . '_' . $m[2];
    }

    public static function imageUrl(string $src): string
    {
        $path = (string) parse_url($src, PHP_URL_PATH);

        return 'https://www.vagonweb.cz/popisy/img/' . preg_replace('#^.*popisy/img/#', '', $path);
    }

    /** @param array<int, string> $headers */
    private static function fetch(string $url, array $headers = []): string
    {
        $response = HttpClient::get($url, array_merge(['Accept-Language: pl'], $headers), 20);
        if ($response['status'] !== 200) {
            throw new RuntimeException('vagonWEB: HTTP ' . $response['status'] . ' dla ' . $url);
        }

        return $response['body'];
    }
}
