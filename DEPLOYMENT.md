# Wdrożenie zanimwyjdziesz.pl

## Wymagania hostingu

- PHP 8.1 lub nowszy z rozszerzeniami `curl`, `pdo_sqlite`, `mbstring`, `json`, `openssl` i `zip`.
- Apache z `mod_rewrite` (zalecane także `mod_headers` i `mod_deflate`).
- Wychodzące połączenia HTTPS do `mkuran.pl`, `mapa.bilkom.pl` i zapasowego źródła GPS (`*.workers.dev`).
- CRON (DirectAdmin → Zadania Cron).
- Node.js **nie** jest potrzebny na serwerze — frontend przychodzi zbudowany w paczce.

## Wdrożenie automatyczne (zalecane)

```bash
bash deploy.sh
```

Wymaga pliku `deploy.env` (wzór: `deploy.env.example`) i klucza `~/.ssh/infoportal_kw_deploy` dodanego w DirectAdmin → Klucze SSH. Skrypt uruchamia testy, buduje paczkę, wysyła ją przez SSH, podmienia kod (zachowując `server/storage` i hasło), przy pierwszej instalacji importuje rozkład i na końcu wykonuje preflight oraz sprawdza `/api/status`.

Hasło administratora ustawia się lokalnie poleceniem `php server/bin/set-admin-password.php` (zapisuje tylko hash; `deploy.sh` wysyła go na serwer).
Kod z aplikacji (2FA) włącza się w panelu: Zabezpieczenia. Sekret i kody zapasowe leżą w `server/storage/admin-security.json` na serwerze (wdrożenie ich nie rusza). Awaryjnie, przez SSH: `php server/bin/admin-2fa.php --disable` (logowanie samym hasłem) albo `--logout-all`.

Stan na serwerze `h89.seohost.pl` (DirectAdmin):

```text
~/domains/infoportal.abuczek.pl/public_html/   ← public/
~/domains/infoportal.abuczek.pl/server/        ← backend (poza WWW)
~/domains/zanimwyjdziesz.pl/public_html       → dowiązanie do public_html powyżej (także private_html, server)
~/kw-deploy/                                   ← ostatnie paczki
```

Adres publiczny to **zanimwyjdziesz.pl** (`KW_PUBLIC_DOMAIN` w `deploy.env`): osobna domena w DirectAdmin, której katalogi `deploy.sh` zamienia na dowiązania do `infoportal.abuczek.pl` (domyślna strona Seohost zostaje jako `public_html_domyslna_*`). Kod i dane (`server/storage`, CRON) zostają w katalogu `infoportal.abuczek.pl`. `public/.htaccess` przekierowuje `www.zanimwyjdziesz.pl` i stary adres `infoportal.abuczek.pl`: API i pliki kodem 301, strony przez `przenosiny.html`, które przenosi ustawienia z pamięci przeglądarki (ulubione stacje, motyw) w części `#` adresu. `sw.js` na starym adresie zostaje, by działały powiadomienia włączone przed przenosinami. Zainstalowaną aplikację (PWA) ze starego adresu trzeba dodać do ekranu początkowego ponownie.

CRON ustawiony w crontab użytkownika (DirectAdmin `direct_crons`), PHP CLI: `/usr/local/bin/php` (8.3).

Hosting ogranicza serie szybkich żądań z narzędzi typu `curl` (HTTP 429) — przy testach z konsoli rób przerwy i podawaj nagłówek `User-Agent` przeglądarki.

## Wdrożenie ręczne

### 1. Przygotowanie paczki (na komputerze)

```powershell
pwsh ./release.ps1
```

Skrypt uruchamia testy, buduje frontend i tworzy `release/infoportal-kw-RRRRMMDD.zip` z katalogami `public/` i `server/`.

### 2. Układ katalogów na serwerze

**Wariant zalecany** — katalog dokumentów subdomeny ustawiony na `public`:

```text
/home/UŻYTKOWNIK/infoportal-kw/
├── public/     ← katalog dokumentów infoportal.abuczek.pl
└── server/     ← poza zasięgiem WWW
```

**Wariant bez zmiany katalogu dokumentów** — zawartość `public/` w `public_html/` subdomeny, a `server/` jako podkatalog `public_html/server/`. API znajdzie go automatycznie, a `.htaccess` blokuje do niego dostęp z sieci.

Wyślij również ukryte pliki `.htaccess` i `.user.ini`. Katalog `server/storage` musi być zapisywalny przez PHP.

### 3. Hasło administratora

Wygeneruj hash:

```text
php -r "echo password_hash('TWOJE-SILNE-HASLO', PASSWORD_DEFAULT), PHP_EOL;"
```

Ustaw go w zmiennej środowiskowej `KW_ADMIN_PASSWORD_HASH` albo skopiuj `server/config/admin-password.php.example` do `server/config/admin-password.php` i wstaw hash. Bez tego logowanie na publicznej domenie jest zablokowane (hasło `kw-demo` działa wyłącznie lokalnie na `php -S`).

### 4. Pierwsze uruchomienie (terminal SSH)

```text
cd /home/UŻYTKOWNIK/infoportal-kw
php server/bin/import-gtfs.php        # pobiera rozkład KW z mkuran.pl (ok. 30 s)
php server/bin/refresh-live.php       # pierwsze dane na żywo
php server/bin/import-legacy-notices.php /ścieżka/do/starego/storage/infoportal.sqlite   # opcjonalnie
php server/bin/preflight.php          # kontrola instalacji
```

Bez SSH: zaloguj się w `/admin` i w zakładce „Stan źródeł” użyj „Importuj teraz”; dane na żywo pojawią się po pierwszym przebiegu CRON-a.

### 5. CRON (DirectAdmin)

| Częstotliwość | Polecenie |
|---|---|
| `* * * * *` | `php /home/UŻYTKOWNIK/infoportal-kw/server/bin/refresh-live.php > /dev/null 2>&1` |
| `30 3 * * *` | `php /home/UŻYTKOWNIK/infoportal-kw/server/bin/import-gtfs.php > /dev/null 2>&1` |
| `15 3 * * *` | `php /home/UŻYTKOWNIK/infoportal-kw/server/bin/backup-db.php > /dev/null 2>&1` |
| `*/5 * * * *` | `php /home/UŻYTKOWNIK/infoportal-kw/server/bin/check-health.php > /dev/null 2>&1` |
| `45 4 * * *` | `php /home/UŻYTKOWNIK/infoportal-kw/server/bin/fetch-vehicles.php > /dev/null 2>&1` |

`deploy.sh` dopisuje trzy ostatnie wpisy sam, jeśli ich brakuje (pozostałe zostawia bez zmian).

**Pojazdy (vagonWEB).** Obecnie wyłączone (`vagonweb_enabled` = false): skrypt kończy się od razu, portal nie pokazuje zestawień ani rysunków. Po włączeniu `fetch-vehicles.php` pobiera z vagonWEB.cz zestawienia pociągów KW z bieżącego roku rozkładu i rysunki pojazdów: lista pociągów, potem strona każdego pociągu z przerwą 3 s (ok. 200 pociągów, kilkanaście minut). Wynik: `server/storage/vehicles.json` i rysunki w `server/storage/vehicles/` (serwowane przez `/api/vehicles/img/…`). Strona pociągu pokazuje ostatnie zestawienie, jeśli nie jest starsze niż 180 dni. Błąd pobrania listy zostawia poprzednie dane. Pierwsze pobranie `deploy.sh` uruchamia w tle, gdy pliku jeszcze nie ma.

**Rodzaj pojazdu (rozkład KW).** Bez osobnego CRON-a: `import-gtfs.php` po imporcie Wielkopolski pobiera warunkowo (If-Modified-Since) GTFS przewoźnika z `kw_gtfs_url` (`http://ws.kolejewlkp.pl:83/gtfs_kw.zip`, aktualizowany w nocy ok. 1:00) i zapisuje `server/storage/kw-vehicles.json`: numer pociągu → rodzaj (EZT, szynobus, parowóz, lokomotywa spalinowa), wózki, rowery, godziny kursu i dni. Błąd pobrania zostawia poprzednie dane i nie przerywa importu (`[UWAGA]` na stderr). `--force` pobiera plik bezwarunkowo.

**Punktualność.** `refresh-live.php` co kwadrans (minuta :07, :22, :37, :52; ręcznie: `--stats`) zapisuje do `server/storage/stats.sqlite` kursy, które dojechały co najmniej 10 min temu i mają dane GTFS-RT PKP PLK: opóźnienie na stacji końcowej, odjazdu, największe po drodze albo odwołanie. Kursy bez danych na żywo (także przy nieaktualnym feedzie) są pomijane. Wpisy starsze niż 400 dni są usuwane. Strona pociągu pokazuje podsumowanie z 30 dni (`GET /api/punctuality?number=…&agency=…`), gdy jest co najmniej 5 kursów. Baza nie jest w codziennej kopii — jej utrata kasuje tylko historię statystyk.

**Regiony.** CRON-y się nie zmieniają: `import-gtfs.php` i `refresh-live.php` przechodzą po kolei przez wszystkie regiony. Wielkopolska trzyma dane jak dotąd w `server/storage/`, Małopolska w `server/storage/malopolska/` (własne `gtfs.sqlite`, `live.json`, `rt.json`, `stats.sqlite`, `app.sqlite` z obserwowanymi podróżami i trasami). Wspólne: `polish_trains.zip` (jedno pobranie; region przebudowuje bazę, gdy archiwum jest nowsze od niej), surowy feed GTFS-RT `rt-feed.pb`/`rt-feed.json` (`Live/RtFeed.php`, jedno pobranie na ok. 2 min), klucze push, sesje panelu, limity zapytań. Region bez zaimportowanego rozkładu `refresh-live.php` pomija — pierwszy import Małopolski wykona `deploy.sh` (ok. 10 s). Panel administratora i komunikaty są tylko w Wielkopolsce (`/api/malopolska/admin/…` → 404). Kopia bazy, alerty e-mail i preflight sprawdzają region domyślny. Małopolska ma GPS pociągów KML z otwartych danych przewoźnika (`realtime.pb` co minutę, rozkład KMŁ do numerów pociągów co 6 h — `KmlGpsClient`, `KmlTripMap`); gdy feed milczy, pozycje są wyliczane z rozkładu, a `/api/malopolska/status` zgłasza brak GPS.

**Kopia bazy.** `backup-db.php` zapisuje spójną kopię `app.sqlite` (komunikaty, ustawienia) do `server/storage/backups/` i trzyma 14 ostatnich; `deploy.sh` pobiera najnowszą do lokalnego katalogu `backups/` (30 ostatnich, poza gitem). Rozkładu nie kopiujemy — odtwarza go import. Odtworzenie: podmienić `server/storage/app.sqlite` wybraną kopią.

**Alerty e-mail.** `check-health.php` ocenia stan jak `/api/status`; gdy problem trwa ponad 15 min, wysyła jeden e-mail (przypomnienie co 12 h, ponownie przy pogorszeniu) i drugi, gdy dane wrócą do normy. Odbiorca: `KW_ALERT_EMAIL` w `deploy.env` (trafia do `server/config/local.php` na serwerze); nadawca: `no-reply@abuczek.pl` (`alert_from` w `Config.php`). Próba: `php server/bin/check-health.php --test`, podgląd bez wysyłki: `--dry-run`.

**Utrudnienia PKP PLK.** Klucz z https://pdp-api.plk-sa.pl/ (darmowy, zatwierdzenie 3–5 dni roboczych) dopisać ręcznie do `server/config/local.php` na serwerze: `'plk_api_key' => '…',` (plik zwraca tablicę; `deploy.sh` go nie nadpisuje). Bez klucza pobieranie jest wyłączone. `refresh-live.php` co 10 min (minuta % 10 = 3) zamienia utrudnienia na szkice komunikatów; od razu: `php server/bin/refresh-live.php --plk --region=wielkopolska`.

`refresh-live.php` pobiera pozycje GPS co minutę, a opóźnienia GTFS-RT najwyżej co ok. 2 min (z warunkowym pobieraniem, gdy plik się nie zmienił). `import-gtfs.php` pobiera rozkład tylko wtedy, gdy mkuran.pl opublikował nową wersję, i podmienia bazę dopiero po pozytywnej walidacji.

## Kontrola po wdrożeniu

- `https://zanimwyjdziesz.pl/api/status` → `"level": "ok"` (lub `degraded` z opisem w `messages`).
- Strona główna, `/mapa`, `/odjazdy`, `/pociag/77642`, `/admin`.
- W panelu admina: zakładka „Stan źródeł”.

## Rozwiązywanie problemów

- **Pusta strona / 404 na podstronach** — brak `.htaccess` w katalogu dokumentów albo wyłączony `mod_rewrite`.
- **„Rozkład jazdy jest niedostępny”** — nie wykonano importu; sprawdź `php server/bin/import-gtfs.php`.
- **„Dane na żywo są nieaktualne”** — CRON z `refresh-live.php` nie działa albo hosting blokuje połączenia wychodzące.
- **„Opóźnienia z systemu PKP PLK są chwilowo niedostępne”** — feed mkuran.pl bywa zatrzymany do kilku godzin; portal pokazuje wtedy rozkład i pozycje GPS.
