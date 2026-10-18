<?php

declare(strict_types=1);

namespace KwInfo\Http;

/** Odpowiedź tekstowa inna niż JSON (np. sitemap.xml). */
final class RawResponse
{
    public function __construct(
        public readonly string $body,
        public readonly string $contentType,
        public readonly int $maxAge = 3600,
    ) {
    }

    public function send(): void
    {
        header('Content-Type: ' . $this->contentType);
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: public, max-age=' . $this->maxAge);
        echo $this->body;
    }
}
