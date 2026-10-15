<?php

declare(strict_types=1);

namespace KwInfo\Gtfs;

/**
 * Granica województwa wielkopolskiego (wielkopolskie.json, PRG uproszczone do ok. 50 m) —
 * do obcinania kursów innych przewoźników do stacji w Wielkopolsce.
 */
final class Region
{
    /** Stacje w województwie, które przez uproszczenie granicy wypadają tuż za nią. */
    private const INSIDE = ['Wydartowo'];

    /** @var array<int, array{0: float, 1: float}> [lon, lat] */
    private array $ring;
    /** @var array{0: float, 1: float, 2: float, 3: float} minLon, minLat, maxLon, maxLat */
    private array $box;

    public function __construct(?string $file = null)
    {
        $data = json_decode((string) file_get_contents($file ?? __DIR__ . '/wielkopolskie.json'), true);
        $this->ring = $data['coordinates'] ?? [];
        $lons = array_column($this->ring, 0);
        $lats = array_column($this->ring, 1);
        $this->box = [min($lons), min($lats), max($lons), max($lats)];
    }

    public function contains(float $lat, float $lon, string $name = ''): bool
    {
        if (in_array($name, self::INSIDE, true)) {
            return true;
        }
        if ($lon < $this->box[0] || $lat < $this->box[1] || $lon > $this->box[2] || $lat > $this->box[3]) {
            return false;
        }
        // promień w kierunku wschodnim — nieparzysta liczba przecięć = punkt w środku
        $in = false;
        $n = count($this->ring);
        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            [$xi, $yi] = $this->ring[$i];
            [$xj, $yj] = $this->ring[$j];
            if (($yi > $lat) !== ($yj > $lat) && $lon < ($xj - $xi) * ($lat - $yi) / ($yj - $yi) + $xi) {
                $in = !$in;
            }
        }

        return $in;
    }
}
