<?php

declare(strict_types=1);

// Kod z aplikacji przy logowaniu do panelu — awaryjnie, gdy nie ma telefonu ani kodów zapasowych.
// Włącza się go w panelu (Zabezpieczenia). Na serwerze przez SSH:
//   php server/bin/admin-2fa.php            stan
//   php server/bin/admin-2fa.php --disable  wyłącza kod z aplikacji (logowanie samym hasłem)
//   php server/bin/admin-2fa.php --logout-all  kończy wszystkie sesje panelu

require dirname(__DIR__) . '/bootstrap.php';

use KwInfo\Auth\AdminLog;
use KwInfo\Auth\AdminSecurity;

if (PHP_SAPI !== 'cli') {
    exit(1);
}

if (in_array('--disable', $argv, true)) {
    AdminSecurity::disable();
    AdminLog::write('2fa-disable', null, ['cli' => true]);
    echo "Kod z aplikacji wyłączony. Logowanie samym hasłem.\n";
} elseif (in_array('--logout-all', $argv, true)) {
    AdminSecurity::bumpGeneration();
    AdminLog::write('logout-all', null, ['cli' => true]);
    echo "Wszystkie sesje panelu zakończone.\n";
}
$s = AdminSecurity::status();
echo 'Kod z aplikacji: ' . ($s['twoFactor'] ? 'włączony (kodów zapasowych: ' . $s['recoveryLeft'] . ')' : 'wyłączony') . "\n";
