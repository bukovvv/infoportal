# Wdrożenie Infoportalu KW (`infoportal.abuczek.pl`)

## Wymagania hostingu

- PHP 8.1 lub nowszy z rozszerzeniami `curl`, `pdo_sqlite`, `mbstring`, `json`, `openssl` i `zip`.
- Apache z `mod_rewrite` (zalecane także `mod_headers` i `mod_deflate`).
- Wychodzące połączenia HTTPS do `mkuran.pl`, `mapa.bilkom.pl` i `kierownik-plus-v2.jak-ste139.workers.dev`.
- CRON (DirectAdmin → Zadania Cron).
- Node.js **nie** jest potrzebny na serwerze — frontend przychodzi zbudowany w paczce.

## 1. Przygotowanie paczki (na komputerze)

```powershell
pwsh ./release.ps1
```

Skrypt uruchamia testy, buduje frontend i tworzy `release/infoportal-kw-RRRRMMDD.zip` z katalogami `public/` i `server/`.

## 2. Układ katalogów na serwerze

**Wariant zalecany** — katalog dokumentów subdomeny ustawiony na `public`:

```text
/home/UŻYTKOWNIK/infoportal-kw/
├── public/     ← katalog dokumentów infoportal.abuczek.pl
└── server/     ← poza zasięgiem WWW
```

**Wariant bez zmiany katalogu dokumentów** — zawartość `public/` w `public_html/` subdomeny, a `server/` jako podkatalog `public_html/server/`. API znajdzie go automatycznie, a `.htaccess` blokuje do niego dostęp z sieci.

Wyślij również ukryte pliki `.htaccess` i `.user.ini`. Katalog `server/storage` musi być zapisywalny przez PHP.

## 3. Hasło administratora

Wygeneruj hash:

```text
php -r "echo password_hash('TWOJE-SILNE-HASLO', PASSWORD_DEFAULT), PHP_EOL;"
```

Ustaw go w zmiennej środowiskowej `KW_ADMIN_PASSWORD_HASH` albo skopiuj `server/config/admin-password.php.example` do `server/config/admin-password.php` i wstaw hash. Bez tego logowanie na publicznej domenie jest zablokowane (hasło `kw-demo` działa wyłącznie lokalnie na `php -S`).

## 4. Pierwsze uruchomienie (terminal SSH)

```text
cd /home/UŻYTKOWNIK/infoportal-kw
php server/bin/import-gtfs.php        # pobiera rozkład KW z mkuran.pl (ok. 30 s)
php server/bin/refresh-live.php       # pierwsze dane na żywo
php server/bin/import-legacy-notices.php /ścieżka/do/starego/storage/infoportal.sqlite   # opcjonalnie
php server/bin/preflight.php          # kontrola instalacji
```

Bez SSH: zaloguj się w `/admin` i w zakładce „Stan źródeł” użyj „Importuj teraz”; dane na żywo pojawią się po pierwszym przebiegu CRON-a.

## 5. CRON (DirectAdmin)

| Częstotliwość | Polecenie |
|---|---|
| `* * * * *` | `php /home/UŻYTKOWNIK/infoportal-kw/server/bin/refresh-live.php > /dev/null 2>&1` |
| `30 3 * * *` | `php /home/UŻYTKOWNIK/infoportal-kw/server/bin/import-gtfs.php > /dev/null 2>&1` |

`refresh-live.php` pobiera pozycje GPS co minutę, a opóźnienia GTFS-RT najwyżej co ok. 2 min (z warunkowym pobieraniem, gdy plik się nie zmienił). `import-gtfs.php` pobiera rozkład tylko wtedy, gdy mkuran.pl opublikował nową wersję, i podmienia bazę dopiero po pozytywnej walidacji.

## 6. Kontrola po wdrożeniu

- `https://infoportal.abuczek.pl/api/status` → `"level": "ok"` (lub `degraded` z opisem w `messages`).
- Strona główna, `/mapa`, `/odjazdy`, `/pociag/77642`, `/admin`.
- W panelu admina: zakładka „Stan źródeł”.

## Rozwiązywanie problemów

- **Pusta strona / 404 na podstronach** — brak `.htaccess` w katalogu dokumentów albo wyłączony `mod_rewrite`.
- **„Rozkład jazdy jest niedostępny”** — nie wykonano importu; sprawdź `php server/bin/import-gtfs.php`.
- **„Dane na żywo są nieaktualne”** — CRON z `refresh-live.php` nie działa albo hosting blokuje połączenia wychodzące.
- **„Opóźnienia z systemu PKP PLK są chwilowo niedostępne”** — feed mkuran.pl bywa zatrzymany do kilku godzin; portal pokazuje wtedy rozkład i pozycje GPS.
