<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay, useTheme } from 'vuetify'
import TrainSheet from '@/components/TrainSheet.vue'
import { shortTitles, titles } from '@/router'
import { useLive, useNotices, useStatus } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { clock } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const ui = useUi()
const live = useLive()
const status = useStatus()
const notices = useNotices()
const theme = useTheme()
const { mdAndUp } = useDisplay()

onMounted(() => {
  live.start()
  status.start()
  notices.start()
})
watch(() => ui.theme, (mode) => theme.change(mode), { immediate: true })

const isAdmin = computed(() => route.path.startsWith('/admin'))
const nav = computed(() => [
  { to: '/', name: 'start', label: 'Start', icon: 'home' },
  { to: '/mapa', name: 'map', label: 'Mapa', icon: 'map' },
  { to: '/odjazdy', name: 'board', label: 'Odjazdy', icon: 'departure_board' },
  { to: '/bus-tramwaj-kolej', name: 'btk', label: 'Bus-Tramwaj-Kolej', short: 'Bus-Tram-Kolej', icon: 'commute' },
  { to: '/komunikaty', name: 'notices', label: 'Komunikaty', icon: 'campaign', badge: notices.alerts.length },
])
// strona pojedynczego komunikatu podświetla zakładkę Komunikaty, schemat połączeń — zakładkę Mapa
const current = computed(() => (route.name === 'notice' ? 'notices' : route.name === 'scheme' ? 'map' : String(route.name ?? '')))
const title = computed(() => {
  const name = isAdmin.value ? 'admin' : route.name === 'scheme' ? 'scheme' : titles[current.value] ? current.value : 'start'
  return (!mdAndUp.value && shortTitles[name]) || titles[name]
})

const themes = [
  { value: 'system', label: 'Systemowy', icon: 'brightness_auto' },
  { value: 'light', label: 'Jasny', icon: 'light_mode' },
  { value: 'dark', label: 'Ciemny', icon: 'dark_mode' },
] as const
const themeIcon = computed(() => themes.find((t) => t.value === ui.theme)?.icon ?? 'brightness_auto')

/** Wskaźnik „na żywo”: kolor i opis zależą od świeżości danych. */
const liveState = computed(() => {
  const s = status.status
  if (!s) return { cls: 'warn', text: 'Łączenie…', title: 'Pobieranie stanu danych' }
  if (s.level === 'down') return { cls: 'down', text: 'Tylko rozkład', title: s.messages[0]?.text ?? '' }
  if (!s.live.ok) return { cls: 'warn', text: 'Rozkład', title: s.messages[0]?.text ?? '' }
  return { cls: s.level === 'ok' ? '' : 'warn', text: `Na żywo · ${clock(s.live.generatedAt)}`, title: s.messages.map((m) => m.text).join(' ') || 'Dane na żywo są aktualne' }
})

const snackOpen = computed({
  get: () => ui.snack !== null,
  set: (v: boolean) => { if (!v) ui.snack = null },
})
const searchFab = () => router.push({ name: 'start', hash: '#szukaj' })
</script>

<template>
  <v-app>
    <v-navigation-drawer v-if="mdAndUp && !isAdmin" permanent width="88" class="rail" floating aria-label="Nawigacja główna">
      <div class="rail-inner">
        <router-link to="/" class="brand-mark" aria-label="Infoportal – start"><img src="/favicon.svg" width="40" height="40" alt=""></router-link>
        <v-btn class="rail-fab" color="primary-container" icon="search" size="56" elevation="3" aria-label="Wyszukaj połączenie" @click="searchFab" />
        <nav class="rail-items">
          <router-link v-for="item in nav" :key="item.to" :to="item.to" class="nav-item" :aria-current="current === item.name ? 'page' : undefined">
            <span class="nav-ind">
              <v-icon :icon="current === item.name ? `${item.icon}-fill` : item.icon" />
              <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
            </span>
            <span>{{ item.label }}</span>
          </router-link>
        </nav>
        <router-link to="/o-nas" class="nav-item rail-about" :aria-current="current === 'about' ? 'page' : undefined">
          <span class="nav-ind"><v-icon :icon="current === 'about' ? 'info-fill' : 'info'" /></span>
          <span>O nas</span>
        </router-link>
      </div>
    </v-navigation-drawer>

    <v-app-bar :elevation="0" color="surface" height="64" scroll-behavior="elevate" :scroll-threshold="4">
      <template #prepend>
        <router-link v-if="!mdAndUp || isAdmin" to="/" class="brand-mark ml-2" aria-label="Infoportal – start"><img src="/favicon.svg" width="40" height="40" alt=""></router-link>
      </template>
      <v-app-bar-title class="text-title-large app-title">{{ title }}</v-app-bar-title>
      <template #append>
        <v-chip v-if="!isAdmin" variant="flat" color="surface-container-high" class="live-chip mr-2 tnum" :title="liveState.title">
          <span class="live-dot mr-2" :class="liveState.cls" aria-hidden="true" />
          <span class="live-text">{{ liveState.text }}</span>
        </v-chip>
        <v-btn
          v-if="!isAdmin"
          variant="flat"
          color="secondary-container"
          href="https://wielkopolskiebilety.pl/"
          target="_blank"
          rel="noopener noreferrer"
          :icon="!mdAndUp"
          :prepend-icon="mdAndUp ? 'confirmation_number' : undefined"
          aria-label="Kup bilet (otwiera stronę przewoźnika)"
          class="mr-1"
        >
          <v-icon v-if="!mdAndUp" icon="confirmation_number" />
          <template v-else>Kup bilet</template>
        </v-btn>
        <v-menu location="bottom end">
          <template #activator="{ props }">
            <v-btn v-bind="props" :icon="mdAndUp ? themeIcon : 'more_vert'" variant="text" aria-label="Motyw i informacje" class="mr-1" />
          </template>
          <v-list density="compact" nav>
            <v-list-subheader>Motyw</v-list-subheader>
            <v-list-item v-for="t in themes" :key="t.value" :prepend-icon="t.icon" :title="t.label" :active="ui.theme === t.value" @click="ui.setTheme(t.value)" />
            <v-divider class="my-1" />
            <v-list-item prepend-icon="info" title="O nas" to="/o-nas" />
          </v-list>
        </v-menu>
      </template>
    </v-app-bar>

    <v-main>
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </v-main>

    <nav v-if="!mdAndUp && !isAdmin" class="navbar" aria-label="Nawigacja główna">
      <router-link v-for="item in nav" :key="item.to" :to="item.to" class="nav-item" :aria-label="item.label" :aria-current="current === item.name ? 'page' : undefined">
        <span class="nav-ind">
          <v-icon :icon="current === item.name ? `${item.icon}-fill` : item.icon" />
          <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
        </span>
        <span aria-hidden="true">{{ item.short ?? item.label }}</span>
      </router-link>
    </nav>

    <TrainSheet />

    <v-snackbar v-model="snackOpen" :timeout="4500" :key="ui.snack?.id" class="kw-snack">
      {{ ui.snack?.text }}
      <template v-if="ui.snack?.action" #actions>
        <v-btn variant="text" color="inverse-primary" @click="ui.snack?.action?.run(); ui.snack = null">{{ ui.snack?.action?.label }}</v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<style scoped>
.rail { background: rgb(var(--v-theme-surface)) !important; }
.rail-inner { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 16px 0 24px; min-height: 100%; }
.rail-about { margin-top: auto; }
.rail-fab { margin: 8px 0 20px; }
.rail-items { display: grid; gap: 12px; }
.navbar {
  position: fixed; z-index: 1004; left: 0; right: 0; bottom: 0; display: grid; grid-template-columns: repeat(5, 1fr);
  align-items: start; padding: 12px 0 calc(12px + env(safe-area-inset-bottom, 0px)); background: rgb(var(--v-theme-surface-container));
}
.navbar .nav-item { width: auto; }
.navbar .nav-ind { width: 64px; }
.app-title { font-size: 22px; }
.live-chip { font-weight: 500; }
@media (max-width: 839px) {
  :deep(.v-main) { padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)) !important; }
  .kw-snack { margin-bottom: calc(88px + env(safe-area-inset-bottom, 0px)); }
}
@media (max-width: 480px) {
  .live-text { display: none; }
  .live-chip .live-dot { margin-right: 0 !important; }
}
</style>
