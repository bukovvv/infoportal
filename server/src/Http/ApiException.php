<?php

declare(strict_types=1);

namespace KwInfo\Http;

use RuntimeException;

/** Błąd z komunikatem przeznaczonym dla użytkownika i kodem HTTP. */
final class ApiException extends RuntimeException
{
    public function __construct(string $message, public readonly int $status = 400)
    {
        parent::__construct($message);
    }
}
