<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import AdminLogin from '@/components/admin/AdminLogin.vue'
import { useAdmin } from '@/stores/admin'
import { noticeState } from '@/utils/adminNotices'

const admin = useAdmin()
const route = useRoute()
const { mdAndUp } = useDisplay()
const loadError = ref<string | null>(null)

onMounted(() => admin.check().catch((e) => { loadError.value = (e as Error).message }))
// lista komunikatów jest potrzebna wszędzie w panelu (licznik w menu, pulpit, edytor)
watch(() => admin.session?.loggedIn, (on) => { if (on) void admin.loadNotices() }, { immediate: true })

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
  <div v-else class="admin-shell">
    <!-- menu boczne w kolorze paska (jak w portalu); na telefonie pasek zakładek pod górnym paskiem -->
    <nav class="admin-side" :class="{ wide: mdAndUp }" aria-label="Panel">
      <div class="side-items">
        <router-link v-for="it in items" :key="it.name" :to="{ name: it.name }" class="side-item" :aria-current="section === it.name ? 'page' : undefined">
          <v-icon :icon="it.icon" size="22" />
          <span>{{ it.label }}</span>
          <span v-if="it.badge" class="side-badge" :aria-label="`${it.badge} widocznych`">{{ it.badge }}</span>
        </router-link>
        <!-- podgląd rozkładu całej Polski to osobny region (pełne wczytanie), stąd zwykły link -->
        <a href="/nowyrj27" class="side-item"><v-icon icon="manage_search" size="22" /><span>Nowy RJ 2026/27</span></a>
        <a href="/v20" class="side-item"><v-icon icon="visibility" size="22" /><span>Wersja 2.0 (test)</span></a>
      </div>
      <p v-if="mdAndUp" class="side-foot">Sesja wygasa po 2 h bezczynności.<br>Niezapisany formularz zostaje w tej przeglądarce.</p>
    </nav>
    <div class="admin-main">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.admin-shell { display: flex; flex-direction: column; min-height: calc(100dvh - 64px); }
.admin-side { background: rgb(var(--v-theme-band)); color: rgb(var(--v-theme-on-band)); padding: 0 12px 10px; }
.side-items { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; }
.side-item {
  display: flex; align-items: center; gap: 12px; flex: none; height: 44px; padding: 0 16px; border-radius: 999px;
  color: color-mix(in srgb, rgb(var(--v-theme-on-band)) 75%, transparent); text-decoration: none; font-weight: 600; white-space: nowrap;
}
.side-item:hover { color: rgb(var(--v-theme-on-band)); background: color-mix(in srgb, rgb(var(--v-theme-on-band)) 7%, transparent); }
.side-item[aria-current='page'] { color: rgb(var(--v-theme-on-band)); background: color-mix(in srgb, rgb(var(--v-theme-on-band)) 14%, transparent); }
.side-badge {
  display: grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; box-sizing: border-box; margin-left: auto;
  border-radius: 999px; background: rgb(var(--v-theme-brand-red)); color: #fff; font-size: 12px; font-weight: 800;
}
.side-foot { margin: auto 0 0; padding: 16px; font-size: 12px; line-height: 18px; color: color-mix(in srgb, rgb(var(--v-theme-on-band)) 60%, transparent); }
.admin-main { flex: 1; min-width: 0; padding: 24px 24px 48px; }
.admin-main > :deep(*) { max-width: 1180px; margin-inline: auto; }
@media (min-width: 960px) {
  .admin-shell { flex-direction: row; }
  .admin-side.wide { position: sticky; top: 64px; align-self: flex-start; width: 248px; flex: none; height: calc(100dvh - 64px); box-sizing: border-box; padding: 12px; display: flex; flex-direction: column; }
  .admin-side.wide .side-items { flex-direction: column; overflow: visible; }
  .admin-side.wide .side-item { height: 48px; }
  .admin-main { padding: 28px 32px 48px; }
}
@media (max-width: 599px) {
  .admin-main { padding: 16px 16px 40px; }
}
</style>
