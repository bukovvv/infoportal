<script setup lang="ts">
/**
 * Porównanie dwóch dni rozkładu (tylko podgląd /nowyrj27): dzień starego i nowego rozkładu jazdy —
 * pociągi, km i stacje według przewoźników, pociągi w ruchu w każdej godzinie, stacje z największą zmianą,
 * nowe i znikające numery, pociągi bezpośrednie w wybranej relacji.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, type Compare, type CompareRoute, type CompareSide } from '@/api/client'
import DateField from '@/components/DateField.vue'
import StationField from '@/components/StationField.vue'
import { agencyName } from '@/utils/agency'
import { duration } from '@/utils/format'

const route = useRoute()
const router = useRouter()

/** Gotowe pary dni: ten sam dzień tygodnia przed i po zmianie rozkładu (13.12.2026). */
const PRESETS = [
  { label: 'Dzień roboczy', old: '2026-12-08', new: '2026-12-15' },
  { label: 'Piątek', old: '2026-12-11', new: '2026-12-18' },
  { label: 'Sobota', old: '2026-12-05', new: '2026-12-19' },
  { label: 'Niedziela', old: '2026-12-06', new: '2026-12-13' },
]

const oldDate = ref((route.query.stary as string) || PRESETS[0].old)
const newDate = ref((route.query.nowy as string) || PRESETS[0].new)
const data = ref<Compare | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)

async function load() {
  loading.value = true
  error.value = null
  void router.replace({ query: { ...route.query, stary: oldDate.value, nowy: newDate.value } })
  try {
    data.value = await api.compare(oldDate.value, newDate.value)
  } catch (e) {
    error.value = (e as Error).message
    data.value = null
  } finally {
    loading.value = false
  }
  if (from.value && to.value) void loadRoute()
}
watch([oldDate, newDate], load, { immediate: true })

function preset(p: (typeof PRESETS)[number]) {
  oldDate.value = p.old
  newDate.value = p.new
}
const activePreset = computed(() => PRESETS.find((p) => p.old === oldDate.value && p.new === newDate.value)?.label)

const fmtDate = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'long' })
const num = (n: number | null | undefined) => (n ?? 0).toLocaleString('pl-PL')
/** Zmiana procentowa: „+13,2%”, „−0,3%”, „bez zmian”; null — brak bazy (0). */
function pct(oldN: number | null, newN: number | null): string | null {
  if (!oldN || newN === null) return null
  const p = ((newN - oldN) / oldN) * 100
  if (Math.abs(p) < 0.05) return 'bez zmian'
  return `${p > 0 ? '+' : '−'}${Math.abs(p).toLocaleString('pl-PL', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`
}
/** 1 — zmiana na plus (zielona), −1 — na minus; invert: mniej znaczy lepiej (autobusy zastępcze). */
const trend = (oldN: number | null, newN: number | null, invert = false) =>
  (!oldN || newN === null || newN === oldN ? 0 : (newN > oldN) !== invert ? 1 : -1)
const arrow = (oldN: number | null, newN: number | null) => (!oldN || newN === null || newN === oldN ? null : newN > oldN ? 'trending_up' : 'trending_down')

const METRICS: { key: keyof CompareSide; label: string; unit?: string; invert?: boolean }[] = [
  { key: 'trains', label: 'Pociągi' },
  { key: 'km', label: 'Pociągokilometry', unit: 'km' },
  { key: 'stations', label: 'Obsługiwane stacje' },
  { key: 'calls', label: 'Postoje pociągów' },
  { key: 'speed', label: 'Średnia prędkość', unit: 'km/h' },
  { key: 'buses', label: 'Autobusy zastępcze', invert: true },
]

// wykres: pociągi w ruchu w każdej godzinie (o pełnej godzinie + 30 min)
const W = 720
const H = 220
const PAD = { l: 36, r: 12, t: 12, b: 26 }
const hover = ref<number | null>(null)
const chart = computed(() => {
  const hours = data.value?.hours ?? []
  const max = Math.max(1, ...hours.flatMap((h) => [h.old, h.new]))
  const step = max > 400 ? 100 : max > 200 ? 50 : max > 80 ? 20 : 10
  const top = Math.ceil(max / step) * step
  const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / 23
  const y = (v: number) => H - PAD.b - (v * (H - PAD.t - PAD.b)) / top
  const line = (key: 'old' | 'new') => hours.map((h, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(h[key]).toFixed(1)}`).join('')
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step)
  return { hours, x, y, ticks, old: line('old'), new: line('new'), colW: (W - PAD.l - PAD.r) / 23 }
})
const hovered = computed(() => (hover.value === null ? null : chart.value.hours[hover.value]))

// relacja: pociągi bezpośrednie A → B
const from = ref<string | null>((route.query.z as string) || null)
const to = ref<string | null>((route.query.do as string) || null)
const routeData = ref<CompareRoute | null>(null)
const routeError = ref<string | null>(null)
const routeLoading = ref(false)
async function loadRoute() {
  if (!from.value || !to.value) return
  routeLoading.value = true
  routeError.value = null
  void router.replace({ query: { ...route.query, z: from.value, do: to.value } })
  try {
    routeData.value = await api.compareRoute(oldDate.value, newDate.value, from.value, to.value)
  } catch (e) {
    routeError.value = (e as Error).message
    routeData.value = null
  } finally {
    routeLoading.value = false
  }
}
function swap() {
  ;[from.value, to.value] = [to.value, from.value]
  void loadRoute()
}

const numbersOpen = ref<string | null>(null)
</script>

<template>
  <div class="page compare">
    <header class="intro">
      <h1 class="text-headline-small">Porównanie rozkładów</h1>
      <p class="text-body-large muted">KW, POLREGIO i PKP Intercity w całej Polsce — dzień starego i nowego rozkładu (zmiana 13 grudnia 2026).</p>
    </header>

    <v-card color="surface-container-low" class="mb-4">
      <v-card-text class="pickers">
        <div class="presets" role="group" aria-label="Gotowe pary dni">
          <v-chip v-for="p in PRESETS" :key="p.label" :variant="activePreset === p.label ? 'flat' : 'outlined'" :color="activePreset === p.label ? 'secondary-container' : undefined" @click="preset(p)">{{ p.label }}</v-chip>
        </div>
        <div class="dates">
          <DateField v-model="oldDate" label="Stary rozkład" density="compact" />
          <v-icon icon="arrow_forward" class="muted" />
          <DateField v-model="newDate" label="Nowy rozkład" density="compact" />
        </div>
      </v-card-text>
    </v-card>

    <v-alert v-if="error" color="error-container" icon="error" class="mb-4">{{ error }}</v-alert>
    <v-skeleton-loader v-else-if="loading && !data" type="card, card" color="transparent" />

    <template v-if="data">
      <!-- najważniejsze liczby -->
      <section class="tiles" aria-label="Podsumowanie" :class="{ dim: loading }">
        <div v-for="m in METRICS" :key="m.key" class="tile card">
          <p class="text-label-large muted">{{ m.label }}</p>
          <p class="big">{{ num(data.total.new[m.key]) }}<span v-if="m.unit" class="unit"> {{ m.unit }}</span></p>
          <p class="text-body-small">
            <span class="delta" :class="'t' + trend(data.total.old[m.key], data.total.new[m.key], m.invert)">
              <v-icon v-if="arrow(data.total.old[m.key], data.total.new[m.key])" :icon="arrow(data.total.old[m.key], data.total.new[m.key])!" size="16" />
              {{ pct(data.total.old[m.key], data.total.new[m.key]) ?? '—' }}
            </span>
            <span class="muted"> · było {{ num(data.total.old[m.key]) }}</span>
          </p>
        </div>
      </section>

      <!-- przewoźnicy -->
      <section class="card block" aria-labelledby="ag-title">
        <h2 id="ag-title" class="text-title-large">Według przewoźników</h2>
        <div class="table-wrap">
          <table class="ag-table">
            <thead>
              <tr><th scope="col">Przewoźnik</th><th v-for="m in METRICS.slice(0, 5)" :key="m.key" scope="col">{{ m.label }}</th></tr>
            </thead>
            <tbody>
              <tr v-for="a in data.agencies" :key="a.agency">
                <th scope="row">{{ agencyName(a.agency) }}</th>
                <td v-for="m in METRICS.slice(0, 5)" :key="m.key">
                  <span class="cell-new">{{ num(a.new[m.key]) }}</span>
                  <span class="delta" :class="'t' + trend(a.old[m.key], a.new[m.key])">{{ pct(a.old[m.key], a.new[m.key]) ?? '' }}</span>
                  <span class="cell-old muted">było {{ num(a.old[m.key]) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- pociągi w ruchu w ciągu doby -->
      <section class="card block" aria-labelledby="h-title">
        <div class="block-head">
          <h2 id="h-title" class="text-title-large">Pociągi w ruchu w ciągu doby</h2>
          <div class="legend text-body-small">
            <span><i class="sw old" /> stary · {{ fmtDate(data.old) }}</span>
            <span><i class="sw new" /> nowy · {{ fmtDate(data.new) }}</span>
          </div>
        </div>
        <div class="chart" @mouseleave="hover = null">
          <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Liczba pociągów w drodze o każdej godzinie, stary i nowy rozkład">
            <g class="grid">
              <g v-for="t in chart.ticks" :key="t">
                <line :x1="PAD.l" :x2="W - PAD.r" :y1="chart.y(t)" :y2="chart.y(t)" />
                <text :x="PAD.l - 6" :y="chart.y(t) + 4" text-anchor="end">{{ t }}</text>
              </g>
              <text v-for="h in [0, 3, 6, 9, 12, 15, 18, 21]" :key="h" :x="chart.x(h)" :y="H - 8" text-anchor="middle">{{ h }}:30</text>
            </g>
            <line v-if="hover !== null" class="cross" :x1="chart.x(hover)" :x2="chart.x(hover)" :y1="PAD.t" :y2="H - PAD.b" />
            <path :d="chart.old" class="ln old" />
            <path :d="chart.new" class="ln new" />
            <template v-if="hovered && hover !== null">
              <circle :cx="chart.x(hover)" :cy="chart.y(hovered.old)" r="4" class="dot old" />
              <circle :cx="chart.x(hover)" :cy="chart.y(hovered.new)" r="4" class="dot new" />
            </template>
            <rect
              v-for="(h, i) in chart.hours" :key="h.hour"
              :x="chart.x(i) - chart.colW / 2" :y="PAD.t" :width="chart.colW" :height="H - PAD.t - PAD.b"
              fill="transparent" @mouseenter="hover = i" @touchstart.passive="hover = i"
            />
          </svg>
          <div v-if="hovered && hover !== null" class="tip" :style="{ left: `${(chart.x(hover) / W) * 100}%` }">
            <strong>{{ hovered.hour }}:30</strong>
            <span>nowy <b>{{ hovered.new }}</b></span>
            <span class="muted">stary {{ hovered.old }}</span>
          </div>
        </div>
        <details class="mt-2">
          <summary class="text-body-small muted">Tabela</summary>
          <table class="hours-table text-body-small">
            <tr><th>Godzina</th><th>Stary</th><th>Nowy</th></tr>
            <tr v-for="h in data.hours" :key="h.hour"><td>{{ h.hour }}:30</td><td>{{ h.old }}</td><td>{{ h.new }}</td></tr>
          </table>
        </details>
      </section>

      <!-- stacje -->
      <div class="two">
        <section v-for="side in (['up', 'down'] as const)" :key="side" class="card block" :aria-labelledby="`st-${side}`">
          <h2 :id="`st-${side}`" class="text-title-large">{{ side === 'up' ? 'Najwięcej zyskały' : 'Najwięcej straciły' }}</h2>
          <p class="text-body-small muted">Postoje pociągów na stacji w ciągu dnia.</p>
          <ol class="st-list">
            <li v-for="s in data.stations[side]" :key="s.id">
              <router-link :to="{ name: 'board', params: { stationId: s.id }, query: { data: newDate } }">{{ s.name }}</router-link>
              <span class="muted">{{ s.old }} → {{ s.new }}</span>
              <span class="delta" :class="side === 'up' ? 't1' : 't-1'">{{ s.diff > 0 ? '+' : '−' }}{{ Math.abs(s.diff) }}</span>
            </li>
          </ol>
        </section>
      </div>
      <section v-if="data.stations.opened.length || data.stations.closed.length" class="card block">
        <h2 class="text-title-large">Stacje nowe i bez obsługi</h2>
        <p class="text-body-small muted">Stacje, na których tego dnia staje pociąg tylko w jednym z rozkładów (także zamknięcia i objazdy).</p>
        <div v-for="side in (['opened', 'closed'] as const)" :key="side" class="mt-3">
          <p class="text-label-large">{{ side === 'opened' ? 'Tylko w nowym' : 'Tylko w starym' }} · {{ data.stations[side].length }}</p>
          <div class="chips">
            <v-chip v-for="s in data.stations[side]" :key="s.id" size="small" variant="outlined" :to="{ name: 'board', params: { stationId: s.id }, query: { data: side === 'opened' ? newDate : oldDate } }">
              {{ s.name }} · {{ side === 'opened' ? s.new : s.old }}
            </v-chip>
          </div>
        </div>
      </section>

      <!-- relacja -->
      <section class="card block" aria-labelledby="r-title">
        <h2 id="r-title" class="text-title-large">Relacja</h2>
        <p class="text-body-small muted">Pociągi bezpośrednie między dwiema stacjami w oba dni.</p>
        <div class="route-fields">
          <StationField v-model="from" label="Skąd" icon="trip_origin" hide-details density="compact" />
          <v-btn icon="swap_horiz" variant="text" aria-label="Zamień stacje" @click="swap" />
          <StationField v-model="to" label="Dokąd" icon="location_on" hide-details density="compact" />
          <v-btn color="primary" :loading="routeLoading" :disabled="!from || !to" @click="loadRoute">Porównaj</v-btn>
        </div>
        <v-alert v-if="routeError" color="error-container" icon="error" density="compact" class="mt-3">{{ routeError }}</v-alert>
        <div v-if="routeData" class="two mt-3">
          <div v-for="side in (['old', 'new'] as const)" :key="side" class="route-side">
            <p class="text-label-large">{{ side === 'old' ? 'Stary' : 'Nowy' }} · {{ fmtDate(routeData[side].date) }}</p>
            <p class="route-sum">
              <span class="big">{{ routeData[side].count }}</span>
              <span>bezpośrednich<template v-if="side === 'new'"> <span class="delta" :class="'t' + trend(routeData.old.count, routeData.new.count)">{{ pct(routeData.old.count, routeData.new.count) ?? '' }}</span></template></span>
            </p>
            <p v-if="routeData[side].fastest !== null" class="text-body-medium">
              najszybciej {{ duration(routeData[side].fastest!) }} · średnio {{ duration(routeData[side].average!) }}
            </p>
            <ul class="r-list text-body-medium">
              <li v-for="(t, i) in routeData[side].trains" :key="i">
                <span class="time">{{ t.dep }}–{{ t.arr }}</span>
                <span class="muted">{{ t.agency }} {{ t.number }}<template v-if="t.bus"> · autobus</template></span>
                <span class="dur">{{ duration(t.minutes) }}</span>
              </li>
              <li v-if="!routeData[side].trains.length" class="muted">Brak pociągów bezpośrednich.</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- numery pociągów -->
      <section class="card block" aria-labelledby="n-title">
        <h2 id="n-title" class="text-title-large">Numery pociągów</h2>
        <p class="text-body-small muted">Numer tylko w jednym z dni — nowy pociąg, zmiana numeru albo kurs w inne dni tygodnia.</p>
        <div v-for="n in data.numbers" :key="n.agency" class="num-row">
          <p class="text-title-small">{{ agencyName(n.agency) }}</p>
          <p class="text-body-medium">
            {{ n.kept }} bez zmian · <span class="delta t1">+{{ n.addedCount }} nowych</span> · <span class="delta t-1">−{{ n.removedCount }} znika</span>
          </p>
          <v-btn variant="text" size="small" :append-icon="numbersOpen === n.agency ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" @click="numbersOpen = numbersOpen === n.agency ? null : n.agency">
            {{ numbersOpen === n.agency ? 'Zwiń' : 'Pokaż listy' }}
          </v-btn>
          <div v-if="numbersOpen === n.agency" class="two">
            <div v-for="side in (['added', 'removed'] as const)" :key="side">
              <p class="text-label-large">{{ side === 'added' ? 'Nowe' : 'Znikające' }}<template v-if="n[side].length < n[side === 'added' ? 'addedCount' : 'removedCount']"> (pierwsze {{ n[side].length }})</template></p>
              <ul class="r-list text-body-small">
                <li v-for="t in n[side]" :key="t.number">
                  <span class="time">{{ t.dep }}</span>
                  <span><b>{{ t.number }}</b><template v-if="t.name"> {{ t.name }}</template> <span class="muted">{{ t.from }} → {{ t.to }}</span></span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      <p class="text-body-small muted">Dane: GTFS polish_trains (mkuran.pl) według PKP PLK. Kurs liczy się do dnia, w którym rusza. Pociągokilometry z kilometrażu rozkładu, średnia prędkość = km / czas od pierwszego odjazdu do ostatniego przyjazdu.</p>
    </template>
  </div>
</template>

<style scoped>
.intro { margin: 8px 0 16px; display: grid; gap: 4px; }
.pickers { display: grid; gap: 12px; }
.presets { display: flex; flex-wrap: wrap; gap: 8px; }
.dates { display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; align-items: center; max-width: 560px; }
.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; transition: opacity .2s; }
.tiles.dim { opacity: .5; }
.tile { padding: 14px 16px; border-radius: var(--kw-r-m); display: grid; gap: 2px; }
.big { font-size: 1.9rem; font-weight: 800; line-height: 1.15; font-variant-numeric: tabular-nums; }
.unit { font-size: 1rem; font-weight: 600; }
.delta { display: inline-flex; align-items: center; gap: 2px; font-weight: 700; font-variant-numeric: tabular-nums; }
.delta.t1 { color: rgb(var(--v-theme-success)); }
.delta.t-1 { color: rgb(var(--v-theme-error)); }
.block { padding: 16px 20px; margin-bottom: 16px; display: grid; gap: 6px; }
.block-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; align-items: baseline; }
.table-wrap { overflow-x: auto; }
.ag-table { border-collapse: collapse; width: 100%; min-width: 640px; }
.ag-table th, .ag-table td { text-align: left; padding: 10px 12px 10px 0; vertical-align: top; border-bottom: 1px solid rgb(var(--v-theme-outline-variant)); }
.ag-table thead th { font-weight: 600; color: rgb(var(--v-theme-on-surface-variant)); font-size: .8rem; }
.ag-table td { font-variant-numeric: tabular-nums; }
.ag-table td > span { display: block; }
.cell-new { font-weight: 700; font-size: 1.05rem; }
.cell-old { font-size: .8rem; }
.legend { display: flex; gap: 16px; flex-wrap: wrap; }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.sw { display: inline-block; width: 18px; height: 0; border-top: 2px solid; }
.sw.old { border-color: rgb(var(--v-theme-outline)); border-top-style: dashed; }
.sw.new { border-color: rgb(var(--v-theme-primary)); }
.chart { position: relative; }
.chart svg { width: 100%; height: auto; display: block; touch-action: pan-y; }
.grid line { stroke: rgb(var(--v-theme-outline-variant)); stroke-width: 1; }
.grid text { fill: rgb(var(--v-theme-on-surface-variant)); font-size: 11px; font-variant-numeric: tabular-nums; }
.cross { stroke: rgb(var(--v-theme-outline)); stroke-width: 1; }
.ln { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.ln.old { stroke: rgb(var(--v-theme-outline)); stroke-dasharray: 5 4; }
.ln.new { stroke: rgb(var(--v-theme-primary)); }
.dot { stroke: rgb(var(--v-theme-surface)); stroke-width: 2; }
.dot.old { fill: rgb(var(--v-theme-outline)); }
.dot.new { fill: rgb(var(--v-theme-primary)); }
.tip {
  position: absolute; top: 0; transform: translateX(-50%); pointer-events: none; display: grid; gap: 1px;
  padding: 6px 10px; border-radius: var(--kw-r-s, 8px); font-size: .8rem; white-space: nowrap;
  background: rgb(var(--v-theme-inverse-surface)); color: rgb(var(--v-theme-on-inverse-surface));
}
.tip .muted { color: inherit; opacity: .75; }
.hours-table { border-collapse: collapse; margin-top: 6px; }
.hours-table th, .hours-table td { padding: 2px 16px 2px 0; text-align: left; font-variant-numeric: tabular-nums; }
.two { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.two > .block { margin-bottom: 0; }
.two:has(> .block) { margin-bottom: 16px; }
.st-list { list-style: none; padding: 0; margin: 4px 0 0; display: grid; }
.st-list li { display: grid; grid-template-columns: 1fr auto 56px; gap: 12px; padding: 7px 0; border-bottom: 1px solid rgb(var(--v-theme-outline-variant)); font-variant-numeric: tabular-nums; }
.st-list li:last-child { border-bottom: 0; }
.st-list a { color: inherit; text-decoration: none; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.st-list a:hover { text-decoration: underline; }
.st-list .delta { justify-content: flex-end; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.route-fields { display: grid; grid-template-columns: 1fr auto 1fr auto; gap: 8px; align-items: center; margin-top: 6px; }
.route-side { display: grid; gap: 4px; align-content: start; }
.route-sum { display: flex; align-items: baseline; gap: 8px; }
.route-sum .delta { margin-left: 6px; }
.r-list { list-style: none; padding: 0; margin: 6px 0 0; max-height: 360px; overflow-y: auto; }
.r-list li { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; padding: 5px 0; border-bottom: 1px solid rgb(var(--v-theme-outline-variant)); font-variant-numeric: tabular-nums; }
.time { font-weight: 700; }
.num-row { padding: 10px 0; border-bottom: 1px solid rgb(var(--v-theme-outline-variant)); display: grid; gap: 4px; justify-items: start; }
.num-row:last-child { border-bottom: 0; }
.num-row .two { width: 100%; }
@media (max-width: 599px) {
  .route-fields { grid-template-columns: 1fr auto; }
  .route-fields > :nth-child(3) { grid-column: 1; }
  .route-fields > :nth-child(4) { grid-column: 1 / -1; }
  .block { padding: 14px 16px; }
  .big { font-size: 1.6rem; }
}
</style>
