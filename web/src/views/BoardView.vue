<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { Board, TrainMatch } from '@/api/types'
import BandHero from '@/components/BandHero.vue'
import BtkHint from '@/components/BtkHint.vue'
import DateField from '@/components/DateField.vue'
import RouteBadge from '@/components/RouteBadge.vue'
import StationField from '@/components/StationField.vue'
import StatusTag from '@/components/StatusTag.vue'
import TimeField from '@/components/TimeField.vue'
import { useStations, useStatus } from '@/stores/data'
import { MAX_FAVORITES, useFavorites } from '@/stores/favorites'
import { read, useUi, write } from '@/stores/ui'
import { agencyCode } from '@/utils/agency'
import { clock, dayLabel, minutesUntil, relative, splitNumbers, warsawNow, weekdayShort } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const stations = useStations()
const status = useStatus()
const ui = useUi()
const favorites = useFavorites()
const DEFAULT_STATION = '30601' // Poznań Główny

const stationId = ref<string | null>((route.params.stationId as string) || read<string | null>('kw_board_station', null) || DEFAULT_STATION)
const mode = ref<'dep' | 'arr'>(route.query.tryb === 'przyjazdy' ? 'arr' : 'dep')
const board = ref<Board | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)
const now = ref(Date.now())
const locating = ref(false)

const station = computed(() => (stationId.value ? stations.byId.get(stationId.value) : undefined))

// Wybrany dzień i godzina. Puste = „teraz” (tablica na żywo, pola pokazują bieżący czas).
// Zmiana jednego pola przypina oba — tablica pokazuje dokładnie to, co widać w polach.
const date = ref((route.query.data as string) || '')
const time = ref((route.query.godz as string) || '')
const pinned = computed(() => !!(date.value || time.value))
const current = computed(() => warsawNow(new Date(now.value)))
const dateField = computed({
  get: () => date.value || current.value.date,
  set: (v: string) => { time.value ||= current.value.time; date.value = v || current.value.date },
})
const timeField = computed({
  get: () => time.value || current.value.time,
  set: (v: string) => { date.value ||= current.value.date; time.value = v || '00:00' },
})
const range = computed(() => ({ min: status.status?.timetable.validFrom, max: status.status?.timetable.validUntil }))
const resetToNow = () => { date.value = ''; time.value = '' }

async function load(silent = false) {
  if (!stationId.value) return
  if (!silent) loading.value = true
  try {
    board.value = await api.board(stationId.value, mode.value, 16, pinned.value ? { date: date.value, time: time.value } : undefined)
    error.value = null
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
    now.value = Date.now()
  }
}

watch([stationId, mode, date, time], ([id]) => {
  if (!id) return
  write('kw_board_station', id)
  const query = { ...(mode.value === 'arr' ? { tryb: 'przyjazdy' } : {}), ...(pinned.value ? { data: date.value, godz: time.value } : {}) }
  void router.replace({ name: 'board', params: { stationId: id }, query })
  void load()
})
const favoriteStations = computed(() => favorites.ids.flatMap((id) => stations.byId.get(id) ?? []))
const isFavorite = computed(() => favorites.has(stationId.value))

function toggleFavorite() {
  const id = stationId.value
  if (!id) return
  const name = station.value?.name ?? 'Stacja'
  const index = favorites.ids.indexOf(id)
  const added = favorites.toggle(id)
  if (added === null) ui.notify(`Możesz mieć najwyżej ${MAX_FAVORITES} ulubionych stacji. Usuń którąś, żeby dodać nową.`)
  else if (added) ui.notify(`${name} w ulubionych. Znajdziesz ją też na stronie głównej.`)
  else ui.notify(`Usunięto ${name} z ulubionych`, { label: 'Cofnij', run: () => favorites.restore(id, index) })
}

watch(() => route.params.stationId, (id) => { if (id && id !== stationId.value) stationId.value = id as string })

let timer: number | undefined
onMounted(() => {
  void stations.load()
  void load()
  timer = window.setInterval(() => void load(true), 30_000)
})
onBeforeUnmount(() => window.clearInterval(timer))

/** Numer pociągu wpisany w pole stacji: strona wybranego kursu. */
function openTrain(t: TrainMatch) {
  void router.push({ name: 'train', params: { number: splitNumbers(t.number)[0] ?? t.number }, query: { kurs: t.key } })
}

function nearest() {
  if (!navigator.geolocation) { ui.notify('Przeglądarka nie udostępnia lokalizacji. Wybierz stację z listy.'); return }
  locating.value = true
  navigator.geolocation.getCurrentPosition((p) => {
    locating.value = false
    const kx = Math.cos((p.coords.latitude * Math.PI) / 180)
    const best = stations.all.reduce<{ id: string; name: string; d: number } | null>((acc, s) => {
      const d = (s.lat - p.coords.latitude) ** 2 + ((s.lon - p.coords.longitude) * kx) ** 2
      return !acc || d < acc.d ? { id: s.id, name: s.name, d } : acc
    }, null)
    if (best) {
      stationId.value = best.id
      ui.notify(`Najbliższa stacja: ${best.name}`)
    }
  }, (err) => {
    locating.value = false
    ui.notify(err.code === 1 ? 'Zezwól na dostęp do lokalizacji, aby znaleźć najbliższą stację.' : 'Nie udało się ustalić lokalizacji. Wybierz stację z listy.')
  }, { timeout: 10_000, maximumAge: 300_000 })
}

/** Pod godziną: dzień tygodnia, gdy kurs jest innego dnia niż tablica; na żywo — „za X min”. */
const when = (iso: string) => {
  if (iso.slice(0, 10) !== (date.value || current.value.date)) return weekdayShort(iso)
  if (pinned.value) return ''
  const m = minutesUntil(iso, now.value)
  return m < 60 ? relative(m) : ''
}
</script>

<template>
  <BandHero narrow>
    <div class="station-pick">
      <StationField v-model="stationId" label="Stacja lub numer pociągu" icon="search" hide-details variant="solo" flat trains class="station-field" @train="openTrain" />
      <button
        type="button"
        class="star-btn"
        :class="{ on: isFavorite }"
        :aria-label="isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'"
        :aria-pressed="isFavorite"
        :disabled="!stationId"
        @click="toggleFavorite"
      >
        <v-icon :icon="isFavorite ? 'star-fill' : 'star'" />
      </button>
    </div>
    <div class="band-chips" role="group" aria-label="Szybki wybór stacji">
      <button type="button" class="band-chip" :disabled="locating" @click="nearest"><v-icon icon="my_location" />{{ locating ? 'Szukam…' : 'Najbliższa' }}</button>
      <button
        v-for="s in favoriteStations"
        :key="s.id"
        type="button"
        class="band-chip"
        :aria-pressed="s.id === stationId"
        @click="stationId = s.id"
      >
        {{ s.name }}
      </button>
    </div>
  </BandHero>

  <div class="page-narrow board-page">
    <div class="board-head">
      <v-btn-toggle v-model="mode" mandatory variant="outlined" divided density="comfortable" aria-label="Rodzaj tablicy">
        <v-btn value="dep" :prepend-icon="mode === 'dep' ? 'check' : undefined">Odjazdy</v-btn>
        <v-btn value="arr" :prepend-icon="mode === 'arr' ? 'check' : undefined">Przyjazdy</v-btn>
      </v-btn-toggle>
      <div class="when-fields">
        <DateField v-model="dateField" label="Data" :min="range.min" :max="range.max" density="compact" variant="solo-filled" flat class="f-date" />
        <TimeField v-model="timeField" :label="mode === 'dep' ? 'Odjazdy od' : 'Przyjazdy od'" density="compact" variant="solo-filled" flat class="f-time" />
        <v-btn v-if="pinned" variant="text" prepend-icon="update" @click="resetToNow">Teraz</v-btn>
      </div>
    </div>
    <span v-if="board" class="text-body-small muted state-line" aria-live="polite">
      {{ station?.name ?? board.station.name }} ·
      <template v-if="pinned">rozkład na {{ dayLabel(date + 'T12:00:00') }}, od {{ time }}</template>
      <template v-else>na żywo, stan na {{ clock(board.generatedAt) }}</template>
    </span>

    <div class="board card">
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
            <span v-else class="countdown text-body-small">{{ when(row.expected ?? row.scheduled) }}</span>
          </span>
          <span class="dep-main">
            <span class="dest ellipsis">{{ mode === 'arr' ? 'z: ' : '' }}{{ mode === 'dep' ? row.destination : row.origin }}</span>
            <span v-if="row.via.length" class="text-body-small muted ellipsis">przez {{ row.via.join(', ') }}</span>
            <span class="d-flex align-center flex-wrap ga-2">
              <RouteBadge :route="row.route" :bus="row.isBus" />
              <span class="text-label-medium number">{{ agencyCode(row.agency) }} {{ row.number }}</span>
              <StatusTag :delay="row.delay" :source="row.delaySource" :cancelled="row.cancelled" :skipped="row.skipped" />
            </span>
          </span>
          <span class="platform" :aria-label="row.platform ? `peron ${row.platform}${row.track ? ', tor ' + row.track : ''}` : 'peron nieznany'">
            <strong>{{ row.platform || '–' }}</strong><small>peron<template v-if="row.track"> · tor {{ row.track }}</template></small>
          </span>
        </button>
        <v-empty-state v-if="!board.rows.length" icon="departure_board" title="Brak kolejnych kursów" :text="pinned ? 'W ciągu 24 godzin od wybranego czasu nie ma tu żadnego pociągu.' : 'W ciągu najbliższych 24 godzin nie ma tu żadnego pociągu.'" />
      </template>
    </div>
    <p class="text-body-small muted mt-3 px-1">Tablica odświeża się co 30 sekund. Opóźnienia z systemu PKP PLK.</p>
    <BtkHint :stations="[station?.name ?? board?.station.name]" context="board" class="mt-4" />
  </div>
</template>

<style scoped>
.station-pick { display: grid; grid-template-columns: minmax(0, 1fr) 56px; gap: 8px; align-items: center; }
.station-field :deep(.v-field) { background: rgb(var(--v-theme-surface)); color: rgb(var(--v-theme-on-surface)); }
.station-field :deep(input) { font-size: 17px; font-weight: 700; }
.star-btn {
  display: grid; place-items: center; height: 56px; border: 0; border-radius: var(--kw-r-m); cursor: pointer;
  background: color-mix(in srgb, rgb(var(--v-theme-on-band)) 14%, transparent); color: rgb(var(--v-theme-on-band));
}
.star-btn.on { color: #FFD45C; }
.star-btn:hover { background: color-mix(in srgb, rgb(var(--v-theme-on-band)) 22%, transparent); }
.star-btn:focus-visible { outline: 3px solid rgb(var(--v-theme-brand-red)); outline-offset: 2px; }
.star-btn:disabled { opacity: .5; cursor: default; }

.board-page { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr); padding-top: 0; }
.board-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.when-fields { display: flex; flex: 1 1 320px; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; }
/* DateField i TimeField mają okno jako korzeń: klasa trafia na pole, ale bez atrybutu tego widoku, stąd :deep */
.when-fields :deep(.f-date) { flex: 0 1 220px; min-width: 180px; }
.when-fields :deep(.f-time) { flex: 0 1 140px; min-width: 120px; }
.when-fields :deep(.v-field--variant-solo-filled) { background: rgb(var(--v-theme-surface)); }
.state-line { padding: 0 4px; }

.board { overflow: hidden; position: relative; }
.dep { display: grid; grid-template-columns: 62px minmax(0, 1fr) auto; gap: 14px; align-items: center; width: 100%; padding: 12px 14px 12px 16px; border: 0; background: transparent; text-align: left; color: inherit; cursor: pointer; font: inherit; }
.dep + .dep { border-top: 1px solid rgb(var(--v-theme-outline-variant)); }
.dep:hover { background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 6%, transparent); }
.dep:focus-visible { outline: 3px solid rgb(var(--v-theme-primary)); outline-offset: -3px; }
.dep-time { display: grid; gap: 1px; }
.dep-time .t { font-size: 22px; line-height: 26px; font-weight: 800; }
.dep-main { display: grid; gap: 3px; min-width: 0; }
.dest { font-size: 16px; line-height: 22px; font-weight: 700; }
.number { color: rgb(var(--v-theme-on-surface-variant)); font-weight: 700; }
.platform { display: grid; justify-items: center; min-width: 56px; padding: 6px 10px; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-surface-container)); }
.platform strong { font-size: 20px; line-height: 24px; font-weight: 800; }
.platform small { font-size: 11px; line-height: 14px; color: rgb(var(--v-theme-on-surface-variant)); white-space: nowrap; }
.cancelled .t, .cancelled .dest { text-decoration: line-through; color: rgb(var(--v-theme-on-surface-variant)); }
@media (max-width: 839px) {
  .board-head { align-items: stretch; }
  .when-fields { justify-content: flex-start; }
  .when-fields :deep(.f-date), .when-fields :deep(.f-time) { flex: 1 1 calc(50% - 4px); min-width: 0; }
  .dep { grid-template-columns: 56px minmax(0, 1fr) auto; gap: 12px; padding: 12px; }
}
</style>
