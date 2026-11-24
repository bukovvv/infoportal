# zanimwyjdziesz.pl

Nieoficjalny serwis informacji pasażerskiej dla osób podróżujących koleją w Wielkopolsce. Rozkład jazdy, wyszukiwarka połączeń, odjazdy, opóźnienia i komunikaty w jednym miejscu.

**Strona:** https://zanimwyjdziesz.pl

## Co znajdziesz w serwisie?

- **Wyszukiwarka połączeń** — pociągi Kolei Wielkopolskich, POLREGIO i PKP Intercity na stacjach w Wielkopolsce. Można wybrać dzień i godzinę odjazdu albo przyjazdu, przewoźników oraz liczbę przesiadek (do dwóch).
- **Odjazdy i przyjazdy** — tablice dla poszczególnych stacji, z peronami, opóźnieniami i informacjami o odwołanych pociągach.
- **Strona pociągu** — trasa, rozkładowe postoje, bieżące opóźnienie i dostępne statystyki punktualności.
- **Mapa pociągów** — mapa połączeń Kolei Wielkopolskich. Pozycje są szacowane na podstawie rozkładu jazdy i opóźnień, a nie pobierane z urządzeń GPS w pociągach.
- **Schemat połączeń** — interaktywny schemat linii i stacji Kolei Wielkopolskich.
- **Komunikaty** — informacje o utrudnieniach przypisane do konkretnych pociągów, stacji i linii. Pojawiają się również przy wynikach wyszukiwania i na tablicach.
- **Moje podróże** — obserwowanie wybranego połączenia, odliczanie do odjazdu, opóźnienia i komunikaty. Można też włączyć powiadomienia.
- **Moje trasy** — zapisane relacje, które można szybko sprawdzić ponownie. Dla trasy można ustawić powiadomienia o kursach.
- **Ulubione stacje** — szybki dostęp do najbliższych odjazdów z wybranych stacji.
- **Bus-Tramwaj-Kolej** — informacje o wspólnym bilecie w aglomeracji poznańskiej: cennik, strefy, zasady i kalkulator ceny.

Serwis nie wymaga zakładania konta i nie wyświetla reklam. Można go również dodać do ekranu głównego telefonu.

## Dane

Rozkład i dane bieżące są pobierane przez serwer i przetwarzane cyklicznie. Wyszukiwarka i tablice korzystają z lokalnej bazy danych oraz plików przygotowanych przez zadania CRON — każde wyszukiwanie nie odpytuje osobno zewnętrznych serwisów.

| Dane | Źródło | Aktualizacja |
|---|---|---|
| Rozkład jazdy | GTFS z [mkuran.pl](https://mkuran.pl/gtfs/), na podstawie danych PKP PLK; w serwisie filtrowany i uzupełniany o obsługiwanych przewoźników | codziennie |
| Opóźnienia i odwołania | GTFS-Realtime PKP PLK udostępniany przez [mkuran.pl](https://mkuran.pl/gtfs/) | co ok. 2 minuty |
| Pozycje na mapie | Wyliczane na podstawie rozkładu i opóźnień | co minutę |
| Podkład mapy | [OpenFreeMap](https://openfreemap.org/) i dane [OpenStreetMap](https://www.openstreetmap.org/copyright) | — |

**Ważne:** mapa nie pokazuje rzeczywistego sygnału GPS z pociągu. Pozycja jest estymacją i może różnić się od faktycznego położenia składu. Podobnie dane o opóźnieniach zależą od dostępności źródła PKP PLK. Gdy feed jest niedostępny, serwis może pokazywać sam rozkład jazdy.

Więcej informacji o źródłach i prywatności znajduje się także na stronie [O nas](https://zanimwyjdziesz.pl/o-nas).

## Technologie

- **Frontend:** Vue 3, TypeScript, Vuetify 4 (Material Design 3), Pinia, Vite.
- **Mapa:** MapLibre GL.
- **Backend:** PHP 8.1+ bez frameworka.
- **Bazy danych:** SQLite.
- **Font:** Figtree.

## Struktura projektu

```text
server/
  src/
    Api/          publiczne i administracyjne API
    Auth/         logowanie do panelu administratora
    Gtfs/         import GTFS, rozkład i wyszukiwarka połączeń
    Live/         opóźnienia i dane na żywo
    Notices/      komunikaty
    Push/         powiadomienia
    Stats/        statystyki punktualności
  bin/            import, odświeżanie danych, kopie i testy
  storage/        bazy danych i pliki generowane przez serwer

web/              frontend Vue 3 + TypeScript
public/           zbudowany frontend i punkt wejścia API
docs/             dokumentacja i materiały projektu
legacy/           poprzednia wersja 0.x (do wglądu)
```

## Praca lokalna

Wymagany jest PHP 8.1+ z rozszerzeniami `curl`, `pdo_sqlite`, `mbstring`, `json`, `openssl` i `zip`. Do pracy nad frontendem potrzebny jest Node.js i npm.

Najpierw, z katalogu głównego repozytorium, zaimportuj rozkład i uruchom lokalne API:

```bash
php server/bin/import-gtfs.php
php server/bin/refresh-live.php
php -S localhost:8080 -t public server/dev-router.php
```

W drugim terminalu uruchom frontend:

```bash
cd web
npm ci
npm run dev
```

Frontend będzie dostępny pod adresem http://localhost:5173. Vite przekazuje zapytania `/api` do lokalnego serwera PHP działającego na porcie 8080.

## Testy i build

Z katalogu głównego:

```bash
php server/bin/selftest.php
```

Testy i komendy frontendu uruchamiaj w katalogu `web`:

```bash
npm test
npm run typecheck
npm run build
```

Build frontendu trafia do katalogu `public/`.

Szczegóły konfiguracji serwera, CRON-a i wdrożenia: [DEPLOYMENT.md](DEPLOYMENT.md).

## Licencja

Oryginalny kod źródłowy i dokumentacja projektu są udostępnione na licencji MIT, w zakresie praw przysługujących właścicielowi repozytorium. Licencja nie obejmuje bibliotek, pakietów, fontów, ikon, danych, materiałów marki ani znaków towarowych należących do innych podmiotów.

Przed dalszym wykorzystaniem lub redystrybucją sprawdź [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). Dane rozkładowe i dane o opóźnieniach podlegają warunkom ich dostawców, a dane OpenStreetMap — licencji ODbL.

zanimwyjdziesz.pl jest niezależnym serwisem i nie jest oficjalną stroną Kolei Wielkopolskich, POLREGIO, PKP Intercity ani PKP Polskich Linii Kolejowych.
