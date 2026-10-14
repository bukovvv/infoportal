<script setup lang="ts">
// Zaproszenie do dodania serwisu na ekran główny telefonu (PWA).
// Android (Chrome, Edge, Samsung): systemowe okno instalacji po „Dodaj”. iPhone (Safari): krótka instrukcja, bo Safari nie ma takiego okna.
// Pokazujemy tylko na telefonie, poza zainstalowaną aplikacją, po chwili korzystania; „Nie teraz” ukrywa na 30 dni.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { read, useUi, write } from '@/stores/ui'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const KEY = 'kw_install_dismissed'
const QUIET_DAYS = 30
const DELAY_MS = 12_000

const ui = useUi()
const route = useRoute()
const mode = ref<'native' | 'ios' | null>(null)
const open = ref(false)
let deferred: BeforeInstallPromptEvent | null = null
let timer: number | undefined

const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
const phone = () => window.matchMedia('(pointer: coarse)').matches && window.matchMedia('(max-width: 839px)').matches
const quiet = () => Date.now() - read<number>(KEY, 0) < QUIET_DAYS * 86_400_000
const iosSafari = () => {
  const ua = navigator.userAgent
  const ios = /iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1 && window.innerWidth < 840)
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
}

function schedule(kind: 'native' | 'ios') {
  mode.value = kind
  window.clearTimeout(timer)
  timer = window.setTimeout(() => { if (!route.path.startsWith('/admin')) open.value = true }, DELAY_MS)
}

function onBeforeInstall(e: Event) {
  e.preventDefault()
  deferred = e as BeforeInstallPromptEvent
  schedule('native')
}

function onInstalled() {
  open.value = false
  deferred = null
  ui.notify('Gotowe! zanimwyjdziesz.pl jest na ekranie głównym.')
}

async function install() {
  if (!deferred) return
  open.value = false
  await deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = null
  if (outcome === 'dismissed') write(KEY, Date.now())
}

function later() {
  open.value = false
  write(KEY, Date.now())
}

onMounted(() => {
  if (standalone() || !phone() || quiet()) return
  window.addEventListener('beforeinstallprompt', onBeforeInstall)
  window.addEventListener('appinstalled', onInstalled)
  if (iosSafari()) schedule('ios')
})
onBeforeUnmount(() => {
  window.clearTimeout(timer)
  window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  window.removeEventListener('appinstalled', onInstalled)
})
</script>

<template>
  <transition name="pop">
    <aside v-if="open && mode" class="install" role="dialog" aria-labelledby="install-title" aria-describedby="install-text">
      <img src="/app-icon-192.png" width="48" height="48" alt="" class="install-logo">
      <div class="install-body">
        <h2 id="install-title" class="text-title-medium">Dodaj nas na ekran główny</h2>
        <p v-if="mode === 'native'" id="install-text" class="text-body-medium">
          Odjazdy i opóźnienia jednym dotknięciem, jak zwykła aplikacja. Bez sklepu i bez zakładania konta.
        </p>
        <p v-else id="install-text" class="text-body-medium">
          Dotknij <v-icon icon="ios_share" size="18" class="inline-ic" aria-label="Udostępnij" /> na dole Safari,
          a potem <strong>Do ekranu początkowego</strong> <v-icon icon="add_box" size="18" class="inline-ic" aria-hidden="true" />.
        </p>
        <div class="install-actions">
          <v-btn variant="text" @click="later">{{ mode === 'native' ? 'Nie teraz' : 'Zamknij' }}</v-btn>
          <v-btn v-if="mode === 'native'" variant="flat" color="primary" prepend-icon="add_box" @click="install">Dodaj</v-btn>
        </div>
      </div>
    </aside>
  </transition>
</template>

<style scoped>
.install {
  position: fixed; z-index: 1005; left: 12px; right: 12px; bottom: calc(92px + env(safe-area-inset-bottom, 0px));
  display: flex; gap: 14px; padding: 16px 16px 10px; border-radius: var(--kw-r-l);
  background: rgb(var(--v-theme-surface-container-high)); color: rgb(var(--v-theme-on-surface));
  box-shadow: 0 4px 8px 3px rgb(0 0 0 / .15), 0 1px 3px rgb(0 0 0 / .3);
  max-width: 560px; margin: 0 auto;
}
.install-logo { flex: none; border-radius: var(--kw-r-s); }
.install-body { display: grid; gap: 4px; min-width: 0; }
.install-body p { color: rgb(var(--v-theme-on-surface-variant)); text-wrap: pretty; }
.inline-ic { vertical-align: -3px; color: rgb(var(--v-theme-primary)); }
.install-actions { display: flex; justify-content: flex-end; gap: 4px; margin-top: 4px; margin-right: -6px; }
.pop-enter-active, .pop-leave-active { transition: transform .25s cubic-bezier(.2, 0, 0, 1), opacity .2s; }
.pop-enter-from, .pop-leave-to { transform: translateY(16px); opacity: 0; }
@media (prefers-reduced-motion: reduce) { .pop-enter-active, .pop-leave-active { transition: none; } }
</style>
