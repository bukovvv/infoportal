<?php

declare(strict_types=1);

require dirname(__DIR__) . '/src/GtfsRepository.php';

use KwInfo\GtfsRepository;

$repository = new GtfsRepository(__DIR__ . '/data/kw_gtfs_routes.json');
$stations = $repository->stations();
$assetsReady = is_file(__DIR__ . '/assets/app.css') && is_file(__DIR__ . '/assets/app.js');

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
    <title>Stacje · KW Infoportal</title>
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
<nav class="navbar navbar-expand-lg bg-white border-bottom sticky-top">
    <div class="container-xl">
        <a class="navbar-brand d-flex align-items-center gap-2" href="/">
            <span class="kw-logo" aria-hidden="true">KW</span>
            <span class="lh-sm"><span class="d-block fw-bold">Infoportal</span><small class="d-block text-secondary">Koleje Wielkopolskie</small></span>
        </a>
        <a class="btn btn-outline-secondary btn-sm" href="/"><i class="bi bi-arrow-left me-1"></i>Strona główna</a>
    </div>
</nav>

<main class="container-xl py-4">
    <nav aria-label="Okruszki" class="mb-3">
        <ol class="breadcrumb small mb-0"><li class="breadcrumb-item"><a href="/">Infoportal</a></li><li class="breadcrumb-item active" aria-current="page">Stacje</li></ol>
    </nav>
    <div class="row g-4">
        <div class="col-lg-4">
            <div class="position-sticky station-sidebar">
                <h1 class="h3 fw-bold">Wszystkie stacje</h1>
                <p class="text-secondary">Przystanki i stacje występujące w rozkładzie Kolei Wielkopolskich.</p>
                <label class="form-label small fw-semibold" for="station-search">Wyszukaj stację</label>
                <div class="input-group">
                    <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
                    <input class="form-control" id="station-search" type="search" placeholder="Np. Gniezno" autocomplete="off">
                </div>
                <div class="alert alert-light border small mt-3 mb-0"><strong><?= e(count($stations)) ?></strong> stacji i przystanków w bazie.</div>
            </div>
        </div>
        <div class="col-lg-8">
            <div class="card">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-light"><tr><th>Stacja</th><th class="text-end">Kursy w bazie</th><th class="text-end"><span class="visually-hidden">Działania</span></th></tr></thead>
                        <tbody id="station-list">
                        <?php foreach ($stations as $station): ?>
                            <tr class="station-row" data-station-name="<?= e(mb_strtolower((string) $station['name'], 'UTF-8')) ?>">
                                <td><i class="bi bi-signpost-2 text-danger me-2"></i><strong><?= e($station['name']) ?></strong></td>
                                <td class="text-end text-secondary"><?= e($station['services']) ?></td>
                                <td class="text-end"><a class="btn btn-sm btn-outline-danger" href="/station.php?id=<?= rawurlencode((string) $station['id']) ?>">Szczegóły</a></td>
                            </tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <div class="p-4 text-center text-secondary" id="station-empty" hidden>Nie znaleziono takiej stacji.</div>
            </div>
        </div>
    </div>
</main>
</body>
</html>
