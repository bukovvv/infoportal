<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { Board } from '@/api/types'
import BtkHint from '@/components/BtkHint.vue'
import RouteBadge from '@/components/RouteBadge.vue'
import StationField from '@/components/StationField.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useStations } from '@/stores/data'
import { read, useUi, write } from '@/stores/ui'
import { clock, minutesUntil, relative } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const stations = useStations()
const ui = useUi()
const DEFAULT_STATION = '30601' // Poznań Główny

const stationId = ref<string | null>((route.params.stationId as string) || read<string | null>('kw_board_station', null) || DEFAULT_STATION)
const mode = ref<'dep' | 'arr'>(route.query.tryb === 'przyjazdy' ? 'arr' : 'dep')
const board = ref<Board | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)
const now = ref(Date.now())
const locating = ref(false)

const station = computed(() => (stationId.value ? stations.byId.get(stationId.value) : undefined))

async function load(silent = false) {
  if (!stationId.value) return
  if (!silent) loading.value = true
  try {
    board.value = await api.board(stationId.value, mode.value, 16)
    error.value = null
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
    now.value = Date.now()
  }
}

watch([stationId, mode], ([id]) => {
  if (!id) return
  write('kw_board_station', id)
  void router.replace({ name: 'board', params: { stationId: id }, query: mode.value === 'arr' ? { tryb: 'przyjazdy' } : {} })
  void load()
})
watch(() => route.params.stationId, (id) => { if (id && id !== stationId.value) stationId.value = id as string })

let timer: number | undefined
onMounted(() => {
  void stations.load()
  void load()
  timer = window.setInterval(() => void load(true), 30_000)
})
onBeforeUnmount(() => window.clearInterval(timer))

function nearest() {
  if (!navigator.geolocation) { ui.notify('Przeglądarka nie udostępnia lokalizacji. Wybierz stację z listy.'); return }
  locating.value = true
  navigator.geolocation.getCurrentPosition((p) => {
    locating.value = false
    const kx = Math.cos((p.coords.latitude * Math.PI) / 180)
    const best = stations.list.reduce<{ id: string; name: string; d: number } | null>((acc, s) => {
      const d = (s.lat - p.coords.latitude) ** 2 + ((s.lon - p.coords.longitude) * kx) ** 2
      return !acc || d < acc.d ? { id: s.id, name: s.name, d } : acc
    }, null)
    if (best) {
      stationId.value = best.id
      ui.notify(`Najbliższa stacja KW: ${best.name}`)
    }
  }, (err) => {
    locating.value = false
    ui.notify(err.code === 1 ? 'Zezwól na dostęp do lokalizacji, aby znaleźć najbliższą stację.' : 'Nie udało się ustalić lokalizacji. Wybierz stację z listy.')
  }, { timeout: 10_000, maximumAge: 300_000 })
}

const when = (iso: string) => {
  const m = minutesUntil(iso, now.value)
  return m < 60 ? relative(m) : ''
}
</script>

<template>
  <div class="page-narrow">
    <div class="board-head">
      <div class="row1">
        <StationField v-model="stationId" label="Stacja" icon="signpost" hide-details />
        <v-chip variant="outlined" prepend-icon="my_location" :disabled="locating" @click="nearest">{{ locating ? 'Szukam…' : 'Najbliższa stacja' }}</v-chip>
      </div>
      <div class="d-flex align-center justify-space-between flex-wrap ga-3">
        <v-btn-toggle v-model="mode" mandatory variant="outlined" divided density="comfortable" aria-label="Rodzaj tablicy">
          <v-btn value="dep" :prepend-icon="mode === 'dep' ? 'check' : undefined">Odjazdy</v-btn>
          <v-btn value="arr" :prepend-icon="mode === 'arr' ? 'check' : undefined">Przyjazdy</v-btn>
        </v-btn-toggle>
        <span v-if="board" class="text-body-small muted" aria-live="polite">{{ station?.name ?? board.station.name }} · stan na {{ clock(board.generatedAt) }}</span>
      </div>
    </div>

    <v-card color="surface-container-low" class="board">
      <v-progress-linear v-if="loading" indeterminate absolute />
      <v-empty-state v-if="error" icon="error" :title="error">
        <template #actions><v-btn variant="flat" color="secondary-container" @click="load()">Spróbuj ponownie</v-btn></template>
      </v-empty-state>
      <v-skeleton-loader v-else-if="!board" type="list-item-three-line@6" color="transparent" />
      <template v-else>
        <button
          v-for="row in board.rows"
          :key="row.key + row.scheduled"
          type="button"
          class="dep"
          :class="{ cancelled: row.cancelled }"
          @click="ui.openTrain({ key: row.key })"
        >
          <span class="dep-time tnum">
            <span class="t" :class="{ late: (row.delay ?? 0) >= 2 }">{{ clock((row.delay ?? 0) >= 2 ? row.expected : row.scheduled) }}</span>
            <span v-if="(row.delay ?? 0) >= 2" class="was text-body-small">{{ clock(row.scheduled) }}</span>
            <span v-else class="text-body-small muted">{{ when(row.expected ?? row.scheduled) }}</span>
          </span>
          <span class="dep-main">
            <span class="dest ellipsis">{{ mode === 'arr' ? 'z: ' : '' }}{{ mode === 'dep' ? row.destination : row.origin }}</span>
            <span v-if="row.via.length" class="text-body-small muted ellipsis">przez {{ row.via.join(', ') }}</span>
            <span class="d-flex align-center flex-wrap ga-2">
              <RouteBadge :route="row.route" :bus="row.isBus" />
              <span class="text-label-medium text-primary">KW {{ row.number }}</span>
              <StatusTag :delay="row.delay" :source="row.delaySource" :cancelled="row.cancelled" :skipped="row.skipped" />
            </span>
          </span>
          <span class="platform" :aria-label="row.platform ? `peron ${row.platform}${row.track ? ', tor ' + row.track : ''}` : 'peron nieznany'">
            <strong>{{ row.platform || '–' }}</strong><small>peron<template v-if="row.track"> · tor {{ row.track }}</template></small>
          </span>
        </button>
        <v-empty-state v-if="!board.rows.length" icon="departure_board" title="Brak kolejnych kursów KW" text="Z tej stacji nie odjeżdża dziś ani jutro rano żaden pociąg KW." />
      </template>
    </v-card>
    <p class="text-body-small muted mt-3 px-1">Tablica odświeża się co 30 sekund. Opóźnienia z systemu PKP PLK.</p>
    <BtkHint :stations="[station?.name ?? board?.station.name]" context="board" class="mt-4" />
  </div>
</template>

<style scoped>
.board-head { display: grid; gap: 16px; padding: 8px 0 16px; }
.row1 { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; }
.board { overflow: hidden; position: relative; }
.dep { display: grid; grid-template-columns: 64px minmax(0, 1fr) auto; gap: 16px; align-items: center; width: 100%; padding: 14px 16px; border: 0; background: transparent; text-align: left; color: inherit; cursor: pointer; font: inherit; }
.dep + .dep { border-top: 1px solid rgb(var(--v-theme-outline-variant)); }
.dep:hover { background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 6%, transparent); }
.dep:focus-visible { outline: 3px solid rgb(var(--v-theme-secondary)); outline-offset: -3px; }
.dep-time { display: grid; }
.dep-time .t { font-size: 22px; line-height: 28px; }
.dep-main { display: grid; gap: 4px; min-width: 0; }
.dest { font-size: 16px; line-height: 24px; font-weight: 500; }
.platform { display: grid; justify-items: center; min-width: 52px; padding: 4px 10px; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-surface-container-highest)); }
.platform strong { font-size: 18px; line-height: 22px; font-weight: 500; }
.platform small { font-size: 11px; line-height: 14px; color: rgb(var(--v-theme-on-surface-variant)); white-space: nowrap; }
.cancelled .t, .cancelled .dest { text-decoration: line-through; color: rgb(var(--v-theme-on-surface-variant)); }
@media (max-width: 839px) {
  .row1 { grid-template-columns: minmax(0, 1fr); }
  .row1 .v-chip { justify-self: start; }
  .dep { grid-template-columns: 56px minmax(0, 1fr) auto; gap: 12px; padding: 12px; }
}
</style>
