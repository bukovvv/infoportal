<?php

declare(strict_types=1);

// Jednorazowe przeniesienie komunikatów ze starej bazy (infoportal.sqlite z wersji 0.x):
//   php server/bin/import-legacy-notices.php /ścieżka/do/infoportal.sqlite

require dirname(__DIR__) . '/bootstrap.php';

use KwInfo\Notices\NoticeRepository;

if (PHP_SAPI !== 'cli' || !isset($argv[1]) || !is_file($argv[1])) {
    fwrite(STDERR, "Użycie: php import-legacy-notices.php <stara-baza.sqlite>\n");
    exit(1);
}

$old = new PDO('sqlite:' . $argv[1], null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$pdo = NoticeRepository::connect();
$exists = $pdo->prepare('SELECT COUNT(*) FROM notices WHERE title = ? AND created_at = ?');
$insert = $pdo->prepare(
    'INSERT INTO notices (title, body, line, severity, starts_at, ends_at, active, created_at, updated_at, trains)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "[]")'
);
$count = 0;
foreach ($old->query('SELECT * FROM notices ORDER BY id') as $row) {
    $exists->execute([$row['title'], $row['created_at']]);
    if ((int) $exists->fetchColumn() > 0) {
        continue;
    }
    $insert->execute([$row['title'], $row['body'], $row['line'], $row['severity'], $row['starts_at'], $row['ends_at'], $row['active'], $row['created_at'], $row['updated_at']]);
    $count++;
}
echo "Przeniesiono komunikatów: {$count}\n";
