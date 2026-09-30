# Wdrożenie `infoportal.abuczek.pl`

## Wymagania hostingu

- PHP 8.1 lub nowszy,
- rozszerzenia `curl`, `pdo_sqlite`, `mbstring`, `json` i `openssl`,
- możliwość wykonywania wychodzących połączeń HTTPS,
- domena z certyfikatem HTTPS,
- możliwość ustawienia katalogu dokumentów domeny na folder `public`.

## Układ katalogów

Cały projekt umieść poza zwykłym `public_html`, a katalog dokumentów subdomeny
ustaw na:

```text
/ścieżka/do/infoportal/public
```

Foldery `src`, `config` oraz `storage` muszą pozostać poziom wyżej i nie mogą być
bezpośrednio dostępne przez WWW. PHP musi mieć prawo zapisu do `storage`.

## Hasło administratora

Najlepiej ustaw zmienną środowiskową `KW_ADMIN_PASSWORD_HASH`. Na hostingu bez
obsługi zmiennych skopiuj `config/admin-password.php.example` do
`config/admin-password.php` i wstaw hash wygenerowany przez:

```text
php -r "echo password_hash('TWOJE-SILNE-HASLO', PASSWORD_DEFAULT), PHP_EOL;"
```

Bez własnego hasła logowanie administratora na publicznej domenie jest celowo
zablokowane. Hasło `kw-demo` działa wyłącznie na lokalnym serwerze PHP.

## Przed uruchomieniem

1. Wyślij cały projekt z gotowym katalogiem `public/assets` — niczego nie trzeba budować.
2. Wyślij również ukryte pliki `public/.htaccess` i `public/.user.ini`.
3. Uruchom `php scripts/preflight.php`, jeśli hosting udostępnia terminal.
4. Ustaw rekord DNS subdomeny i włącz certyfikat HTTPS.
5. Sprawdź stronę główną, `/admin/` i odpowiedź `/api/trains.php`.

Lokalny rozkład GTFS trzeba podmieniać przed datą `validUntil` zapisaną w
`public/data/kw_gtfs_routes.json`. Po jej przekroczeniu wyszukiwarka, odjazdy i
pozycje estymowane nie będą miały aktualnych kursów.
