// Usuwa poprzedni build z public/ (bez ruszania public/api i plików konfiguracyjnych).
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const publicDir = fileURLToPath(new URL('../../public/', import.meta.url))
for (const name of ['assets', 'index.html', 'favicon.svg', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest']) {
  rmSync(publicDir + name, { recursive: true, force: true })
}
