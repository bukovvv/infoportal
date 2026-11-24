<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDisplay, useTheme } from 'vuetify'
import AdminLogin from '@/components/admin/AdminLogin.vue'
import { useAdmin } from '@/stores/admin'
import { noticeState } from '@/utils/adminNotices'

const admin = useAdmin()
const route = useRoute()
const theme = useTheme()
const { mdAndUp } = useDisplay()
const loadError = ref<string | null>(null)

onMounted(() => admin.check().catch((e) => { loadError.value = (e as Error).message }))
// lista komunikatów jest potrzebna wszędzie w panelu (licznik w menu, pulpit, edytor)
watch(() => admin.session?.loggedIn, (on) => { if (on) void admin.loadNotices() }, { immediate: true })

// panel w stylu wersji 2.0: paleta „Tarcza” (plugins/vuetify.ts) i pola wypełnione zamiast obrysowanych
const tarcza = computed(() => (theme.global.current.value.dark ? 'tarczaDark' : 'tarcza'))
const defaults = {
  VTextField: { variant: 'solo-filled', flat: true, rounded: 'lg' },
  VTextarea: { variant: 'solo-filled', flat: true, rounded: 'lg' },
  VSelect: { variant: 'solo-filled', flat: true, rounded: 'lg' },
  VAutocomplete: { variant: 'solo-filled', flat: true, rounded: 'lg' },
  VCombobox: { variant: 'solo-filled', flat: true, rounded: 'lg' },
  VCard: { flat: true, rounded: 'xl' },
  VAlert: { rounded: 'lg', variant: 'flat' },
  VBtn: { rounded: 'pill', flat: true },
}

const liveCount = computed(() => (admin.notices ?? []).filter((n) => noticeState(n) === 'live').length)
const section = computed(() => {
  const name = String(route.name ?? '')
  return name === 'admin' ? 'admin' : ['admin-health', 'admin-log', 'admin-security'].find((s) => name.startsWith(s)) ?? 'admin-notices'
})
const items = computed(() => [
  { name: 'admin', label: 'Pulpit', icon: 'dashboard' },
  { name: 'admin-notices', label: 'Komunikaty', icon: 'campaign', badge: liveCount.value || null },
  { name: 'admin-health', label: 'Stan źródeł', icon: 'monitor_heart' },
  { name: 'admin-log', label: 'Dziennik', icon: 'history' },
  { name: 'admin-security', label: 'Zabezpieczenia', icon: 'shield' },
])
</script>

<template>
  <div v-if="loadError" class="page"><v-alert color="error-container" icon="error">{{ loadError }}</v-alert></div>
  <div v-else-if="!admin.session" class="page"><v-skeleton-loader type="card" color="transparent" max-width="440" class="mx-auto mt-8" /></div>
  <AdminLogin v-else-if="!admin.session.loggedIn" />
  <v-theme-provider v-else :theme="tarcza" with-background class="tarcza tarcza-panel">
    <v-defaults-provider :defaults="defaults">
      <div class="admin-shell">
        <!-- menu: na komputerze kolumna pigułek z lewej, na telefonie przewijany rząd pod paskiem -->
        <nav class="admin-side" :class="{ wide: mdAndUp }" aria-label="Panel">
          <div class="side-items">
            <router-link v-for="it in items" :key="it.name" :to="{ name: it.name }" class="side-item" :aria-current="section === it.name ? 'page' : undefined">
              <v-icon :icon="it.icon" size="20" />
              <span>{{ it.label }}</span>
              <span v-if="it.badge" class="side-badge" :aria-label="`${it.badge} widocznych`">{{ it.badge }}</span>
            </router-link>
            <span v-if="mdAndUp" class="side-sep" aria-hidden="true" />
            <!-- podgląd rozkładu całej Polski to osobny region (pełne wczytanie), stąd zwykły link -->
            <a href="/nowyrj27" class="side-item minor"><v-icon icon="manage_search" size="20" /><span>Nowy RJ 2026/27</span></a>
            <a href="/v20" class="side-item minor"><v-icon icon="visibility" size="20" /><span>Wersja 2.0 (test)</span></a>
          </div>
          <p v-if="mdAndUp" class="side-foot">Sesja wygasa po 2 h bezczynności. Niezapisany formularz zostaje w tej przeglądarce.</p>
        </nav>
        <div class="admin-main">
          <router-view />
        </div>
      </div>
    </v-defaults-provider>
  </v-theme-provider>
</template>

<style scoped>
.admin-shell { display: flex; flex-direction: column; min-height: calc(100dvh - 64px); }
.admin-side { padding: 10px 12px; border-bottom: 1px solid var(--kreska); }
.side-items { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
.side-item {
  display: flex; align-items: center; gap: 10px; flex: none; height: 40px; padding: 0 16px; border-radius: 999px;
  color: var(--tusz-2); text-decoration: none; font-weight: 600; font-size: 14px; white-space: nowrap; transition: background .15s, color .15s;
}
.side-item:hover { color: var(--tusz); background: var(--plyta); }
.side-item[aria-current='page'] { color: var(--papier); background: var(--tusz); }
.side-badge {
  display: grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; box-sizing: border-box; margin-left: auto;
  border-radius: 999px; background: var(--akcja); color: #fff; font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums;
}
.side-sep { height: 1px; margin: 10px 16px; background: var(--kreska); }
.side-item.minor { font-weight: 500; }
.side-foot { margin: auto 0 0; padding: 16px; font-size: 12px; line-height: 18px; color: var(--tusz-2); }
.admin-main { flex: 1; min-width: 0; padding: 24px 24px 48px; }
.admin-main > :deep(*) { max-width: 1180px; margin-inline: auto; }
@media (min-width: 960px) {
  .admin-shell { flex-direction: row; }
  .admin-side.wide { position: sticky; top: 64px; align-self: flex-start; width: 248px; flex: none; height: calc(100dvh - 64px); box-sizing: border-box; padding: 20px 12px 12px 16px; border-bottom: 0; display: flex; flex-direction: column; }
  .admin-side.wide .side-items { flex-direction: column; overflow: visible; gap: 2px; }
  .admin-side.wide .side-item { height: 44px; }
  .admin-main { padding: 28px 32px 48px; }
}
@media (max-width: 599px) {
  .admin-main { padding: 16px 16px 40px; }
}
</style>
