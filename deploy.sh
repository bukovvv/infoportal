#!/usr/bin/env bash
# Wdrożenie na hosting DirectAdmin przez SSH (klucz ~/.ssh/infoportal_kw_deploy).
#   ./deploy.sh            — build, wysyłka, podmiana kodu, import rozkładu, preflight
#   ./deploy.sh --no-build — wysyła ostatnio zbudowaną paczkę
#
# Układ na serwerze (bez zmiany katalogu dokumentów):
#   ~/domains/DOMENA/public_html/   ← zawartość public/
#   ~/domains/DOMENA/server/        ← backend, dane w server/storage (zachowywane między wdrożeniami)
set -euo pipefail
cd "$(dirname "$0")"

[ -f deploy.env ] || { echo "Brak deploy.env (wzór: deploy.env.example)"; exit 1; }
# shellcheck disable=SC1091
source deploy.env
: "${KW_SSH_HOST:?}" "${KW_SSH_USER:?}" "${KW_DOMAIN:?}"
KW_SSH_PORT="${KW_SSH_PORT:-22}"
KEY="${KW_SSH_KEY:-$HOME/.ssh/infoportal_kw_deploy}"
SSH_OPTS=(-i "$KEY" -p "$KW_SSH_PORT" -o StrictHostKeyChecking=accept-new -o BatchMode=yes)
TARGET="$KW_SSH_USER@$KW_SSH_HOST"

if [ "${1:-}" != "--no-build" ]; then
  pwsh -NoProfile -File release.ps1
fi
[ -d release/infoportal-kw ] || { echo "Brak release/infoportal-kw — uruchom bez --no-build"; exit 1; }

TS=$(date +%Y%m%d-%H%M%S)
ARCHIVE="kw-$TS.tar.gz"
tar -czf "release/$ARCHIVE" -C release infoportal-kw
echo "→ Wysyłanie $ARCHIVE ($(du -h "release/$ARCHIVE" | cut -f1))"
ssh "${SSH_OPTS[@]}" "$TARGET" 'mkdir -p ~/kw-deploy'
scp -i "$KEY" -P "$KW_SSH_PORT" -o StrictHostKeyChecking=accept-new -o BatchMode=yes -q "release/$ARCHIVE" "$TARGET:kw-deploy/"
if [ -f server/config/admin-password.php ]; then
  echo "→ Wysyłanie hasha hasła administratora"
  ssh "${SSH_OPTS[@]}" "$TARGET" "mkdir -p ~/domains/$KW_DOMAIN/server/config"
  scp -i "$KEY" -P "$KW_SSH_PORT" -o BatchMode=yes -q server/config/admin-password.php "$TARGET:domains/$KW_DOMAIN/server/config/admin-password.php"
fi

echo "→ Instalacja na serwerze"
ssh "${SSH_OPTS[@]}" "$TARGET" "KW_DOMAIN='$KW_DOMAIN' ARCHIVE='$ARCHIVE' KW_PHP='${KW_PHP:-}' KW_ALERT_EMAIL='${KW_ALERT_EMAIL:-}' bash -s" <<'REMOTE'
set -euo pipefail
D="$HOME/domains/$KW_DOMAIN"
cd ~/kw-deploy
rm -rf infoportal-kw && tar -xzf "$ARCHIVE"

# PHP CLI ≥ 8.1 (DirectAdmin bywa z kilkoma wersjami)
PHP="${KW_PHP:-}"
if [ -z "$PHP" ]; then
  for c in php /usr/local/php84/bin/php /usr/local/php83/bin/php /usr/local/php82/bin/php /usr/local/php81/bin/php; do
    if command -v "$c" >/dev/null 2>&1 && "$c" -r 'exit(version_compare(PHP_VERSION, "8.1", ">=") ? 0 : 1);' 2>/dev/null; then PHP="$c"; break; fi
  done
fi
[ -n "$PHP" ] || { echo "Nie znaleziono PHP 8.1+ w CLI"; exit 1; }
echo "   PHP: $PHP ($($PHP -r 'echo PHP_VERSION;'))"

# pierwsza instalacja: kopia poprzedniej wersji
if [ ! -f "$D/server/bootstrap.php" ] && [ -d "$D/public_html" ] && [ -n "$(ls -A "$D/public_html")" ]; then
  BACKUP="public_html_backup_$(date +%Y%m%d-%H%M)"; echo "   Kopia poprzedniej zawartości → $BACKUP"
  cp -a "$D/public_html" "$D/$BACKUP"
fi

# backend: kod podmieniany w całości, storage/ i sekrety w config/ zostają
mkdir -p "$D/server/storage" "$D/server/config"
rm -rf "$D/server/src" "$D/server/bin"
(cd infoportal-kw/server && tar -cf - --exclude=./storage --exclude=./config/admin-password.php --exclude=./config/local.php .) | (cd "$D/server" && tar -xf -)
chmod 700 "$D/server/storage"
# adres alertów (KW_ALERT_EMAIL z deploy.env) → server/config/local.php, tylko gdy pliku jeszcze nie ma
if [ -n "$KW_ALERT_EMAIL" ]; then
  if [ ! -f "$D/server/config/local.php" ]; then
    printf "<?php

return ['alert_email' => '%s'];
" "$KW_ALERT_EMAIL" > "$D/server/config/local.php" && chmod 600 "$D/server/config/local.php"
    echo "   Alerty e-mail: $KW_ALERT_EMAIL"
  elif ! grep -q "alert_email" "$D/server/config/local.php"; then
    echo "   Alerty e-mail: dopisz 'alert_email' do server/config/local.php na serwerze"
  fi
fi
[ -f "$D/server/config/admin-password.php" ] && chmod 600 "$D/server/config/admin-password.php"

# frontend: public_html czyszczony (bez .well-known i cgi-bin) i zastępowany
mkdir -p "$D/public_html"
find "$D/public_html" -mindepth 1 -maxdepth 1 ! -name '.well-known' ! -name 'cgi-bin' -exec rm -rf {} +
cp -a infoportal-kw/public/. "$D/public_html/"

cd "$D"
if [ ! -f server/storage/gtfs.sqlite ]; then
  echo "   Import rozkładu…"
  "$PHP" server/bin/import-gtfs.php
fi
if [ -f public_html_v01/storage/infoportal.sqlite ] && [ ! -f server/storage/.legacy-imported ]; then
  "$PHP" server/bin/import-legacy-notices.php public_html_v01/storage/infoportal.sqlite && touch server/storage/.legacy-imported
fi
"$PHP" server/bin/refresh-live.php || true
# pojazdy z vagonWEB: pierwsze pobranie w tle (ok. 15 min), dalej CRON raz na dobę
if [ ! -f server/storage/vehicles.json ]; then
  nohup "$PHP" server/bin/fetch-vehicles.php >server/storage/fetch-vehicles.log 2>&1 &
  echo "   Pojazdy: pierwsze pobranie z vagonWEB uruchomione w tle"
fi
echo "$PHP" > server/storage/.php-cli

# CRON: brakujące wpisy (kopia bazy, alerty) dopisywane raz; istniejące zostają nietknięte.
# crontab ładowany z pliku — `crontab -` z potoku potrafi zapisać pusty crontab.
crontab -l > ~/kw-deploy/crontab.current 2>/dev/null || true
if grep -q 'refresh-live.php' ~/kw-deploy/crontab.current; then
  cp ~/kw-deploy/crontab.current ~/kw-deploy/crontab.new
  PHP_ABS=$(command -v "$PHP")
  cron_add() {
    grep -q "$2" ~/kw-deploy/crontab.new && return 0
    echo "$1 $PHP_ABS $D/server/bin/$2 >/dev/null 2>>$D/server/storage/cron-errors.log # kw-infoportal" >> ~/kw-deploy/crontab.new
    echo "   CRON: dodano $2 ($1)"
  }
  cron_add '15 3 * * *' backup-db.php
  cron_add '*/5 * * * *' check-health.php
  cron_add '45 4 * * *' fetch-vehicles.php
  cmp -s ~/kw-deploy/crontab.current ~/kw-deploy/crontab.new || crontab ~/kw-deploy/crontab.new
else
  echo "   CRON: brak wpisów Infoportalu — nowych zadań nie dopisano, dodaj ręcznie (DEPLOYMENT.md)"
fi
"$PHP" server/bin/backup-db.php || true
echo
"$PHP" server/bin/preflight.php || true

# sprzątanie starych paczek (zostają 3 ostatnie)
ls -1t ~/kw-deploy/kw-*.tar.gz 2>/dev/null | tail -n +4 | xargs -r rm -f
REMOTE

# kopia bazy także na tym komputerze (na wypadek utraty serwera); zostaje 30 ostatnich
mkdir -p backups
LATEST=$(ssh "${SSH_OPTS[@]}" "$TARGET" "ls -1t ~/domains/$KW_DOMAIN/server/storage/backups/app-*.sqlite 2>/dev/null | head -1")
if [ -n "$LATEST" ]; then
  scp -i "$KEY" -P "$KW_SSH_PORT" -o BatchMode=yes -q "$TARGET:$LATEST" "backups/$(basename "$LATEST")" && echo "→ Kopia bazy pobrana: backups/$(basename "$LATEST")"
  ls -1t backups/app-*.sqlite 2>/dev/null | tail -n +31 | xargs -r rm -f
fi

echo
echo "→ Kontrola: https://$KW_DOMAIN/api/status"
curl -s "https://$KW_DOMAIN/api/status" | head -c 400; echo
