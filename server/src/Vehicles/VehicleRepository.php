<?php

declare(strict_types=1);

namespace KwInfo\Vehicles;

use KwInfo\Config;
use KwInfo\Live\Realtime;

/**
 * Pojazdy spotykane na pociągach KW — z pliku zapisywanego przez bin/fetch-vehicles.php.
 */
final class VehicleRepository
{
    /** Potoczne nazwy serii (pokazywane obok oznaczenia z vagonWEB). */
    private const NAMES = [
        'EN76' => 'Pesa Elf',
        '22WE' => 'Pesa Elf',
        '48WE' => 'Pesa Elf 2',
        '36WEh' => 'Newag Impuls 2',
    ];

    /** Zestawienie starsze niż tyle dni nie jest już pokazywane. */
    private const MAX_AGE_DAYS = 180;

    /** @var array<string, mixed>|null */
    private ?array $data = null;

    /** Numery pojedyncze z zapisu vagonWEB, np. „77674/5” → 77674, 77675. @return array<int, string> */
    public static function expandNumber(string $number): array
    {
        if (preg_match('#^(\d+)/(\d+)$#', $number, $m) !== 1) {
            return [$number];
        }
        $second = substr($m[1], 0, max(0, strlen($m[1]) - strlen($m[2]))) . $m[2];

        return [$m[1], $second];
    }

    /**
     * Najnowsze zestawienie dla pociągu o jednym z numerów.
     * @param array<int, string> $numbers @return array<string, mixed>|null
     */
    public function forNumbers(array $numbers, ?int $now = null): ?array
    {
        $data = $this->data ??= Realtime::readJson(Config::path('vehicles_file'));
        $best = null;
        foreach ($data['trains'] ?? [] as $train) {
            if (array_intersect(self::expandNumber((string) $train['number']), $numbers) === []) {
                continue;
            }
            $latest = $train['sightings'][0] ?? null;
            if ($latest !== null && ($best === null || (string) $latest['date'] > (string) $best['sighting']['date'])) {
                $best = ['train' => $train, 'sighting' => $latest];
            }
        }
        if ($best === null || $best['sighting']['date'] === null) {
            return null;
        }
        $now ??= time();
        if (strtotime($best['sighting']['date'] . ' 12:00') < $now - self::MAX_AGE_DAYS * 86400) {
            return null;
        }
        $series = array_map(static fn (array $v): string => $v['series'], $best['sighting']['vehicles']);
        $also = [];
        foreach (array_slice($best['train']['sightings'], 1) as $other) {
            foreach ($other['vehicles'] as $v) {
                if (!in_array($v['series'], $series, true) && !in_array($v['series'], $also, true)) {
                    $also[] = $v['series'];
                }
            }
        }
        $images = $data['images'] ?? [];

        return [
            'date' => $best['sighting']['date'],
            'section' => $best['sighting']['section'],
            'url' => $best['sighting']['url'],
            'vehicles' => array_map(static function (array $v) use ($images): array {
                $file = Vagonweb::imageFile($v['image']);
                $size = $file !== null ? ($images[$file] ?? null) : null;
                return [
                    'series' => $v['series'],
                    'name' => self::NAMES[$v['series']] ?? null,
                    'image' => $size !== null ? '/api/vehicles/img/' . $file : null,
                    'width' => $size[0] ?? null,
                    'height' => $size[1] ?? null,
                    'seats' => $v['seats'],
                    'features' => $v['features'],
                ];
            }, $best['sighting']['vehicles']),
            'alsoSeen' => $also,
        ];
    }

    /** Ścieżka pliku rysunku albo null (bezpieczna nazwa, plik istnieje). */
    public static function imagePath(string $file): ?string
    {
        if (preg_match('/^[A-Za-z0-9_-]+_[A-Za-z0-9_.-]+\.(?:gif|png)$/', $file) !== 1 || str_contains($file, '..')) {
            return null;
        }
        $path = Config::path('vehicles_img_dir') . '/' . $file;

        return is_file($path) ? $path : null;
    }
}
