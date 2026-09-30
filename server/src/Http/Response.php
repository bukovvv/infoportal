<?php

declare(strict_types=1);

namespace KwInfo\Http;

final class Response
{
    /** @param array<string, string> $headers */
    public function __construct(
        public readonly mixed $data,
        public readonly int $status = 200,
        public readonly array $headers = [],
        public readonly ?int $maxAge = null,
    ) {
    }

    public function send(): void
    {
        $body = json_encode($this->data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        http_response_code($this->status);
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        foreach ($this->headers as $name => $value) {
            header($name . ': ' . $value);
        }
        if ($this->maxAge !== null && $this->status === 200) {
            $etag = '"' . substr(hash('sha1', $body), 0, 20) . '"';
            header('Cache-Control: public, max-age=' . $this->maxAge);
            header('ETag: ' . $etag);
            if (trim((string) ($_SERVER['HTTP_IF_NONE_MATCH'] ?? '')) === $etag) {
                http_response_code(304);
                return;
            }
        } elseif (!isset($this->headers['Cache-Control'])) {
            header('Cache-Control: no-store');
        }
        echo $body;
    }
}
