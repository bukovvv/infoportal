# Buduje paczkę wdrożeniową: release/infoportal-kw-RRRRMMDD.zip
#   pwsh ./release.ps1
# Zawartość: public/ (zbudowany frontend + API) i server/ (bez danych z storage i haseł).

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Set-Location $root

Write-Host '1/4 Testy backendu' -ForegroundColor Cyan
# nieudane testy i wynik (bez listy [OK])
php server/bin/selftest.php | Where-Object { $_ -notlike '`[OK`]*' }
if ($LASTEXITCODE -ne 0) { throw 'Testy backendu nie przeszły.' }

Write-Host '2/4 Testy i build frontendu' -ForegroundColor Cyan
Push-Location web
node node_modules/vitest/vitest.mjs run --reporter=dot
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'Testy frontendu nie przeszły.' }
node node_modules/vue-tsc/bin/vue-tsc.js --noEmit
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'Błędy typów.' }
node scripts/clean-public.mjs
node node_modules/vite/bin/vite.js build --logLevel warn
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'Build frontendu nie powiódł się.' }
Pop-Location

Write-Host '3/4 Składanie paczki' -ForegroundColor Cyan
$out = Join-Path $root 'release/infoportal-kw'
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Force $out | Out-Null
Copy-Item public -Destination $out -Recurse -Force
Copy-Item server -Destination $out -Recurse -Force
# bez danych lokalnych i sekretów — storage zostaje pusty (z .gitkeep)
Get-ChildItem (Join-Path $out 'server/storage') -Force | Where-Object { $_.Name -ne '.gitkeep' } | Remove-Item -Recurse -Force
foreach ($secret in 'server/config/local.php', 'server/config/admin-password.php') {
    $p = Join-Path $out $secret
    if (Test-Path $p) { Remove-Item $p -Force }
}
Copy-Item DEPLOYMENT.md -Destination $out

Write-Host '4/4 Archiwum ZIP' -ForegroundColor Cyan
$zip = Join-Path $root ("release/infoportal-kw-{0}.zip" -f (Get-Date -Format 'yyyyMMdd'))
if (Test-Path $zip) { Remove-Item $zip -Force }
# systemowy bsdtar pakuje też pliki ukryte (.htaccess, .user.ini), w przeciwieństwie do Compress-Archive
& "$env:SystemRoot\System32\tar.exe" -a -c -f $zip -C (Join-Path $root 'release') infoportal-kw
Write-Host ("Gotowe: {0} ({1:N1} MB)" -f $zip, ((Get-Item $zip).Length / 1MB)) -ForegroundColor Green
