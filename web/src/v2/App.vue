<script setup lang="ts">
import { computed, provide, ref, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { TARCZA_ICONS } from '@/plugins/tarczaIcons'
import { useAdmin } from '@/stores/admin'
import { read, useUi, write } from '@/stores/ui'
import { REGIONS, region, rememberRegion } from '@/utils/region'
import { ADMIN_TABS, TABS } from './router'

const route = useRoute()
const router = useRouter()
const admin = useAdmin()
const ui = useUi()
const vTheme = useTheme()
provide(TARCZA_ICONS, ref(true)) // ikony 2.0 zamiast Material Symbols (plugins/MsIcon.ts)

// motyw wspólny z 1.0 (kw_theme: system/light/dark); przycisk przełącza na przeciwny do widocznego
const theme = ref(read<'system' | 'light' | 'dark'>('kw_theme', 'system'))
const systemDark = matchMedia('(prefers-color-scheme: dark)')
const systemIsDark = ref(systemDark.matches)
systemDark.addEventListener('change', (e) => { systemIsDark.value = e.matches })
const dark = computed(() => theme.value === 'dark' || (theme.value === 'system' && systemIsDark.value))
watchEffect(() => {
  vTheme.change(dark.value ? 'tarczaDark' : 'tarcza')
  // zmienne kolorów układu z makiety (styles.css) idą za tym samym wyborem
  const root = document.documentElement
  if (theme.value === 'system') delete root.dataset.theme
  else root.dataset.theme = theme.value
})
function toggleTheme() {
  theme.value = dark.value ? 'light' : 'dark'
  write('kw_theme', theme.value)
}

// Małopolska: barwy KMŁ (motyw w plugins/vuetify.ts, zmienne w styles.css); przełącznik = pełne wczytanie drugiego regionu
if (region.id === 'malopolska') document.documentElement.dataset.region = 'mal'
const other = region.id === 'malopolska' ? REGIONS.wielkopolska : REGIONS.malopolska
const switchRegion = () => {
  rememberRegion(other.id)
  location.href = '/v2' + other.base + '/'
}

// panel: własne zakładki w tym samym pasku; przed zalogowaniem bez zakładek
const inAdmin = computed(() => !!route.meta.admin)
const loggedIn = computed(() => !!admin.session?.loggedIn)
const tabs = computed(() => (inAdmin.value ? (loggedIn.value ? ADMIN_TABS : []) : TABS))
const current = computed(() => {
  const name = String(route.name ?? '')
  return name === 'admin-new' || name === 'admin-edit' ? 'admin-notices' : name
})
async function logout() {
  await admin.logout()
  await router.push({ name: 'admin' })
}

// powiadomienia z ui.notify (np. „Przedłużono komunikat.” z przyciskiem „Cofnij”)
const snackOpen = ref(false)
watch(() => ui.snack?.id, (id) => { snackOpen.value = !!id })
</script>

<template>
  <v-app>
    <header class="gora">
      <div class="gora-in">
        <RouterLink class="logo" :to="inAdmin ? '/admin' : '/'" aria-label="zanimwyjdziesz.pl, strona startowa">
          <svg viewBox="8 8 92 84" width="34" height="34" fill="none" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path stroke="currentColor" d="M79.5 29.3A36 36 0 1 0 79.5 70.7M50 50V28" /><path stroke="#D2232A" d="M50 50H94M84 40L94 50L84 60" /></svg>
          <b><span>zanim</span><span>wyjdziesz.pl</span></b>
          <span v-if="inAdmin" class="gora-panel">panel</span>
        </RouterLink>
        <nav class="menu" aria-label="Główna">
          <RouterLink v-for="t in tabs" :key="t.name" :to="t.path" :aria-current="current === t.name ? 'page' : undefined">{{ t.title }}</RouterLink>
        </nav>
        <template v-if="inAdmin">
          <v-btn variant="tonal" height="40" prepend-icon="open_in_new" to="/" class="tylko-duzy">Serwis</v-btn>
          <v-btn v-if="loggedIn" variant="tonal" icon="logout" aria-label="Wyloguj się" @click="logout" />
        </template>
        <v-btn v-else variant="tonal" height="40" append-icon="keyboard_arrow_down" :aria-label="`Region: ${region.name}. Przełącz na: ${other.name}`" @click="switchRegion">{{ region.name }}</v-btn>
        <v-btn variant="tonal" :icon="dark ? 'light_mode' : 'dark_mode'" aria-label="Przełącz motyw jasny i ciemny" @click="toggleTheme" />
      </div>
    </header>

    <main>
      <RouterView />
    </main>

    <nav v-if="tabs.length" class="dol" :class="{ 'dol-3': tabs.length === 3 }" aria-label="Główna">
      <RouterLink v-for="t in tabs" :key="t.name" :to="t.path" :aria-current="current === t.name ? 'page' : undefined"><i><v-icon :icon="t.icon" /></i>{{ t.title }}</RouterLink>
    </nav>

    <v-snackbar v-model="snackOpen" :timeout="ui.snack?.action ? 6000 : 4000" class="snack">
      {{ ui.snack?.text }}
      <template v-if="ui.snack?.action" #actions>
        <v-btn variant="text" @click="ui.snack.action.run(); snackOpen = false">{{ ui.snack.action.label }}</v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>
