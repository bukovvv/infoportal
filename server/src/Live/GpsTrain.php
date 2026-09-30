<?php

declare(strict_types=1);

namespace KwInfo\Live;

/** Pozycja pociągu z zewnętrznego źródła GPS, po normalizacji. */
final class GpsTrain
{
    public function __construct(
        public readonly string $number,
        public readonly float $lat,
        public readonly float $lon,
        public readonly int $speed,
        public readonly ?int $heading,
        public readonly int $delay,
        public readonly int $observedAt,
        public readonly string $provider,
    ) {
    }

    public function age(): int
    {
        return max(0, time() - $this->observedAt);
    }

    public function stale(): bool
    {
        return $this->age() > 300;
    }
}
