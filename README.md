# zanimwyjdziesz.pl

Rozkład, opóźnienia i komunikaty dla pasażerów Kolei Wielkopolskich i Kolei Małopolskich. Strona działa pod
[zanimwyjdziesz.pl](https://zanimwyjdziesz.pl) (Małopolska: [/malopolska](https://zanimwyjdziesz.pl/malopolska)).

To prywatny projekt, nie strona przewoźnika. Dane pochodzą z otwartych źródeł, więc w razie rozbieżności rację ma
informacja na stacji.

## Co jest w środku

- wyszukiwarka połączeń z przesiadkami, w tym pociągi POLREGIO i PKP Intercity jadące przez region,
- tablice odjazdów i przyjazdów na każdej stacji,
- mapa z pociągami (pozycja liczona z rozkładu i opóźnień; w Małopolsce część pociągów ma GPS),
- strona pociągu z trasą, peronami, opóźnieniem i punktualnością z ostatnich tygodni,
- „Moje trasy” i obserwowane podróże z powiadomieniami push o opóźnieniach i odwołaniach,
- komunikaty o utrudnieniach (pisane w panelu albo podsuwane jako szkice z danych PKP PLK),
- kalkulator biletu Bus-Tramwaj-Kolej i schemat połączeń Wielkopolski.

Konta nie ma. Ulubione stacje, trasy i ustawienia zostają w przeglądarce.

## Jak to działa

Backend to PHP 8.1+ bez frameworka i SQLite. CRON raz na dobę importuje rozkład GTFS, a co minutę buduje plik
`live.json` z opóźnieniami. Zapytania pasażerów czytają tylko lokalną bazę i ten plik, więc ruch na stronie nie
obciąża zewnętrznych serwisów.

Frontend to Vue 3, Vuetify 4 (Material Design 3), Pinia i MapLibre, budowany Vite do `public/`.

```text
server/     PHP: import GTFS, wyszukiwarka, dane na żywo, API, push, panel
  bin/        skrypty CLI i CRON (import, odświeżanie, kopie, testy)
  v20/        wersja 2.0 w przygotowaniu (tylko dla admina, /v20)
  storage/    bazy i pliki generowane, poza gitem
web/        Vue (src/views, src/components, src/stores, src/utils)
public/     katalog WWW: zbudowany frontend i public/api/index.php
docs/       makiety i pliki marki
```

Regiony opisuje `Config::REGIONS` w `server/src/Config.php` i `web/src/utils/region.ts`. Każdy region ma swoje
pliki w `server/storage/<region>/`, a skrypty CRON przechodzą po kolei przez wszystkie.

## Źródła danych

| Co | Skąd |
|---|---|
| Rozkład jazdy | GTFS `polish_trains.zip` od [Mikołaja Kuranowskiego](https://mkuran.pl/gtfs/) na danych PKP PLK |
| Opóźnienia i odwołania | GTFS-Realtime z tego samego źródła |
| Rodzaj pojazdu (EZT, szynobus, parowóz) | GTFS Kolei Wielkopolskich (otwarte dane z BIP KW) |
| GPS w Małopolsce | `realtime.pb` Kolei Małopolskich |
| Utrudnienia (szkice komunikatów) | API PKP Polskich Linii Kolejowych |
| Podkład mapy | OpenFreeMap, © OpenStreetMap |

## Uruchomienie u siebie

Potrzebne: PHP 8.1+ (`pdo_sqlite`, `curl`, `openssl`) i Node.js.

```powershell
php server/bin/import-gtfs.php                          # rozkład (kilka minut przy pierwszym razie)
php server/bin/refresh-live.php                         # opóźnienia, ręcznie zamiast CRON-a
php -S localhost:8080 -t public server/dev-router.php   # API
cd web; npm install; npm run dev                        # frontend na :5173, /api idzie na :8080
```

Panel jest pod `/admin`. Lokalnie, bez pliku `server/config/admin-password.php`, wpuszcza użytkownika `admin` z hasłem
`kw-demo`. Własne hasło ustawia `php server/bin/set-admin-password.php` (zapisuje tylko hash).

## Panel i bezpieczeństwo

Do logowania potrzebne jest hasło, a po włączeniu w panelu (Zabezpieczenia) także 6-cyfrowy kod z aplikacji w
telefonie, z ośmioma kodami zapasowymi. Po 5 błędnych próbach z jednego adresu logowanie stoi 15 minut, przy
kolejnych seriach w ciągu doby godzinę, potem dobę. Sesja trzyma się w ciasteczku tylko dla `/api/admin` (HttpOnly,
Secure, SameSite=Strict) i wygasa po 2 h bezczynności. Każda zmiana wymaga tokenu CSRF. Dziennik zapisuje logowania i
zmiany komunikatów.

Bez telefonu i kodów zapasowych kod z aplikacji wyłącza się na serwerze:
`php server/bin/admin-2fa.php --disable`. Ten sam skrypt z `--logout-all` kończy wszystkie sesje.

## Testy

```powershell
php server/bin/selftest.php    # backend
cd web; npm test               # frontend (vitest)
cd web; npx vue-tsc --noEmit   # typy
```

## Wdrożenie

`bash deploy.sh` puszcza testy, buduje paczkę i wysyła ją przez SSH. Szczegóły, CRON i wymagania hostingu są w
[DEPLOYMENT.md](DEPLOYMENT.md).

## Licencje

Rozkład i opóźnienia: PKP Polskie Linie Kolejowe S.A. na warunkach ponownego wykorzystywania informacji sektora
publicznego, konwersja do GTFS: Mikołaj Kuranowski (GTFS-RT na CC BY 4.0). Mapa: © OpenStreetMap, OpenFreeMap.
Krój Figtree i Inter na licencji OFL. Serwis nie jest powiązany z Kolejami Wielkopolskimi ani Kolejami Małopolskimi.
