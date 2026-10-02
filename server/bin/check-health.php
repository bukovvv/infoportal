<?php

declare(strict_types=1);

// CRON: co 5 minut, np. */5 * * * * php /ścieżka/server/bin/check-health.php
// Wysyła e-mail, gdy stan danych (jak /api/status) jest zły dłużej niż GRACE, i drugi, gdy wróci do normy.
// Bez spamu: jeden alert na awarię, przypomnienie co REMIND, ponowny alert tylko przy pogorszeniu (degraded → down).
// Adres: 'alert_email' w server/config/local.php. Opcje: --dry-run (bez wysyłki), --test (próbny e-mail).

require dirname(__DIR__) . '/bootstrap.php';

use KwInfo\Api\StatusService;
use KwInfo\Config;

if (PHP_SAPI !== 'cli') {
    exit(1);
}

const GRACE = 15 * 60;
const REMIND = 12 * 3600;
const ORDER = ['ok' => 0, 'degraded' => 1, 'down' => 2];

$dryRun = in_array('--dry-run', $argv, true);
$to = (string) (Config::get('alert_email') ?? '');
if ($to === '' && !$dryRun) {
    echo "Brak 'alert_email' w server/config/local.php — alerty wyłączone.\n";
    exit(0);
}

$send = static function (string $subject, string $body) use ($to, $dryRun): void {
    if ($dryRun) {
        echo "--- e-mail do: " . ($to ?: '(brak adresu)') . "\nTemat: $subject\n\n$body\n";
        return;
    }
    $headers = implode("\r\n", [
        'From: Infoportal KW <noreply@' . parse_url((string) Config::get('site_url'), PHP_URL_HOST) . '>',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ]);
    if (!mail($to, mb_encode_mimeheader($subject, 'UTF-8'), $body, $headers)) {
        throw new RuntimeException('mail() nie wysłał wiadomości');
    }
};

$site = rtrim((string) Config::get('site_url'), '/');

try {
    if (in_array('--test', $argv, true)) {
        $send('Infoportal KW: próbny alert', "To jest próbna wiadomość z serwera Infoportalu KW.\nAlerty o stanie danych działają.\n\n$site/api/status");
        echo "Wysłano próbny e-mail.\n";
        exit(0);
    }

    $status = StatusService::build();
    $level = (string) $status['level'];
    $texts = array_map(static fn (array $m): string => '· ' . $m['text'], $status['messages']);

    $file = Config::path('storage') . '/alert-state.json';
    $state = is_file($file) ? (json_decode((string) file_get_contents($file), true) ?: []) : [];
    $state += ['since' => null, 'alertedLevel' => null, 'alertedAt' => null];
    $now = time();

    if ($level === 'ok') {
        if ($state['alertedLevel'] !== null) {
            $minutes = (int) round(($now - (int) $state['since']) / 60);
            $send('Infoportal KW: dane wróciły do normy', "Stan danych znów jest prawidłowy (problem trwał ok. $minutes min).\n\n$site/api/status");
        }
        $state = ['since' => null, 'alertedLevel' => null, 'alertedAt' => null];
    } else {
        $state['since'] ??= $now;
        $worse = $state['alertedLevel'] !== null && ORDER[$level] > ORDER[$state['alertedLevel']];
        $due = $state['alertedLevel'] === null ? $now - $state['since'] >= GRACE : $now - (int) $state['alertedAt'] >= REMIND;
        if ($due || $worse) {
            $label = $level === 'down' ? 'awaria' : 'problem z danymi';
            $since = date('H:i', (int) $state['since']);
            $send(
                "Infoportal KW: $label",
                "Od {$since} — {$label}:\n" . implode("\n", $texts)
                . "\n\nPortal pokazuje wtedy sam rozkład. Szczegóły: $site/admin/stan\n"
                . "Częsta przyczyna: feed GTFS-RT mkuran.pl stoi — wtedy wystarczy poczekać.\n"
                . "Gdy dane na żywo stoją, a feed działa, sprawdź CRON z refresh-live.php i server/storage/cron-errors.log.",
            );
            $state['alertedLevel'] = $level;
            $state['alertedAt'] = $now;
        }
    }

    if (!$dryRun) {
        file_put_contents($file, json_encode($state), LOCK_EX);
    }
    exit(0);
} catch (Throwable $exception) {
    fwrite(STDERR, '[' . date('Y-m-d H:i:s') . '] [BŁĄD alertu] ' . $exception->getMessage() . PHP_EOL);
    exit(1);
}
