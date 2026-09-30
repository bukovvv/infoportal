<?php

declare(strict_types=1);

require dirname(__DIR__) . '/src/Database.php';
require dirname(__DIR__) . '/src/NoticeRepository.php';
require dirname(__DIR__) . '/src/GtfsRepository.php';

use KwInfo\Database;
use KwInfo\GtfsRepository;
use KwInfo\NoticeRepository;
$notices = (new NoticeRepository(Database::connect()))->published();
$gtfs = new GtfsRepository(__DIR__ . '/data/kw_gtfs_routes.json');
$stations = $gtfs->stations();
$defaultStation = array_values(array_filter($stations, static fn (array $station): bool => $station['name'] === 'Poznań Główny'))[0] ?? $stations[0];
$now = new DateTimeImmutable('now', new DateTimeZone('Europe/Warsaw'));
$hasDangerNotice = count(array_filter($notices, static fn (array $notice): bool => $notice['severity'] === 'danger')) > 0;
$hasWarningNotice = count(array_filter($notices, static fn (array $notice): bool => $notice['severity'] === 'warning')) > 0;
$importantNoticeCount = count(array_filter($notices, static fn (array $notice): bool => in_array($notice['severity'], ['warning', 'danger'], true)));
$noticeVersion = hash('sha256', implode('|', array_map(static fn (array $notice): string => $notice['id'] . ':' . $notice['updated_at'], $notices)));
$assetsReady = is_file(__DIR__ . '/assets/app.css') && is_file(__DIR__ . '/assets/app.js');

function e(string|int|float|null $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

/** @param array<string, mixed> $notice */
function noticeTrainNumber(array $notice): ?string
{
    $content = (string) ($notice['title'] ?? '') . ' ' . (string) ($notice['body'] ?? '');
    return preg_match('/(?:Pociąg|KW)\s+(\d{3,6})/ui', $content, $matches) === 1 ? $matches[1] : null;
}
?>
<!doctype html>
<html lang="pl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#c8102e">
    <meta name="description" content="Informacja pasażerska Kolei Wielkopolskich">
    <title>KW Infoportal</title>
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
<a class="visually-hidden-focusable position-fixed top-0 start-0 z-3 m-2 btn btn-light" href="#main-content">Przejdź do treści</a>

<div class="kw-topline" aria-hidden="true"></div>
<nav class="navbar navbar-expand-lg bg-white border-bottom sticky-top" aria-label="Główna nawigacja">
    <div class="container-xl">
        <a class="navbar-brand d-flex align-items-center gap-2" href="#">
            <span class="kw-logo" aria-hidden="true">KW</span>
            <span class="lh-sm">
                <span class="d-block fw-bold">Infoportal</span>
                <small class="d-block text-secondary">Koleje Wielkopolskie</small>
            </span>
        </a>

        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#main-nav" aria-controls="main-nav" aria-expanded="false" aria-label="Pokaż menu">
            <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="main-nav">
            <ul class="navbar-nav ms-auto mb-2 mb-lg-0">
                <li class="nav-item"><a class="nav-link" href="#my-journey"><i class="bi bi-bookmark-check me-1"></i>Moja podróż<span class="badge rounded-pill text-bg-danger ms-1" id="saved-journey-badge" hidden>1</span></a></li>
                <li class="nav-item"><a class="nav-link active" aria-current="page" href="#connections"><i class="bi bi-arrow-left-right me-1"></i>Połączenia</a></li>
                <li class="nav-item"><a class="nav-link" href="#map"><i class="bi bi-geo-alt me-1"></i>Mapa</a></li>
                <li class="nav-item"><a class="nav-link" href="#departures"><i class="bi bi-clock me-1"></i>Odjazdy</a></li>
                <li class="nav-item"><a class="nav-link" href="/stations.php"><i class="bi bi-signpost-2 me-1"></i>Stacje</a></li>
                <li class="nav-item"><button class="nav-link border-0 bg-transparent" type="button" data-bs-toggle="modal" data-bs-target="#notices-modal"><i class="bi bi-megaphone me-1"></i>Komunikaty<?php if ($importantNoticeCount > 0): ?><span class="badge rounded-pill text-bg-danger ms-1"><?= e($importantNoticeCount) ?></span><?php endif; ?></button></li>
            </ul>
            <a class="btn btn-outline-danger ms-lg-3" href="https://wielkopolskiebilety.pl/" target="_blank" rel="noopener noreferrer">
                <i class="bi bi-ticket-perforated me-1"></i>Kup bilet
            </a>
        </div>
    </div>
</nav>

<main id="main-content" class="container-xl py-4">
    <div class="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-3">
        <div>
            <p class="text-uppercase text-secondary small fw-semibold mb-1">Informacja pasażerska</p>
            <h1 class="h3 fw-bold mb-0">Sytuacja na liniach KW</h1>
        </div>
        <p class="small text-secondary mb-0">Stan na <time datetime="<?= e($now->format(DateTimeInterface::ATOM)) ?>"><?= e($now->format('H:i')) ?></time></p>
    </div>

    <div class="alert <?= $hasDangerNotice ? 'alert-danger' : ($hasWarningNotice ? 'alert-warning' : 'alert-light border') ?> d-flex align-items-center gap-3 py-2 mb-4" role="status">
        <span class="status-dot <?= $hasDangerNotice ? 'bg-danger' : ($hasWarningNotice ? 'bg-warning' : 'bg-success') ?> flex-shrink-0" aria-hidden="true"></span>
        <div class="small"><strong><?= $hasDangerNotice ? 'Występują poważne utrudnienia.' : ($hasWarningNotice ? 'Na części tras występują utrudnienia.' : 'Ruch odbywa się bez poważnych zakłóceń.') ?></strong> Sprawdź komunikaty oraz szczegóły swojego pociągu.</div>
    </div>

    <section class="card mb-4" id="my-journey" aria-labelledby="my-journey-title">
        <div class="card-header bg-white d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div>
                <h2 class="h5 mb-0" id="my-journey-title"><i class="bi bi-bookmark-check text-danger me-2"></i>Moja podróż</h2>
                <small class="text-secondary">Najważniejsze informacje o zapisanym połączeniu</small>
            </div>
            <button class="btn btn-sm btn-outline-secondary" id="remove-journey" type="button" hidden><i class="bi bi-trash3 me-1"></i>Usuń</button>
        </div>
        <div class="card-body" id="my-journey-empty">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div><strong>Nie masz jeszcze zapisanej podróży.</strong><div class="small text-secondary">Wyszukaj połączenie i wybierz „Obserwuj podróż”.</div></div>
                <a class="btn btn-outline-danger" href="#connections">Wyszukaj połączenie</a>
            </div>
        </div>
        <div id="my-journey-content" hidden aria-live="polite">
            <div class="card-body">
                <div class="d-flex flex-wrap align-items-start justify-content-between gap-3">
                    <div>
                        <p class="small text-uppercase text-secondary fw-semibold mb-1" id="journey-state">Zaplanowana podróż</p>
                        <h3 class="h5 mb-1"><span id="journey-from"></span><i class="bi bi-arrow-right mx-2 text-secondary"></i><span id="journey-to"></span></h3>
                        <div class="text-secondary"><span id="journey-date"></span> · <strong class="text-body" id="journey-times"></strong> · <span id="journey-duration"></span></div>
                    </div>
                    <div class="text-lg-end"><span class="badge text-bg-light border fs-6" id="journey-countdown"></span><small class="d-block text-secondary mt-1" id="journey-live-state"></small></div>
                </div>
            </div>
            <div class="list-group list-group-flush" id="journey-legs"></div>
            <div class="alert alert-warning border-0 border-top rounded-0 mb-0" id="journey-notices" hidden></div>
        </div>
    </section>

    <section class="card connection-search mb-4" id="connections" aria-labelledby="connections-title">
        <div class="card-header bg-danger text-white">
            <h2 class="h5 mb-0" id="connections-title"><i class="bi bi-search me-2"></i>Wyszukaj połączenie</h2>
        </div>
        <div class="card-body">
            <form id="connection-form">
                <div class="row g-3 align-items-end">
                    <div class="col-lg-3 col-md-6">
                        <label class="form-label small fw-semibold" for="connection-from">Z</label>
                        <div class="station-combobox position-relative">
                            <i class="bi bi-geo-alt station-combobox__icon" aria-hidden="true"></i>
                            <input class="form-control station-autocomplete" id="connection-from" placeholder="Stacja początkowa" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="connection-from-suggestions" required>
                            <div class="station-suggestions" id="connection-from-suggestions" role="listbox" hidden></div>
                        </div>
                    </div>
                    <div class="col-auto d-none d-lg-block">
                        <button class="btn btn-outline-secondary" id="swap-stations" type="button" aria-label="Zamień stacje"><i class="bi bi-arrow-left-right"></i></button>
                    </div>
                    <div class="col-lg-3 col-md-6">
                        <label class="form-label small fw-semibold" for="connection-to">Do</label>
                        <div class="station-combobox position-relative">
                            <i class="bi bi-geo-alt-fill station-combobox__icon" aria-hidden="true"></i>
                            <input class="form-control station-autocomplete" id="connection-to" placeholder="Stacja docelowa" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="connection-to-suggestions" required>
                            <div class="station-suggestions" id="connection-to-suggestions" role="listbox" hidden></div>
                        </div>
                    </div>
                    <div class="col-lg-2 col-md-4">
                        <label class="form-label small fw-semibold" for="connection-date">Data</label>
                        <input class="form-control" id="connection-date" type="date" value="<?= e($now->format('Y-m-d')) ?>" required>
                    </div>
                    <div class="col-lg-2 col-md-4">
                        <label class="form-label small fw-semibold" for="connection-time">Godzina</label>
                        <input class="form-control" id="connection-time" type="time" value="<?= e($now->format('H:i')) ?>" required>
                    </div>
                    <div class="col-lg col-md-4 d-grid">
                        <button class="btn btn-danger" id="connection-submit" type="submit">Szukaj</button>
                    </div>
                </div>
            </form>
        </div>
        <div class="card-footer bg-white p-0" id="connection-results" role="status" aria-live="polite" hidden></div>
    </section>

    <div class="row g-3 align-items-stretch">
        <section class="col-lg-8" id="map" aria-labelledby="map-title">
            <div class="card h-100">
                <div class="card-header bg-white d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div>
                        <h2 class="h5 mb-0" id="map-title">Pociągi Kolei Wielkopolskich</h2>
                        <small class="text-secondary">Aktualne pozycje GPS</small>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge text-bg-light border" id="data-source">Łączenie…</span>
                        <button class="btn btn-sm btn-outline-secondary" id="refresh-trains" type="button">
                            <i class="bi bi-arrow-clockwise me-1"></i>Odśwież
                        </button>
                    </div>
                </div>
                <div class="card-body p-0 position-relative">
                    <div id="vehicle-map" aria-label="Mapa bieżącego położenia pociągów"></div>
                    <div class="map-legend bg-white border" aria-label="Legenda źródeł pozycji">
                        <span><i class="legend-swatch legend-swatch--gps"></i>GPS</span>
                        <span><i class="legend-swatch legend-swatch--estimated"></i>Estymowana</span>
                    </div>
                    <div class="map-message alert alert-warning m-3" id="map-error" role="alert" hidden></div>
                </div>
                <div class="card-footer bg-white text-secondary small d-flex flex-wrap justify-content-between gap-2">
                    <span><i class="bi bi-cursor me-1"></i>Kliknij pociąg, aby zobaczyć jego trasę</span>
                    <span id="last-update">Oczekiwanie na dane</span>
                </div>
            </div>
        </section>

        <aside class="col-lg-4">
            <div class="card h-100 live-panel">
                <div class="card-header bg-white">
                    <h2 class="h5 mb-0">Pociągi w ruchu</h2>
                </div>
                <div class="card-body border-bottom py-3">
                    <label class="form-label small fw-semibold" for="live-search">Znajdź numer pociągu</label>
                    <div class="input-group">
                        <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
                        <input class="form-control" id="live-search" type="search" inputmode="numeric" placeholder="Np. 77315" autocomplete="off">
                    </div>
                    <div class="row g-0 text-center mt-3 live-stats" aria-label="Statystyki ruchu">
                        <div class="col border-end"><strong id="stat-total">—</strong><small>aktywnych</small></div>
                        <div class="col border-end"><strong id="stat-gps">—</strong><small>z GPS</small></div>
                        <div class="col"><strong id="stat-estimated">—</strong><small>estymowanych</small></div>
                    </div>
                </div>
                <div class="list-group list-group-flush train-list" id="live-train-list" aria-live="polite">
                    <div class="p-4 text-center text-secondary">
                        <div class="spinner-border spinner-border-sm text-danger mb-2" role="status"><span class="visually-hidden">Pobieranie danych</span></div>
                        <div class="small">Pobieranie pozycji pociągów…</div>
                    </div>
                </div>
            </div>
        </aside>
    </div>

    <div class="row g-3 mt-1">
        <section class="col-lg-8" id="departures" aria-labelledby="departures-title">
            <div class="card">
                <div class="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div>
                        <h2 class="h5 mb-0" id="departures-title">Najbliższe odjazdy</h2>
                        <small class="text-secondary" id="departure-station-label"><?= e($defaultStation['name']) ?> · rozkład KW</small>
                    </div>
                    <form class="d-flex gap-2" id="departure-station-form">
                        <div class="station-combobox position-relative station-picker">
                            <i class="bi bi-signpost-2 station-combobox__icon" aria-hidden="true"></i>
                            <input class="form-control form-control-sm station-autocomplete" id="departure-station" value="<?= e($defaultStation['name']) ?>" aria-label="Wybierz stację odjazdów" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="departure-station-suggestions" required>
                            <div class="station-suggestions station-suggestions--right" id="departure-station-suggestions" role="listbox" hidden></div>
                        </div>
                        <button class="btn btn-sm btn-outline-secondary text-nowrap" id="nearest-station" type="button"><i class="bi bi-crosshair me-1"></i>Najbliższa</button>
                        <button class="btn btn-sm btn-outline-danger text-nowrap" type="submit"><i class="bi bi-arrow-repeat me-1"></i>Zmień</button>
                    </form>
                </div>
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-light">
                            <tr>
                                <th scope="col">Odjazd</th>
                                <th scope="col">Pociąg</th>
                                <th scope="col">Kierunek</th>
                                <th scope="col" class="text-center">Peron</th>
                                <th scope="col">Status</th>
                            </tr>
                        </thead>
                        <tbody id="departure-list">
                            <tr><td colspan="5" class="text-center text-secondary py-4"><span class="spinner-border spinner-border-sm text-danger me-2"></span>Pobieranie odjazdów…</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="card-footer bg-white text-end">
                    <span class="text-secondary small" id="departure-source">Dane rozkładowe PKP PLK</span>
                </div>
            </div>
        </section>

        <section class="col-lg-4" id="notices" aria-labelledby="notices-title">
            <div class="card h-100">
                <div class="card-header bg-white">
                    <h2 class="h5 mb-0" id="notices-title">Komunikaty</h2>
                </div>
                <div class="list-group list-group-flush">
                    <?php foreach (array_slice($notices, 0, 3) as $notice): ?>
                        <?php $noticeTrainNumber = noticeTrainNumber($notice); ?>
                        <article class="list-group-item py-3">
                            <div class="d-flex align-items-center gap-2 mb-1">
                                <i class="bi <?= $notice['severity'] === 'danger' ? 'bi-x-octagon text-danger' : ($notice['severity'] === 'warning' ? 'bi-exclamation-triangle text-warning' : 'bi-info-circle text-danger') ?>"></i>
                                <span class="small text-uppercase text-secondary fw-semibold"><?= e($notice['line']) ?></span>
                            </div>
                            <h3 class="h6 mb-1"><?= e($notice['title']) ?><?php if ($noticeTrainNumber): ?> <a class="badge text-bg-danger text-decoration-none ms-1" href="/?train=<?= e($noticeTrainNumber) ?>#map">KW <?= e($noticeTrainNumber) ?></a><?php endif; ?></h3>
                            <p class="small text-secondary mb-1"><?= e($notice['body']) ?></p>
                            <small class="text-body-tertiary">Aktualizacja <?= e((new DateTimeImmutable((string) $notice['updated_at']))->format('d.m.Y, H:i')) ?></small>
                        </article>
                    <?php endforeach; ?>
                    <?php if ($notices === []): ?><div class="list-group-item py-4 text-center text-secondary small">Brak aktywnych komunikatów.</div><?php endif; ?>
                </div>
                <div class="card-footer bg-white">
                    <button class="btn btn-link link-danger text-decoration-none small fw-semibold p-0" type="button" data-bs-toggle="modal" data-bs-target="#notices-modal">Wszystkie komunikaty <i class="bi bi-arrow-right"></i></button>
                </div>
            </div>
        </section>
    </div>
</main>

<footer class="kw-footer mt-4">
    <div class="container-xl py-4">
        <div class="row align-items-center g-3">
            <div class="col-lg-4 d-flex align-items-center gap-3">
                <span class="kw-logo" aria-hidden="true">KW</span>
                <div><strong class="d-block">Od kierownika dla Pasażerów.</strong><small class="text-secondary">Informacja w podróży po Wielkopolsce</small></div>
            </div>
            <div class="col-lg-5 small text-secondary">
                <span class="d-block"><strong class="text-body">KW Infoportal</strong> – wersja 0.1</span>
                <span class="d-block">Pozycja GPS: GTFS + Kierownik Plus API</span>
                <span class="d-block">Created with <span class="text-danger" aria-label="sercem">♥</span> by abuczek.</span>
            </div>
            <div class="col-lg-3 text-lg-end"><a class="btn btn-sm btn-outline-secondary" href="/admin/"><i class="bi bi-shield-lock me-1"></i>Panel administratora</a></div>
        </div>
    </div>
</footer>

<aside class="offcanvas offcanvas-end route-panel" tabindex="-1" id="route-panel" aria-labelledby="route-panel-title">
    <div class="offcanvas-header border-bottom">
        <div>
            <small class="text-uppercase text-secondary fw-semibold">Trasa pociągu</small>
            <h2 class="h5 mb-0" id="route-panel-title">Wybierz pociąg</h2>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Zamknij"></button>
    </div>
    <div class="offcanvas-body p-0">
        <div class="p-4 text-center text-secondary" id="route-loading" hidden>
            <div class="spinner-border spinner-border-sm text-danger mb-2" role="status"><span class="visually-hidden">Pobieranie trasy</span></div>
            <div class="small">Pobieranie trasy pociągu…</div>
        </div>
        <div class="alert alert-danger m-3" id="route-error" hidden></div>
        <div id="route-content" hidden>
            <div class="p-3 border-bottom bg-light">
                <div class="d-flex align-items-center gap-2 mb-2"><span class="badge text-bg-danger">KW</span><strong id="route-number"></strong></div>
                <div class="route-relation"><span id="route-origin"></span><i class="bi bi-arrow-right"></i><span id="route-destination"></span></div>
                <small class="text-secondary" id="route-source"></small>
            </div>
            <div class="route-stops" id="route-stops"></div>
            <div class="p-3 border-top"><a class="btn btn-outline-danger w-100" href="/stations.php"><i class="bi bi-signpost-2 me-1"></i>Przejdź do wszystkich stacji</a></div>
        </div>
    </div>
</aside>

<div class="modal fade" id="notices-modal" tabindex="-1" aria-labelledby="notices-modal-title" aria-hidden="true" data-notice-version="<?= e($noticeVersion) ?>" data-auto-open="<?= $hasDangerNotice ? 'true' : 'false' ?>">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <div>
                    <small class="text-uppercase text-secondary fw-semibold">Informacje dla podróżnych</small>
                    <h2 class="modal-title fs-5" id="notices-modal-title">Komunikaty</h2>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Zamknij"></button>
            </div>
            <div class="modal-body p-0">
                <div class="list-group list-group-flush">
                <?php foreach ($notices as $notice): ?>
                    <?php $noticeTrainNumber = noticeTrainNumber($notice); ?>
                    <article class="list-group-item p-3 notice-modal-item notice-modal-item--<?= e($notice['severity']) ?>">
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <span class="badge <?= $notice['severity'] === 'danger' ? 'text-bg-danger' : ($notice['severity'] === 'warning' ? 'text-bg-warning' : 'text-bg-secondary') ?>"><?= $notice['severity'] === 'danger' ? 'Poważne utrudnienie' : ($notice['severity'] === 'warning' ? 'Utrudnienie' : 'Informacja') ?></span>
                            <span class="small text-secondary"><?= e($notice['line']) ?></span>
                        </div>
                        <h3 class="h6 mb-1"><?= e($notice['title']) ?><?php if ($noticeTrainNumber): ?> <a class="badge text-bg-danger text-decoration-none ms-1" href="/?train=<?= e($noticeTrainNumber) ?>#map">KW <?= e($noticeTrainNumber) ?></a><?php endif; ?></h3>
                        <p class="small mb-2"><?= e($notice['body']) ?></p>
                        <small class="text-body-tertiary">Aktualizacja <?= e((new DateTimeImmutable((string) $notice['updated_at']))->format('d.m.Y, H:i')) ?></small>
                    </article>
                <?php endforeach; ?>
                <?php if ($notices === []): ?><div class="p-4 text-center text-secondary">Brak aktywnych komunikatów.</div><?php endif; ?>
                </div>
            </div>
            <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Zamknij</button></div>
        </div>
    </div>
</div>

<script id="station-data" type="application/json"><?= json_encode($stations, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) ?></script>
<script id="default-station" type="application/json"><?= json_encode(['id' => $defaultStation['id'], 'name' => $defaultStation['name']], JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) ?></script>
<script id="notice-data" type="application/json"><?= json_encode($notices, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) ?></script>

<?php if (!$assetsReady): ?>
    <div class="position-fixed bottom-0 end-0 m-3 alert alert-dark">Brak plików interfejsu w katalogu <code>public/assets</code>.</div>
<?php endif; ?>
</body>
</html>
