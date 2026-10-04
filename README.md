# Infoportal KW 1.0

Nieoficjalny serwis pasażerski Kolei Wielkopolskich: wyszukiwarka połączeń, tablice odjazdów, mapa pociągów na żywo, obserwowane podróże, komunikaty oraz zakładka Bus-Tramwaj-Kolej (taryfa wspólnego biletu KW + POLREGIO + ZTM Poznań). Interfejs w Material Design 3 (Vue 3 + Vuetify 4), backend w PHP z SQLite. Krój: Nunito (OFL), hostowany lokalnie.

## Źródła danych

| Dane | Źródło | Odświeżanie |
|---|---|---|
| Rozkład jazdy | GTFS `polish_trains.zip` z [mkuran.pl](https://mkuran.pl/gtfs/) (PKP PLK), filtr agencji KW | codziennie (CRON) |
| Opóźnienia, odwołania | GTFS-Realtime mkuran.pl | co ok. 2 min |
| Pozycje GPS | wyłączone (`gps_enabled`), bo Mapa BILKOM od dawna nie zwraca pozycji | — |
| Pozycje pociągów | wyliczane z rozkładu i opóźnień PLK wzdłuż kształtu trasy | co minutę |
| Podkład mapy | OpenFreeMap (bez klucza API), kolory MD3 | — |

Zapytania pasażerów nie odpytują zewnętrznych serwisów — czytają `gtfs.sqlite` i plik `live.json` budowany przez CRON.

## Struktura

```text
server/          PHP 8.1+ (bez frameworka)
  src/Gtfs/        import GTFS, rozkład dnia, wyszukiwarka połączeń, estymacja pozycji
  src/Live/        klienci GPS, dekoder GTFS-RT, budowa live.json
  src/Api/         publiczne i administracyjne JSON API
  bin/             import-gtfs, refresh-live, selftest, preflight, import-legacy-notices
  storage/         bazy i pliki generowane (poza gitem)
public/          katalog dokumentów: zbudowany frontend + api/index.php
web/             Vue 3 + Vite + TypeScript + Vuetify 4 (blueprint MD3) + Pinia + MapLibre
docs/            makieta MD3
legacy/          poprzednia wersja 0.x (tylko wgląd)
```

## Praca lokalna

```powershell
php server/bin/import-gtfs.php                                   # rozkład
php server/bin/refresh-live.php                                  # dane na żywo (ręcznie, zamiast CRON-a)
php -S localhost:8080 -t public server/dev-router.php            # API (+ zbudowany frontend)
node web/node_modules/vite/bin/vite.js web                       # frontend z HMR na :5173 (proxy /api)
```

Panel administratora: `/admin`, użytkownik `admin`, hasło ustawione przez `php server/bin/set-admin-password.php` (po zmianie: wdrożenie wysyła hash na serwer). Hasło `kw-demo` działa tylko lokalnie na `php -S` i tylko bez pliku `server/config/admin-password.php`.

## Testy i build

```powershell
php server/bin/selftest.php      # backend
cd web; npm test                 # frontend (vitest)
cd web; npm run build            # typy + build do ../public
pwsh ./release.ps1               # pełna paczka wdrożeniowa
```

Wdrożenie: [DEPLOYMENT.md](DEPLOYMENT.md).

## Licencje danych

Rozkład i opóźnienia: PKP Polskie Linie Kolejowe S.A. (warunki ponownego wykorzystywania ISP), konwersja GTFS: Mikołaj Kuranowski (mkuran.pl, GTFS-RT na CC BY 4.0). Mapa: © OpenStreetMap, OpenFreeMap. Serwis nie jest powiązany z Kolejami Wielkopolskimi.
