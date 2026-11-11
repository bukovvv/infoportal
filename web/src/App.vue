<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay, useTheme } from 'vuetify'
import BrandMark from '@/components/BrandMark.vue'
import InstallPrompt from '@/components/InstallPrompt.vue'
import MourningRibbon from '@/components/MourningRibbon.vue'
import { mourning } from '@/utils/mourning'
import SettingsDialog from '@/components/SettingsDialog.vue'
import TrainSheet from '@/components/TrainSheet.vue'
import { shortTitles, titles } from '@/router'
import { useAdmin } from '@/stores/admin'
import { useLive, useNotices, useStatus } from '@/stores/data'
import { usePrefs } from '@/stores/prefs'
import { useUi } from '@/stores/ui'
import { clock } from '@/utils/format'
import { region, REGION_LIST, regionPath } from '@/utils/region'
import logoOnBand from '@/assets/logo-na-ciemne.svg'

const route = useRoute()
const router = useRouter()
const ui = useUi()
const prefs = usePrefs()
const admin = useAdmin()
const live = useLive()
const status = useStatus()
const notices = useNotices()
const theme = useTheme()
const { mdAndUp } = useDisplay()

onMounted(() => {
  live.start()
  status.start()
  if (region.features.notices) notices.start()
})
watch(() => ui.theme, (mode) => theme.change(mode), { immediate: true })
// pasek przeglądarki / systemu w kolorze górnego paska (według wybranego motywu, nie tylko systemowego)
watch(() => theme.current.value.colors.band, (color) => {
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', String(color)))
}, { immediate: true })

const isAdmin = computed(() => route.path.startsWith('/admin'))
const isStart = computed(() => route.name === 'start')
// BTK i komunikaty tylko w regionach, które je mają (Małopolska: Start, Mapa, Odjazdy)
const nav = computed(() => [
  { to: '/', name: 'start', label: 'Start', icon: 'home' },
  { to: '/mapa', name: 'map', label: 'Mapa', icon: 'map' },
  { to: '/odjazdy', name: 'board', label: 'Odjazdy', icon: 'departure_board' },
  ...(region.features.btk ? [{ to: '/bus-tramwaj-kolej', name: 'btk', label: 'Bus-Tramwaj-Kolej', short: 'Bus-Tram-Kolej', icon: 'commute' }] : []),
  ...(region.features.notices ? [{ to: '/komunikaty', name: 'notices', label: 'Komunikaty', icon: 'campaign', badge: notices.alerts.length }] : []),
] as { to: string; name: string; label: string; icon: string; short?: string; badge?: number }[])
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
    <!-- pasek przed menu bocznym: na komputerze biegnie przez całą szerokość, logo jest tylko w nim -->
    <v-app-bar :elevation="0" color="band" height="64" scroll-behavior="elevate" :scroll-threshold="4" class="app-bar">
      <template #prepend>
        <router-link v-if="(isStart || mdAndUp) && !isAdmin" to="/" class="brand-logo" aria-label="zanimwyjdziesz.pl – start"><img :src="logoOnBand" alt="zanimwyjdziesz.pl" height="40"></router-link>
        <router-link v-else to="/" class="brand-mark ml-3" aria-label="zanimwyjdziesz.pl – start"><BrandMark on-band :size="36" /></router-link>
        <MourningRibbon v-if="mourning" :size="mdAndUp ? 40 : 34" class="bar-ribbon" />
        <span v-if="mdAndUp && !isStart && !isAdmin" class="bar-divider" aria-hidden="true" />
      </template>
      <v-app-bar-title v-if="!isStart || isAdmin" class="text-title-large app-title">{{ title }}</v-app-bar-title>
      <v-spacer v-else />
      <template #append>
        <span v-if="!isAdmin" class="live-chip mr-2 tnum" :title="liveState.title">
          <span class="live-dot" :class="liveState.cls" aria-hidden="true" />
          <span class="live-text">{{ liveState.text }}</span>
        </span>
        <v-btn
          v-if="!isAdmin"
          :variant="mdAndUp ? 'flat' : 'text'"
          :class="['mr-1', { 'ticket-btn': mdAndUp }]"
          :href="region.ticketUrl"
          target="_blank"
          rel="noopener noreferrer"
          :icon="!mdAndUp"
          :prepend-icon="mdAndUp ? 'confirmation_number' : undefined"
          :aria-label="`Kup bilet (otwiera stronę: ${region.agencyName})`"
        >
          <v-icon v-if="!mdAndUp" icon="confirmation_number" />
          <template v-else>Kup bilet</template>
        </v-btn>
        <template v-if="isAdmin && admin.session?.loggedIn">
          <v-btn variant="text" :icon="!mdAndUp" :prepend-icon="mdAndUp ? 'open_in_new' : undefined" to="/" target="_blank" aria-label="Portal (w nowej karcie)" class="mr-1">
            <v-icon v-if="!mdAndUp" icon="open_in_new" />
            <template v-else>Portal</template>
          </v-btn>
          <v-btn variant="text" :icon="!mdAndUp" :prepend-icon="mdAndUp ? 'logout' : undefined" aria-label="Wyloguj" class="mr-1" @click="admin.logout()">
            <v-icon v-if="!mdAndUp" icon="logout" />
            <template v-else>Wyloguj</template>
          </v-btn>
        </template>
        <v-menu location="bottom end">
          <template #activator="{ props }">
            <v-btn v-bind="props" :icon="mdAndUp ? themeIcon : 'more_vert'" variant="text" aria-label="Motyw, ustawienia i informacje" class="mr-1" />
          </template>
          <v-list density="compact" nav>
            <v-list-subheader>Motyw</v-list-subheader>
            <v-list-item v-for="t in themes" :key="t.value" :prepend-icon="t.icon" :title="t.label" :active="ui.theme === t.value" @click="ui.setTheme(t.value)" />
            <v-divider class="my-1" />
            <v-list-item v-if="!isAdmin" prepend-icon="tune" title="Ustawienia" @click="prefs.dialog = true" />
            <v-list-item v-if="!isAdmin && region.features.scheme" prepend-icon="route" title="Schemat połączeń KW" :to="{ name: 'scheme' }" />
            <v-list-item prepend-icon="info" title="O nas" to="/o-nas" />
            <template v-if="!isAdmin">
              <v-divider class="my-1" />
              <!-- region: zwykły link (pełne wczytanie — inne stacje, rozkład i dane na żywo) -->
              <v-list-subheader>Region</v-list-subheader>
              <v-list-item
                v-for="r in REGION_LIST"
                :key="r.id"
                :prepend-icon="r.id === region.id ? 'check' : 'location_on'"
                :title="r.name"
                :subtitle="r.agencyName"
                :active="r.id === region.id"
                :href="r.id === region.id ? undefined : regionPath('/', r)"
              />
            </template>
          </v-list>
        </v-menu>
      </template>
    </v-app-bar>

    <v-navigation-drawer v-if="mdAndUp && !isAdmin" permanent width="88" class="rail" floating aria-label="Nawigacja główna">
      <div class="rail-inner">
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

    <v-main>
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </v-main>

    <nav v-if="!mdAndUp && !isAdmin" class="navbar" :style="{ '--nav-count': nav.length }" aria-label="Nawigacja główna">
      <router-link v-for="item in nav" :key="item.to" :to="item.to" class="nav-item" :aria-label="item.label" :aria-current="current === item.name ? 'page' : undefined">
        <span class="nav-ind">
          <v-icon :icon="current === item.name ? `${item.icon}-fill` : item.icon" />
          <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
        </span>
        <span aria-hidden="true">{{ item.short ?? item.label }}</span>
      </router-link>
    </nav>

    <TrainSheet />
    <InstallPrompt v-if="!isAdmin" />
    <SettingsDialog v-if="!isAdmin" />

    <v-snackbar v-model="snackOpen" :timeout="4500" :key="ui.snack?.id" class="kw-snack">
      {{ ui.snack?.text }}
      <template v-if="ui.snack?.action" #actions>
        <v-btn variant="text" color="inverse-primary" @click="ui.snack?.action?.run(); ui.snack = null">{{ ui.snack?.action?.label }}</v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<style scoped>
/* menu boczne w kolorze górnego paska: razem tworzą jedną grafitową ramkę */
.rail { background: rgb(var(--v-theme-band)) !important; color: rgb(var(--v-theme-on-band)); }
.rail .nav-item { color: color-mix(in srgb, rgb(var(--v-theme-on-band)) 72%, transparent); }
.rail .nav-item[aria-current='page'] { color: rgb(var(--v-theme-on-band)); }
.rail .nav-item:hover .nav-ind { background: color-mix(in srgb, rgb(var(--v-theme-on-band)) 10%, transparent); }
.rail-inner { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 12px 0 24px; min-height: 100%; }
.rail-about { margin-top: auto; }
.rail-fab { margin: 4px 0 20px; }
.rail-items { display: grid; gap: 12px; }
.navbar {
  position: fixed; z-index: 1004; left: 0; right: 0; bottom: 0; display: grid; grid-template-columns: repeat(var(--nav-count, 5), 1fr);
  align-items: start; padding: 12px 0 calc(12px + env(safe-area-inset-bottom, 0px)); background: rgb(var(--v-theme-surface-container));
}
.navbar .nav-item { width: auto; }
.navbar .nav-ind { width: 64px; }
.app-title { font-size: 22px; }
.app-bar :deep(.v-toolbar__content) { padding-inline: 4px 8px; }
.brand-logo { display: block; flex: none; margin-inline-start: 12px; }
/* na komputerze logo stoi nad menu bocznym (88 px), tytuł widoku zaczyna się nad treścią */
@media (min-width: 840px) { .brand-logo { margin-inline-start: 20px; } }
.bar-divider { width: 1px; height: 28px; margin-inline: 16px 4px; background: color-mix(in srgb, rgb(var(--v-theme-on-band)) 28%, transparent); }
.brand-logo img { display: block; height: 40px; width: auto; }
.bar-ribbon { margin-inline-start: 10px; }
.live-chip {
  display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 12px; border-radius: 16px;
  background: color-mix(in srgb, rgb(var(--v-theme-on-band)) 14%, transparent); font-size: 13px; font-weight: 600; white-space: nowrap;
}
.live-dot { flex: none; }
/* „Kup bilet” na grafitowym pasku: jasny przycisk z tekstem w kolorze paska */
.ticket-btn { background: rgb(var(--v-theme-on-band)) !important; color: rgb(var(--v-theme-band)) !important; font-weight: 700; }
@media (max-width: 839px) {
  :deep(.v-main) { padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)) !important; }
  .kw-snack { margin-bottom: calc(88px + env(safe-area-inset-bottom, 0px)); }
}
@media (max-width: 480px) {
  .live-text { display: none; }
  .live-chip { padding: 0 12px; }
  .app-title { font-size: 20px; margin-inline-start: 12px; }
  .live-chip { margin-right: 4px !important; }
}
@media (max-width: 379px) {
  .app-title { font-size: 18px; }
}
</style>
