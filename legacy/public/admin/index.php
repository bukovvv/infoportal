<?php

declare(strict_types=1);

require dirname(__DIR__, 2) . '/src/AdminAuth.php';
require dirname(__DIR__, 2) . '/src/Database.php';
require dirname(__DIR__, 2) . '/src/NoticeRepository.php';

use KwInfo\AdminAuth;
use KwInfo\Database;
use KwInfo\NoticeRepository;

AdminAuth::start();
$repository = new NoticeRepository(Database::connect());
$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'login') {
    if (AdminAuth::login((string) ($_POST['username'] ?? ''), (string) ($_POST['password'] ?? ''))) {
        header('Location: /admin/');
        exit;
    }
    if ((int) ($_SESSION['login_attempts'] ?? 0) >= 5) {
        usleep(500000);
    }
    $error = 'Nieprawidłowa nazwa użytkownika lub hasło.';
}

if (AdminAuth::check() && $_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') !== 'login') {
    if (!AdminAuth::verifyCsrf($_POST['csrf'] ?? null)) {
        http_response_code(419);
        $error = 'Sesja formularza wygasła. Odśwież stronę i spróbuj ponownie.';
    } else {
        try {
            $action = (string) ($_POST['action'] ?? '');
            if ($action === 'save') {
                $repository->save($_POST);
                $_SESSION['flash'] = 'Komunikat został zapisany.';
            } elseif ($action === 'delete') {
                if (!$repository->delete((int) ($_POST['id'] ?? 0))) {
                    throw new InvalidArgumentException('Nie znaleziono komunikatu do usunięcia. Lista mogła zostać wcześniej odświeżona.');
                }
                $_SESSION['flash'] = 'Komunikat został usunięty.';
            } elseif ($action === 'logout') {
                AdminAuth::logout();
                header('Location: /admin/');
                exit;
            }
            header('Location: /admin/');
            exit;
        } catch (InvalidArgumentException $exception) {
            $error = $exception->getMessage();
        }
    }
}

$loggedIn = AdminAuth::check();
$notices = $loggedIn ? $repository->all() : [];
$activeCount = count(array_filter($notices, static fn (array $notice): bool => (int) $notice['active'] === 1));
$dangerCount = count(array_filter($notices, static fn (array $notice): bool => (int) $notice['active'] === 1 && $notice['severity'] === 'danger'));
$hiddenCount = count($notices) - $activeCount;
$editing = null;
$editId = filter_input(INPUT_GET, 'edit', FILTER_VALIDATE_INT);
if ($loggedIn && $editId) {
    foreach ($notices as $notice) {
        if ((int) $notice['id'] === $editId) {
            $editing = $notice;
            break;
        }
    }
}
$flash = $_SESSION['flash'] ?? null;
unset($_SESSION['flash']);
$assetsReady = is_file(dirname(__DIR__) . '/assets/app.css') && is_file(dirname(__DIR__) . '/assets/app.js');

function e(string|int|null $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}
?>
<!doctype html>
<html lang="pl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <meta name="theme-color" content="#c8102e">
    <title>Panel administratora · KW Infoportal</title>
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
<body class="admin-body">
<div class="kw-topline" aria-hidden="true"></div>
<nav class="navbar bg-white border-bottom">
    <div class="container-xl">
        <a class="navbar-brand d-flex align-items-center gap-2" href="/"><span class="kw-logo">KW</span><span class="lh-sm"><span class="d-block fw-bold">Panel administratora</span><small class="d-block text-secondary">Infoportal</small></span></a>
        <?php if ($loggedIn): ?>
            <div class="d-flex gap-2">
                <a class="btn btn-sm btn-outline-secondary" href="/" target="_blank"><i class="bi bi-box-arrow-up-right me-1"></i><span class="d-none d-sm-inline">Otwórz </span>portal</a>
                <form method="post"><input type="hidden" name="csrf" value="<?= e(AdminAuth::csrfToken()) ?>"><input type="hidden" name="action" value="logout"><button class="btn btn-sm btn-outline-secondary" type="submit"><i class="bi bi-box-arrow-right me-1"></i>Wyloguj</button></form>
            </div>
        <?php else: ?>
            <a class="btn btn-sm btn-outline-secondary" href="/"><i class="bi bi-arrow-left me-1"></i>Wróć do portalu</a>
        <?php endif; ?>
    </div>
</nav>

<?php if (!$loggedIn): ?>
    <main class="container py-5">
        <div class="card admin-login mx-auto">
            <div class="card-header bg-white"><h1 class="h5 mb-0">Logowanie administratora</h1></div>
            <div class="card-body p-4">
                <?php if (!AdminAuth::isLoginConfigured()): ?><div class="alert alert-warning small"><strong>Panel wymaga konfiguracji.</strong> Ustaw produkcyjny hash hasła przed pierwszym logowaniem.</div><?php endif; ?>
                <?php if ($error): ?><div class="alert alert-danger small"><?= e($error) ?></div><?php endif; ?>
                <form method="post" autocomplete="on">
                    <input type="hidden" name="action" value="login">
                    <div class="mb-3"><label class="form-label" for="username">Nazwa użytkownika</label><input class="form-control" id="username" name="username" autocomplete="username" required autofocus></div>
                    <div class="mb-3"><label class="form-label" for="password">Hasło</label><input class="form-control" id="password" name="password" type="password" autocomplete="current-password" required></div>
                    <button class="btn btn-danger w-100" type="submit">Zaloguj się</button>
                </form>
            </div>
            <div class="card-footer bg-white small text-secondary">Dostęp wyłącznie dla osób upoważnionych.</div>
        </div>
    </main>
<?php else: ?>
    <main class="container-xl py-4">
        <div class="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
            <div><p class="text-uppercase text-secondary small fw-semibold mb-1">Zarządzanie treścią</p><h1 class="h3 fw-bold mb-0">Komunikaty pasażerskie</h1><p class="text-secondary mb-0 mt-1">Publikuj informacje widoczne w portalu pasażera.</p></div>
            <a class="btn btn-danger" href="/admin/"><i class="bi bi-plus-lg me-1"></i>Nowy komunikat</a>
        </div>
        <?php if ($flash): ?><div class="alert alert-success"><?= e($flash) ?></div><?php endif; ?>
        <?php if ($error): ?><div class="alert alert-danger"><?= e($error) ?></div><?php endif; ?>

        <div class="row g-3 mb-4" aria-label="Podsumowanie komunikatów">
            <div class="col-sm-4"><div class="card admin-stat h-100"><div class="card-body d-flex align-items-center gap-3"><span class="admin-stat__icon text-bg-danger"><i class="bi bi-megaphone"></i></span><div><strong><?= e(count($notices)) ?></strong><small>wszystkich komunikatów</small></div></div></div></div>
            <div class="col-sm-4"><div class="card admin-stat h-100"><div class="card-body d-flex align-items-center gap-3"><span class="admin-stat__icon text-bg-success"><i class="bi bi-broadcast"></i></span><div><strong><?= e($activeCount) ?></strong><small>aktywnych w panelu</small></div></div></div></div>
            <div class="col-sm-4"><div class="card admin-stat h-100"><div class="card-body d-flex align-items-center gap-3"><span class="admin-stat__icon <?= $dangerCount > 0 ? 'text-bg-warning' : 'text-bg-secondary' ?>"><i class="bi bi-exclamation-triangle"></i></span><div><strong><?= e($dangerCount) ?></strong><small>poważnych utrudnień</small></div></div></div></div>
        </div>

        <section class="card mb-4" aria-labelledby="data-health-title">
            <div class="card-header bg-white d-flex align-items-center justify-content-between gap-2"><div><h2 class="h5 mb-0" id="data-health-title">Stan źródeł danych</h2><small class="text-secondary">Automatyczna kontrola GPS, rozkładu i bazy komunikatów</small></div><button class="btn btn-sm btn-outline-secondary" id="refresh-admin-health" type="button"><i class="bi bi-arrow-clockwise me-1"></i>Odśwież</button></div>
            <div class="card-body"><div class="row g-3" id="admin-data-health" aria-live="polite"><div class="col-12 text-center text-secondary small py-2"><span class="spinner-border spinner-border-sm text-danger me-2"></span>Sprawdzanie źródeł danych…</div></div></div>
        </section>

        <div class="row g-4">
            <div class="col-lg-5">
                <div class="card position-sticky admin-editor">
                    <div class="card-header bg-white d-flex align-items-center gap-2"><span class="admin-section-icon"><i class="bi <?= $editing ? 'bi-pencil' : 'bi-plus-lg' ?>"></i></span><div><h2 class="h5 mb-0"><?= $editing ? 'Edytuj komunikat' : 'Nowy komunikat' ?></h2><small class="text-secondary"><?= $editing ? 'Zmień treść lub okres publikacji' : 'Uzupełnij informację dla pasażerów' ?></small></div></div>
                    <div class="card-body">
                        <form method="post">
                            <input type="hidden" name="csrf" value="<?= e(AdminAuth::csrfToken()) ?>">
                            <input type="hidden" name="action" value="save">
                            <?php if ($editing): ?><input type="hidden" name="id" value="<?= e($editing['id']) ?>"><?php endif; ?>
                            <details class="admin-template mb-4">
                                <summary><span class="admin-template__icon"><i class="bi bi-train-front"></i></span><span><strong>Szybki generator komunikatu</strong><small>Opóźnienie, odwołanie, ZKA, peron lub skrócona relacja</small></span><i class="bi bi-chevron-down ms-auto admin-template__chevron"></i></summary>
                                <div class="admin-template__body">
                                    <div class="row g-3">
                                        <div class="col-12"><label class="form-label small fw-semibold" for="template-kind">Rodzaj komunikatu</label><select class="form-select form-select-sm" id="template-kind"><option value="delay">Opóźnienie pociągu</option><option value="cancellation">Odwołanie pociągu</option><option value="bus">Zastępcza komunikacja autobusowa</option><option value="platform">Zmiana peronu lub toru</option><option value="shortened">Skrócona relacja</option></select></div>
                                        <div class="col-sm-4"><label class="form-label small fw-semibold" for="template-train">Numer pociągu</label><input class="form-control form-control-sm" id="template-train" inputmode="numeric" placeholder="87920"></div>
                                        <div class="col-sm-8" data-template-for="delay"><label class="form-label small fw-semibold" for="template-delay">Opóźnienie</label><div class="input-group input-group-sm"><input class="form-control" id="template-delay" type="number" min="1" max="1440" placeholder="50"><span class="input-group-text">minut</span></div></div>
                                        <div class="col-sm-8" data-template-for="delay cancellation bus shortened"><label class="form-label small fw-semibold" for="template-origin">Stacja początkowa</label><input class="form-control form-control-sm" id="template-origin" placeholder="Piła Główna"></div>
                                        <div class="col-sm-4" data-template-for="delay cancellation bus shortened"><label class="form-label small fw-semibold" for="template-departure">Odjazd</label><input class="form-control form-control-sm" id="template-departure" type="time"></div>
                                        <div class="col-sm-8" data-template-for="delay cancellation bus shortened"><label class="form-label small fw-semibold" for="template-destination">Planowa stacja końcowa</label><input class="form-control form-control-sm" id="template-destination" placeholder="Krotoszyn"></div>
                                        <div class="col-sm-4" data-template-for="delay cancellation bus shortened"><label class="form-label small fw-semibold" for="template-arrival">Planowy przyjazd</label><input class="form-control form-control-sm" id="template-arrival" type="time"></div>
                                        <div class="col-12" data-template-for="shortened"><label class="form-label small fw-semibold" for="template-new-destination">Nowa stacja końcowa</label><input class="form-control form-control-sm" id="template-new-destination" placeholder="Jarocin"></div>
                                        <div class="col-sm-8" data-template-for="platform"><label class="form-label small fw-semibold" for="template-station">Stacja</label><input class="form-control form-control-sm" id="template-station" placeholder="Poznań Główny"></div>
                                        <div class="col-sm-4" data-template-for="platform"><label class="form-label small fw-semibold" for="template-event-time">Godzina odjazdu</label><input class="form-control form-control-sm" id="template-event-time" type="time"></div>
                                        <div class="col-sm-6" data-template-for="platform"><label class="form-label small fw-semibold" for="template-platform">Nowy peron</label><input class="form-control form-control-sm" id="template-platform" placeholder="3"></div>
                                        <div class="col-sm-6" data-template-for="platform"><label class="form-label small fw-semibold" for="template-track">Nowy tor</label><input class="form-control form-control-sm" id="template-track" placeholder="5"></div>
                                        <div class="col-12"><label class="form-label small fw-semibold" for="template-reason">Przyczyna</label><input class="form-control form-control-sm" id="template-reason" value="z przyczyn technicznych" placeholder="np. z przyczyn technicznych"></div>
                                        <div class="col-12" data-template-for="delay cancellation"><div class="form-check"><input class="form-check-input" id="template-replacement" type="checkbox"><label class="form-check-label small" for="template-replacement">Podstawiono skład lub transport zastępczy</label></div></div>
                                    </div>
                                    <div class="d-flex flex-wrap align-items-center gap-2 mt-3"><button class="btn btn-sm btn-outline-danger" id="generate-train-notice" type="button"><i class="bi bi-magic me-1"></i>Utwórz treść</button><small class="text-secondary" id="template-status" role="status" aria-live="polite">Treść będzie nadal edytowalna.</small></div>
                                </div>
                            </details>
                            <div class="mb-3"><label class="form-label fw-semibold" for="title">Tytuł</label><input class="form-control" id="title" name="title" maxlength="160" value="<?= e($editing['title'] ?? '') ?>" placeholder="Krótko opisz sytuację" required></div>
                            <div class="mb-3"><label class="form-label fw-semibold" for="body">Treść</label><textarea class="form-control" id="body" name="body" rows="4" maxlength="1200" placeholder="Co się wydarzyło i co powinien zrobić pasażer?" required><?= e($editing['body'] ?? '') ?></textarea><div class="form-text">Podaj konkretnie odcinek, możliwe opóźnienie i alternatywę dla pasażera.</div></div>
                            <div class="row g-3 mb-3">
                                <div class="col-md-7"><label class="form-label" for="line">Linia lub odcinek</label><input class="form-control" id="line" name="line" maxlength="120" value="<?= e($editing['line'] ?? 'Cała sieć KW') ?>" required></div>
                                <div class="col-md-5"><label class="form-label" for="severity">Rodzaj</label><select class="form-select" id="severity" name="severity"><option value="info" <?= ($editing['severity'] ?? '') === 'info' ? 'selected' : '' ?>>Informacja</option><option value="warning" <?= ($editing['severity'] ?? '') === 'warning' ? 'selected' : '' ?>>Ostrzeżenie</option><option value="danger" <?= ($editing['severity'] ?? '') === 'danger' ? 'selected' : '' ?>>Poważne utrudnienie</option></select></div>
                            </div>
                            <div class="row g-3 mb-3">
                                <div class="col-md-6"><label class="form-label" for="starts_at">Publikuj od</label><input class="form-control" id="starts_at" name="starts_at" type="datetime-local" value="<?= e($editing['starts_at'] ?? '') ?>"></div>
                                <div class="col-md-6"><label class="form-label" for="ends_at">Publikuj do</label><input class="form-control" id="ends_at" name="ends_at" type="datetime-local" value="<?= e($editing['ends_at'] ?? '') ?>"></div>
                            </div>
                            <div class="form-check form-switch border rounded p-3 ps-5 mb-3"><input class="form-check-input" id="active" name="active" type="checkbox" <?= !$editing || (int) $editing['active'] === 1 ? 'checked' : '' ?>><label class="form-check-label fw-semibold" for="active">Komunikat aktywny</label><small class="d-block text-secondary">Nieaktywny komunikat pozostaje w panelu, ale nie jest widoczny dla pasażerów.</small></div>
                            <div class="d-flex flex-wrap gap-2"><button class="btn btn-danger" type="submit"><i class="bi bi-check-lg me-1"></i><?= $editing ? 'Zapisz zmiany' : 'Opublikuj komunikat' ?></button><?php if ($editing): ?><a class="btn btn-outline-secondary" href="/admin/">Anuluj</a><?php endif; ?></div>
                        </form>
                    </div>
                </div>
            </div>
            <div class="col-lg-7">
                <div class="card">
                    <div class="card-header bg-white d-flex align-items-center justify-content-between gap-2"><div><h2 class="h5 mb-0">Wszystkie komunikaty</h2><small class="text-secondary"><?= e($activeCount) ?> aktywnych · <?= e($hiddenCount) ?> ukrytych</small></div><span class="badge text-bg-light border fs-6"><?= e(count($notices)) ?></span></div>
                    <div class="list-group list-group-flush">
                    <?php foreach ($notices as $notice): ?>
                        <?php
                            $severityLabel = $notice['severity'] === 'danger' ? 'Poważne utrudnienie' : ($notice['severity'] === 'warning' ? 'Ostrzeżenie' : 'Informacja');
                            $severityClass = $notice['severity'] === 'danger' ? 'danger' : ($notice['severity'] === 'warning' ? 'warning' : 'info');
                        ?>
                        <article class="list-group-item admin-notice admin-notice--<?= e($severityClass) ?> p-3">
                            <div class="d-flex flex-column flex-sm-row justify-content-between gap-3">
                                <div class="min-width-0">
                                    <div class="d-flex flex-wrap align-items-center gap-2 mb-2"><span class="badge <?= (int) $notice['active'] === 1 ? 'text-bg-success' : 'text-bg-secondary' ?>"><?= (int) $notice['active'] === 1 ? 'Aktywny' : 'Ukryty' ?></span><span class="badge text-bg-light border"><?= e($severityLabel) ?></span><span class="small text-secondary"><i class="bi bi-signpost-split me-1"></i><?= e($notice['line']) ?></span></div>
                                    <h3 class="h6 mb-1"><?= e($notice['title']) ?></h3>
                                    <p class="small text-secondary mb-2"><?= e($notice['body']) ?></p>
                                    <small class="text-body-tertiary"><i class="bi bi-clock me-1"></i>Aktualizacja <?= e((new DateTimeImmutable((string) $notice['updated_at']))->format('d.m.Y H:i')) ?><?php if ($notice['ends_at']): ?> · do <?= e((new DateTimeImmutable((string) $notice['ends_at']))->format('d.m.Y H:i')) ?><?php endif; ?></small>
                                </div>
                                <div class="d-flex align-items-start gap-2 flex-shrink-0">
                                    <a class="btn btn-sm btn-outline-secondary" href="/admin/?edit=<?= e($notice['id']) ?>"><i class="bi bi-pencil me-1"></i>Edytuj</a>
                                    <button class="btn btn-sm btn-outline-danger delete-notice" type="button" data-notice-id="<?= e($notice['id']) ?>" data-notice-title="<?= e($notice['title']) ?>"><i class="bi bi-trash me-1"></i>Usuń</button>
                                </div>
                            </div>
                        </article>
                    <?php endforeach; ?>
                    <?php if ($notices === []): ?><div class="p-5 text-center text-secondary"><i class="bi bi-megaphone fs-2 d-block mb-2"></i><strong>Brak komunikatów</strong><div class="small">Pierwszy komunikat możesz przygotować w formularzu obok.</div></div><?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <div class="modal fade" id="delete-notice-modal" tabindex="-1" aria-labelledby="delete-notice-title" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header"><div><small class="text-uppercase text-secondary fw-semibold">Potwierdzenie</small><h2 class="modal-title fs-5" id="delete-notice-title">Usunąć komunikat?</h2></div><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Zamknij"></button></div>
                <div class="modal-body"><p class="mb-2">Komunikat <strong id="delete-notice-name"></strong> zostanie trwale usunięty.</p><p class="small text-secondary mb-0">Jeżeli chcesz zachować go w historii, anuluj i wyłącz przełącznik „Komunikat aktywny”.</p></div>
                <div class="modal-footer"><button class="btn btn-outline-secondary" type="button" data-bs-dismiss="modal">Anuluj</button><form method="post" id="delete-notice-form"><input type="hidden" name="csrf" value="<?= e(AdminAuth::csrfToken()) ?>"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" id="delete-notice-id"><button class="btn btn-danger" type="submit"><i class="bi bi-trash me-1"></i>Usuń komunikat</button></form></div>
            </div>
        </div>
    </div>
<?php endif; ?>
</body>
</html>
