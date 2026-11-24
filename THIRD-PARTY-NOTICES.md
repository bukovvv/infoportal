# Licencje zewnętrznych komponentów, danych i materiałów

## Zakres licencji MIT

Plik [LICENSE](LICENSE) udostępnia na licencji MIT wyłącznie oryginalny kod
źródłowy i dokumentację oprogramowania stworzone przez właściciela
repozytorium, bukovvv, w zakresie, w jakim przysługują mu do nich prawa.

Licencja MIT z pliku LICENSE **nie obejmuje** materiałów zewnętrznych ani
elementów, do których prawa przysługują innym podmiotom. W szczególności
dotyczy to:

- bibliotek, pakietów, fontów, ikon i pozostałych zależności zewnętrznych;
- plików dostawców umieszczonych w `legacy/public/assets/vendor/`;
- rozkładów jazdy, danych o opóźnieniach, danych mapowych i innych danych
  pozyskiwanych z zewnętrznych źródeł;
- zestawów certyfikatów urzędów certyfikacji w
  `server/config/cacert.pem` i `legacy/config/cacert.pem`;
- logo, ikon marki, elementów identyfikacji wizualnej i materiałów
  promocyjnych projektu znajdujących się w `docs/brand/`;
- nazw, znaków towarowych i oznaczeń podmiotów trzecich.

Wymienione materiały pozostają objęte własnymi licencjami, warunkami
ponownego wykorzystywania lub prawami ich właścicieli. Ich obecność
w repozytorium nie oznacza przeniesienia ich na licencję MIT.

## Wybrane bezpośrednie zależności frontendu

Dokładne wersje zależności i pełny graf pakietów znajdują się w
[`web/package.json`](web/package.json) i
[`web/package-lock.json`](web/package-lock.json). Każdy pakiet, także
zależność przechodnia, pozostaje objęty licencją zadeklarowaną przez jego
właściciela.

| Pakiet | Wersja w projekcie | Licencja |
|---|---:|---|
| Vue | 3.5.43 | MIT |
| Vue Router | 5.3.1 | MIT |
| Pinia | 4.0.3 | MIT |
| Vuetify | 4.2.3 | MIT |
| MapLibre GL JS | 6.11.2 | BSD-3-Clause |
| Figtree (Fontsource) | 5.3.0 | SIL Open Font License 1.1 |
| Material Symbols SVG | 0.47.5 | Apache-2.0 |
| TypeScript | 5.9.3 | Apache-2.0 |

W pakiecie znajdują się również zależności deweloperskie i testowe.
Ich licencje są określone w metadanych poszczególnych pakietów.

## Zewnętrzne pliki vendored w wersji legacy

Katalog `legacy/public/assets/vendor/` zawiera m.in.:

- Bootstrap — MIT;
- Bootstrap Icons — MIT;
- Leaflet — BSD-2-Clause.

Powyższe komponenty nie są objęte licencją MIT tego repozytorium na
podstawie pliku LICENSE. Należy zachować ich własne informacje o autorach
i warunki odpowiednich licencji.

## Dane i źródła zewnętrzne

- Rozkłady jazdy i dane o opóźnieniach: źródła PKP Polskie Linie Kolejowe
  oraz warunki ponownego wykorzystywania informacji sektora publicznego
  właściwe dla danego zbioru.
- Konwersja danych GTFS/GTFS-Realtime udostępniana przez Mikołaja
  Kuranowskiego na mkuran.pl: warunki wskazane przez dostawcę, w tym
  CC BY 4.0 dla wskazanego feedu GTFS-Realtime.
- Dane OpenStreetMap: Open Database License (ODbL), z wymaganym
  przypisaniem autorstwa. Podkład mapowy jest dostarczany przez OpenFreeMap
  na warunkach tego dostawcy.

Zawsze sprawdzaj aktualne warunki źródła przed dalszym wykorzystaniem lub
redystrybucją danych. Opis techniczny i źródła danych są również wskazane
w pliku [README.md](README.md).

## Identyfikacja wizualna

Logo, sygnety, ikony marki, grafiki promocyjne i pozostałe materiały
identyfikacji wizualnej projektu w `docs/brand/` nie są udostępniane na
licencji MIT. Ich wykorzystanie wymaga odrębnej zgody właściciela praw,
chyba że konkretny plik zawiera inną informację licencyjną.
