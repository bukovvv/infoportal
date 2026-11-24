<?php

declare(strict_types=1);

namespace KwInfo\Http;

/** Plik z dysku (np. rysunek pojazdu) z długim cache. */
final class FileResponse
{
    public function __construct(
        public readonly string $path,
        public readonly string $contentType,
        public readonly int $maxAge = 86400,
        public readonly bool $private = false,
    ) {
    }

    public function send(): void
    {
        $etag = '"' . substr(hash('sha1', (string) filemtime($this->path) . filesize($this->path)), 0, 20) . '"';
        header('Content-Type: ' . $this->contentType);
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: ' . ($this->private ? 'private' : 'public') . ', max-age=' . $this->maxAge);
        header('ETag: ' . $etag);
        if (trim((string) ($_SERVER['HTTP_IF_NONE_MATCH'] ?? '')) === $etag) {
            http_response_code(304);
            return;
        }
        header('Content-Length: ' . filesize($this->path));
        readfile($this->path);
    }
}
