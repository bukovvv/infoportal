import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

/**
 * Ikony Material Symbols (Rounded) jako ścieżki SVG — do paczki trafiają tylko nazwy z src/plugins/icons.json.
 * Wariant wypełniony: nazwa z sufiksem „-fill”.
 */
function materialSymbols(): Plugin {
  const id = 'virtual:material-symbols'
  const listFile = fileURLToPath(new URL('./src/plugins/icons.json', import.meta.url))
  return {
    name: 'material-symbols',
    resolveId(source) {
      return source === id ? '\0' + id : null
    },
    load(resolved) {
      if (resolved !== '\0' + id) return null
      this.addWatchFile(listFile)
      const names: string[] = JSON.parse(readFileSync(listFile, 'utf8'))
      const paths: Record<string, string> = {}
      for (const name of names) {
        const file = fileURLToPath(new URL(`./node_modules/@material-symbols/svg-400/rounded/${name}.svg`, import.meta.url))
        const svg = readFileSync(file, 'utf8')
        const match = svg.match(/ d="([^"]+)"/)
        if (!match) throw new Error(`Brak ścieżki w ikonie ${name}`)
        paths[name] = match[1]
      }
      return `export default ${JSON.stringify(paths)}`
    },
  }
}

/** Serwer deweloperski: adresy wersji 2.0 (/v2/odjazdy/…) → v2/index.html, jak reguła w public/.htaccess. */
function v2Fallback(): Plugin {
  return {
    name: 'v2-fallback',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = (req.url ?? '').split('?')[0]
        if (/^\/v2(\/|$)/.test(path) && !/\.\w+$/.test(path)) req.url = '/v2/index.html'
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true }), materialSymbols(), v2Fallback()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  worker: { format: 'es' },
  optimizeDeps: {
    include: ['vuetify/components/VOverlay', 'vuetify/components/VDialog', 'vuetify/components/VMenu'],
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://localhost:8080' },
  },
  build: {
    outDir: '../public',
    emptyOutDir: false,
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        v2: fileURLToPath(new URL('./v2/index.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    server: { deps: { inline: ['vuetify'] } },
  },
})
