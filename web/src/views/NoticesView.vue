<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import NoticeCard from '@/components/NoticeCard.vue'
import { useNotices } from '@/stores/data'
import { normalize, plural } from '@/utils/format'

const notices = useNotices()
const filter = ref<'all' | 'alert' | 'info'>('all')
const query = ref('')
const now = ref(Date.now())
const timer = window.setInterval(() => (now.value = Date.now()), 60_000)
onBeforeUnmount(() => window.clearInterval(timer))

const isAlert = (severity: string) => severity !== 'info'
const counts = computed(() => ({
  all: notices.list.length,
  alert: notices.alerts.length,
  info: notices.list.length - notices.alerts.length,
}))
const filters = computed(() => [
  { value: 'all', label: 'Wszystkie', count: counts.value.all },
  { value: 'alert', label: 'Utrudnienia', count: counts.value.alert },
  { value: 'info', label: 'Informacje', count: counts.value.info },
] as const)
const list = computed(() => {
  const q = normalize(query.value)
  return notices.list.filter((n) =>
    (filter.value === 'all' || (filter.value === 'alert') === isAlert(n.severity))
    && (!q || normalize(`${n.title} ${n.body} ${n.line} ${n.trains.join(' ')}`).includes(q)))
})
const worst = computed(() => (notices.list.some((n) => n.severity === 'danger') ? 'danger' : counts.value.alert ? 'warning' : 'ok'))
const summary = computed(() => {
  const a = counts.value.alert
  if (!a) return { title: 'Ruch bez utrudnień', text: 'Przewoźnik nie zgłasza teraz utrudnień. Pojedyncze opóźnienia sprawdzisz na tablicy odjazdów.', icon: 'check_circle-fill' }
  return {
    title: `${a} ${plural(a, 'utrudnienie', 'utrudnienia', 'utrudnień')} w ruchu`,
    text: 'Sprawdź, czy dotyczą Twojej trasy. Kliknij komunikat, żeby zobaczyć szczegóły i pociągi.',
    icon: worst.value === 'danger' ? 'cancel-fill' : 'warning-fill',
  }
})
</script>

<template>
  <div class="page-narrow notices-page">
    <section v-if="notices.loaded" class="summary" :class="worst" aria-live="polite">
      <span class="summary-ic"><v-icon :icon="summary.icon" size="28" /></span>
      <div class="summary-text">
        <h1 class="text-title-large">{{ summary.title }}</h1>
        <p class="text-body-medium">{{ summary.text }}</p>
      </div>
    </section>
    <v-skeleton-loader v-else type="list-item-avatar-two-line" class="summary-skel" />

    <div class="toolbar">
      <v-chip-group v-model="filter" mandatory selected-class="chip-on" aria-label="Rodzaj komunikatów">
        <v-chip v-for="f in filters" :key="f.value" :value="f.value" variant="outlined" filter>
          {{ f.label }}<span class="chip-count">{{ f.count }}</span>
        </v-chip>
      </v-chip-group>
      <v-text-field
        v-if="counts.all > 1"
        v-model="query"
        class="search"
        placeholder="Pociąg, linia albo stacja"
        prepend-inner-icon="search"
        density="compact"
        variant="solo-filled"
        flat
        clearable
        hide-details
        aria-label="Szukaj w komunikatach"
      />
    </div>

    <div v-if="!notices.loaded" class="list">
      <v-skeleton-loader v-for="i in 3" :key="i" type="article" class="skel" />
    </div>
    <div v-else-if="list.length" class="list">
      <NoticeCard v-for="n in list" :key="n.id" :notice="n" :now="now" />
    </div>
    <div v-else class="empty">
      <span class="empty-ic"><v-icon :icon="query ? 'search_off' : 'campaign'" size="32" /></span>
      <h2 class="text-title-medium">{{ query ? 'Nic nie znaleziono' : counts.all ? 'Brak komunikatów w tej kategorii' : 'Brak komunikatów' }}</h2>
      <p class="text-body-medium muted">
        {{ query ? 'Sprawdź pisownię albo wpisz sam numer pociągu.' : 'Gdy przewoźnik zgłosi utrudnienie, pojawi się tutaj i na ekranie startowym.' }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.notices-page { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); }
.summary {
  --s-c: var(--v-theme-success-container); --s-on: var(--v-theme-on-success-container);
  display: flex; align-items: center; gap: 16px; padding: 20px 24px; border-radius: var(--kw-r-xl);
  background: rgb(var(--s-c)); color: rgb(var(--s-on));
}
.summary.warning { --s-c: var(--v-theme-warning-container); --s-on: var(--v-theme-on-warning-container); }
.summary.danger { --s-c: var(--v-theme-error-container); --s-on: var(--v-theme-on-error-container); }
.summary-ic { flex: none; display: grid; place-items: center; width: 52px; height: 52px; border-radius: 50%; background: color-mix(in srgb, rgb(var(--s-on)) 12%, transparent); }
.summary-text { display: grid; gap: 2px; min-width: 0; }
.summary-text p { opacity: .85; text-wrap: pretty; }
.summary-skel, .skel { border-radius: var(--kw-r-l); }
.toolbar > .v-chip-group { min-width: 0; max-width: 100%; }
.toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; }
.search { flex: 0 1 300px; min-width: 220px; }
.search :deep(.v-field) { border-radius: 999px; }
.chip-count { margin-left: 8px; font-variant-numeric: tabular-nums; opacity: .7; }
:deep(.chip-on) { background: rgb(var(--v-theme-secondary-container)); color: rgb(var(--v-theme-on-secondary-container)); border-color: transparent; }
.list { display: grid; gap: 12px; }
.empty { display: grid; justify-items: center; gap: 8px; padding: 48px 24px; text-align: center; border-radius: var(--kw-r-l); background: rgb(var(--v-theme-surface-container-low)); }
.empty-ic { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; background: rgb(var(--v-theme-secondary-container)); color: rgb(var(--v-theme-on-secondary-container)); margin-bottom: 4px; }
@media (max-width: 599px) {
  .summary { padding: 16px; gap: 12px; }
  .summary-ic { width: 44px; height: 44px; }
  .search { flex: 1 1 100%; }
}
</style>
