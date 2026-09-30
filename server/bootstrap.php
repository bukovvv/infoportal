<?php

declare(strict_types=1);

date_default_timezone_set('Europe/Warsaw');

spl_autoload_register(static function (string $class): void {
    if (!str_starts_with($class, 'KwInfo\\')) {
        return;
    }
    $file = __DIR__ . '/src/' . str_replace('\\', '/', substr($class, 7)) . '.php';
    if (is_file($file)) {
        require $file;
    }
});
