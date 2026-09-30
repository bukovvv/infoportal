# KW Infoportal

Prototyp pasażerskiego infoportalu Kolei Wielkopolskich zbudowany w PHP 8,
Bootstrap 5, Bootstrap Icons i Leaflet.

## Uruchomienie

```powershell
php -S localhost:8080 -t public
```

Następnie otwórz `http://localhost:8080`. Bootstrap, ikony, Leaflet oraz kod
interfejsu są zapisane jako gotowe pliki w `public/assets`; projekt nie wymaga
Node.js, npm ani procesu budowania.

Mapa i panel „Pociągi w ruchu” korzystają z działającego źródła GPS używanego
przez moduł „Gdzie się podziały te czerwone cudeńka?” w Kierowniku Plus.
Połączenie i normalizacja danych znajdują się w `src/KierownikPlusClient.php`,
a lokalny punkt JSON w `public/api/trains.php`. Tablica odjazdów i wyszukiwarka
połączeń korzystają z rzeczywistego rozkładu GTFS KW, a dostępne opóźnienia są
nakładane z pozycji GPS.

Projekt zawiera zweryfikowany pakiet urzędów certyfikacji curl w
`config/cacert.pem`, używany do bezpiecznego połączenia HTTPS w środowisku PHP
na Windowsie.

## Panel administratora

Panel komunikatów jest dostępny pod `http://localhost:8080/admin/`.

- użytkownik demonstracyjny: `admin`
- hasło demonstracyjne: `kw-demo`

Przed wdrożeniem ustaw zmienną środowiskową `KW_ADMIN_PASSWORD_HASH` na hash
własnego silnego hasła wygenerowany przez `password_hash()` w PHP. Alternatywą
dla hostingu współdzielonego jest plik `config/admin-password.php` opisany w
`DEPLOYMENT.md`. Hasło demonstracyjne działa wyłącznie na lokalnym serwerze PHP.
Komunikaty są zapisywane w lokalnej bazie SQLite w katalogu `storage`.

Instrukcja produkcyjna dla `infoportal.abuczek.pl`, wymagania hostingu oraz test
przedwdrożeniowy znajdują się w `DEPLOYMENT.md`.

## Trasy i stacje

Kliknięcie pociągu na mapie otwiera jego trasę i listę postojów. Podstawowym
źródłem jest lokalny rozkład GTFS z Kierownika Plus, a dla kursów spoza tego
pliku portal korzysta z rezerwowego źródła rozkładowego. Katalog wszystkich
stacji znajduje się pod `http://localhost:8080/stations.php`.

Mapa łączy dwa źródła pozycji. Dla aktywnych kursów wylicza pozycję estymowaną
między kolejnymi postojami według GTFS. Świeża pozycja GPS Kierownika Plus
zawsze zastępuje estymację tego samego numeru pociągu. Gdy GPS chwilowo znika,
pociąg pozostaje na mapie jako oznaczona na niebiesko pozycja estymowana.

Wyszukiwarka połączeń obsługuje kursy bezpośrednie i podróże z jedną przesiadką.
Tablica najbliższych odjazdów pozwala wybrać dowolną stację z bazy, zapamiętuje
wybór na urządzeniu i uzupełnia rozkład o opóźnienie GPS, gdy jest dostępne.
Ważne komunikaty są prezentowane automatycznie w oknie modalnym po ich
opublikowaniu lub aktualizacji przez administratora.
