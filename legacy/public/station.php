<?php

declare(strict_types=1);

require dirname(__DIR__) . '/src/GtfsRepository.php';

use KwInfo\GtfsRepository;

$id = trim((string) ($_GET['id'] ?? ''));
$assetsReady = is_file(__DIR__ . '/assets/app.css') && is_file(__DIR__ . '/assets/app.js');
$error = null;
$data = null;

try {
    if ($id === '' || preg_match('/^[A-Za-z0-9_.:-]+$/', $id) !== 1) {
        throw new RuntimeException('Nieprawidłowy identyfikator stacji.');
    }
    $data = (new GtfsRepository(__DIR__ . '/data/kw_gtfs_routes.json'))->station($id);
} catch (RuntimeException $exception) {
    http_response_code(404);
    $error = $exception->getMessage();
}

function e(string|int|float|null $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}
?>
<!doctype html>
<html lang="pl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#c8102e">
    <title><?= $data ? e($data['name']) : 'Nie znaleziono stacji' ?> · KW Infoportal</title>
    <?php if ($assetsReady): ?>
        <link rel="stylesheet" href="/assets/vendor/bootstrap/bootstrap.min.css">
        <link rel="stylesheet" href="/assets/vendor/bootstrap-icons/bootstrap-icons.min.css">
        <link rel="stylesheet" href="/assets/vendor/leaflet/leaflet.css">
        <link rel="stylesheet" href="/assets/app.css">
        <script defer src="/assets/vendor/bootstrap/bootstrap.bundle.min.js"></script>
        <script defer src="/assets/vendor/leaflet/leaflet.js"></script>
        <script defer src="/assets/app.js"></script>
    <?php endif; ?>
</head>
<body>
<div class="kw-topline" aria-hidden="true"></div>
<nav class="navbar bg-white border-bottom sticky-top">
    <div class="container-xl">
        <a class="navbar-brand d-flex align-items-center gap-2" href="/"><span class="kw-logo">KW</span><span class="fw-bold">Infoportal</span></a>
        <a class="btn btn-outline-secondary btn-sm" href="/stations.php"><i class="bi bi-arrow-left me-1"></i>Wszystkie stacje</a>
    </div>
</nav>

<main class="container-xl py-4">
    <?php if ($error): ?>
        <div class="alert alert-danger"><h1 class="h5">Nie znaleziono stacji</h1><p class="mb-0"><?= e($error) ?></p></div>
    <?php else: ?>
        <nav aria-label="Okruszki" class="mb-3"><ol class="breadcrumb small mb-0"><li class="breadcrumb-item"><a href="/">Infoportal</a></li><li class="breadcrumb-item"><a href="/stations.php">Stacje</a></li><li class="breadcrumb-item active"><?= e($data['name']) ?></li></ol></nav>
        <div class="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
            <div><p class="text-uppercase text-secondary small fw-semibold mb-1">Stacja kolejowa</p><h1 class="h3 fw-bold mb-0"><?= e($data['name']) ?></h1></div>
            <?php if ($data['station']['lat'] !== null): ?><span class="small text-secondary"><i class="bi bi-geo-alt me-1"></i><?= e(number_format((float) $data['station']['lat'], 5)) ?>, <?= e(number_format((float) $data['station']['lon'], 5)) ?></span><?php endif; ?>
        </div>
        <div class="card">
            <div class="card-header bg-white"><h2 class="h5 mb-0">Dzisiejsze odjazdy KW</h2></div>
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead class="table-light"><tr><th>Godzina</th><th>Pociąg</th><th>Kierunek</th><th>Peron</th><th>Tor</th></tr></thead>
                    <tbody>
                    <?php foreach ($data['departures'] as $departure): ?>
                        <tr>
                            <td class="departure-time"><?= e($departure['time']) ?></td>
                            <td><a class="link-danger fw-semibold text-decoration-none train-route-link" href="/?train=<?= rawurlencode((string) $departure['number']) ?>#map">KW <?= e($departure['number']) ?></a></td>
                            <td><?= e($departure['destination']) ?></td>
                            <td><?= e($departure['platform'] ?: '—') ?></td>
                            <td><?= e($departure['track'] ?: '—') ?></td>
                        </tr>
                    <?php endforeach; ?>
                    <?php if ($data['departures'] === []): ?><tr><td colspan="5" class="text-center text-secondary py-4">Brak kursów KW dla tej stacji w dzisiejszym rozkładzie.</td></tr><?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    <?php endif; ?>
</main>
</body>
</html>
