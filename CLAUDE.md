# Infoportal KW — kontekst dla Claude

Nieoficjalny serwis pasażerski Kolei Wielkopolskich. **Działa produkcyjnie: https://infoportal.abuczek.pl** (od 2026-10-02).
Stack: Vue 3 + Vuetify 4 (blueprint MD3) + Pinia + MapLibre (`web/`), PHP 8.1+ bez frameworka + SQLite (`server/`).
Szczegóły: README.md (struktura, komendy), DEPLOYMENT.md (serwer, CRON).

## Decyzje użytkownika (nie zmieniać bez pytania)
- Rozkład: GTFS `polish_trains.zip` z mkuran.pl, filtr agencji KW, import CRON-em codziennie 03:30.
- Opóźnienia: GTFS-RT mkuran.pl (`updates.pb`), pobierane przez PHP CRON co minutę (warunkowo, min. co ~2 min). Bez workera Cloudflare (plan darmowy).
- **GPS wyłączony** (`gps_enabled` = false w `server/src/Config.php`): Mapa BILKOM od dawna nie zwraca pozycji, innych map nie używamy. Pozycje pociągów tylko estymowane z rozkładu + opóźnień PLK wzdłuż kształtu trasy. Kod GPS zostaje (`BilkomMapClient`, `BackupGpsClient`).
- W portalu i dokumentacji **nie używać nazwy „Kierownik Plus”** (zapasowy GPS = „GPS zapasowy”).
- Material Design 3 w całości; krój **Figtree** (`@fontsource-variable/figtree`, nagłówki 700; wcześniej Nunito, Varela Round odrzucona przez użytkownika); zaokrąglenia z jednej skali: przyciski, chipy, przełączniki = pigułki (domyślne w `web/src/plugins/vuetify.ts`), karty/alerty 24 px, kafelki 16 px (zmienne `--kw-r-*` w `app.css`) — nie nadpisywać `rounded` w widokach; ikony Material Symbols jako SVG — nowe nazwy dopisywać do `web/src/plugins/icons.json`.
- Zakładka **Bus-Tramwaj-Kolej** (`/bus-tramwaj-kolej`, `web/src/views/BtkView.vue`) = prosta informacja o taryfie wspólnego biletu BTK (kalkulator ceny, cennik, strefy, zasady). Podpowiedź `BtkHint` na tablicy odjazdów (stacje B–G) i pod wynikami wyszukiwania (wszystkie stacje w BTK) linkuje do `/bus-tramwaj-kolej?stacja=…`. Nazwy z rozkładu dopasowuje `btkStation()` (skróty Wlkp./koło + `ALIASES`). Dane w `web/src/utils/btkTariff.ts` — przy zmianie cen podmienić `FARES` i `TARIFF_DATE` (źródła: strona oferty KW, strona i warunki taryfowe POLREGIO).
- **Schemat połączeń** (`/schemat`, `web/src/views/SchemeView.vue`, przełącznik Mapa/Schemat nad mapą, w nawigacji pod „Mapa”) = interaktywna wersja mapy linii przewoźnika, z poprawkami użytkownika: do Łęki Opatowskiej (nie Kępna), bez Milicza i Wyrzyska Osieka, z liniami Krzyż – Piła i Leszno – Głogów oraz Powodowem (za Wolsztynem). Tło = granica województwa (`REGION`): prawdziwa granica (PRG, repo ppatrzyk/polska-geojson) przekształcona funkcją sklejaną tak, że rzeczywiste położenie każdej stacji z GTFS trafia w jej miejsce na schemacie — wszystkie stacje są po właściwej stronie granicy. Obrys z grafiki przewoźnika odrzucony (był poglądowy). Po zmianie układu schematu przeliczyć obrys. Dane statyczne w `web/src/utils/scheme.ts` (węzły ze współrzędnymi, przebiegi, pełne listy stacji z GTFS, PKM1–5) — przy zmianie sieci poprawić ręcznie.
- **Pojazd na stronie pociągu** („Możesz spodziewać się pojazdu”, `VehicleCard.vue`): zestawienia i rysunki z vagonWEB.cz — **użytkownik ma zgodę** (autor rysunków to jego znajomy). `server/bin/fetch-vehicles.php` (CRON 04:45, przerwy 3 s między zapytaniami) → `storage/vehicles.json` + rysunki w `storage/vehicles/` (`/api/vehicles/img/…`). Skład pokazuje się dopiero z nagłówkiem Referer na własny adres strony pociągu (tak działa „pokaż”). Pokazujemy ostatnie zestawienie ≤ 180 dni, **tylko** nagłówek „Możesz spodziewać się pojazdu: …” i rysunek (bez daty, wyposażenia, miejsc — użytkownik odrzucił jako nadmiar); źródło w stopce strony pociągu. Potoczne nazwy serii: `NAMES` w `VehicleRepository.php`.
- Strony „O serwisie” nie ma — dodana i usunięta na życzenie użytkownika (2026-10-02); nie proponować ponownie.
- Komunikacja z użytkownikiem po polsku.

## Komendy
- Kopia bazy: `php server/bin/backup-db.php` (CRON 03:15, 14 kopii w `server/storage/backups`, `deploy.sh` pobiera najnowszą do `backups/`) · alerty: `php server/bin/check-health.php --dry-run|--test` (CRON co 5 min, adres `KW_ALERT_EMAIL` w `deploy.env`)
- Backend testy: `php server/bin/selftest.php` · import: `php server/bin/import-gtfs.php` · dane na żywo: `php server/bin/refresh-live.php` · kontrola: `php server/bin/preflight.php`
- Frontend: `cd web && npm test` · typy: `npx vue-tsc --noEmit` · dev: `node web/node_modules/vite/bin/vite.js web` (port 5173, proxy /api → 8080; `npm` przez preview nie działa przez spację w „Program Files”)
- API lokalnie: `php -S localhost:8080 -t public server/dev-router.php` · admin: `admin` + hasło użytkownika (hash w `server/config/admin-password.php` obowiązuje też lokalnie; `kw-demo` tylko na php -S bez tego pliku)
- **Wdrożenie: `bash deploy.sh`**: uruchamia użytkownik, w jego PowerShellu `bash` nie jest w PATH, więc podawać `& "C:\Program Files\Git\bin\bash.exe" deploy.sh` (testy → build → SSH → podmiana kodu z zachowaniem `server/storage` i hasła → preflight → /api/status). Dane serwera w `deploy.env` (gitignore), klucz `~/.ssh/infoportal_kw_deploy`.
- Git: `C:\Program Files\Git\cmd` może nie być w PATH. Remote: prywatne repo GitHub `bukovvv/infoportal` (`origin`, gałąź `main`) — po commicie `git push`. Commity kończyć linią Co-Authored-By zgodnie z instrukcjami sesji.

## Serwer (DirectAdmin, Seohost, LiteSpeed)
- `~/domains/infoportal.abuczek.pl/public_html` = frontend (`public/`), `~/domains/infoportal.abuczek.pl/server` = backend poza WWW.
- PHP CLI `/usr/local/bin/php` (8.3). CRON w crontabie użytkownika — ładować z pliku (`crontab plik`), bo `crontab -` z potoku zapisuje pusty crontab.
- Hosting zwraca HTTP 429 dla serii szybkich żądań z curl — testować z User-Agent przeglądarki i przerwami.

## Pułapki
- Feed GTFS-RT mkuran potrafi stać godzinami → status „degraded”, portal pokazuje rozkład (to poprawne zachowanie).
- Lokalny PHP nie ma rozszerzenia zip → importer używa `System32\tar.exe`.
- Data i godzina: komponenty `DateField`/`TimeField` (VDatePicker/VTimePicker MD3 w oknie, 24 h, tydzień od poniedziałku) — nie natywne `type="date"`/`"time"`. Komponent z `v-dialog` jako korzeniem: `inheritAttrs: false` i `$attrs` na pole, inaczej klasy rodzica trafiają na okno.
- Vuetify 4: `variant="tonal"` z kolorem kontenera daje nieczytelny tekst — tonal MD3 = `variant="flat" color="secondary-container"`. Kolejność warstw CSS zadeklarowana na początku `web/src/styles/app.css`.
- `server/config/admin-password.php` zawiera tylko hash (ustawia go użytkownik: `php server/bin/set-admin-password.php`); nigdy nie prosić o hasło.

## Możliwe następne kroki (zaproponowane, niezaczęte)
Zewnętrzny monitor (UptimeRobot) na wypadek awarii całego serwera; PWA (service worker, offline) i powiadomienia o opóźnieniu obserwowanej podróży; udostępnianie (`navigator.share`), „dodaj do kalendarza” (.ics); statystyki punktualności z zapisywanych opóźnień. Wyszukiwarka ma już: 2 przesiadki, połączenia po północy, „przyjazd do”; przesiadki piesze odrzucone (jedyna sensowna para to Poznań Dębiec ↔ Dębina, 800 m). Zapasowe źródło opóźnień PLK.
