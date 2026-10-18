<?php

declare(strict_types=1);

namespace KwInfo\Http;

use RuntimeException;

/** Błąd z komunikatem przeznaczonym dla użytkownika i kodem HTTP. */
final class ApiException extends RuntimeException
{
    /** @param array<string, string> $headers np. Retry-After przy 429 */
    public function __construct(string $message, public readonly int $status = 400, public readonly array $headers = [])
    {
        parent::__construct($message);
    }
}
