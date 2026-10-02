<script setup lang="ts">
import { computed } from 'vue'
import type { Trip, TripStop } from '@/api/types'
import { clock } from '@/utils/format'

const props = defineProps<{ trip: Trip; now: number }>()
const emit = defineEmits<{ station: [id: string] }>()

interface Row {
  kind: 'stop' | 'now'
  index: number
  passed: boolean
  here?: boolean
  next?: boolean
}

/** Gdzie jest pociąg: z pozycji na żywo albo z czasów oczekiwanych. */
const where = computed<{ prev: number; moving: boolean } | null>(() => {
  const stops = props.trip.stops
  const pos = props.trip.position
  if (pos?.prev) {
    const prev = stops.findIndex((s) => s.seq === pos.prev!.seq)
    if (prev >= 0) return { prev, moving: !pos.dwelling }
  }
  if (props.trip.realtime.cancelled) return null
  const t = (s: (typeof stops)[number], kind: 'arr' | 'dep') => {
    const iso = kind === 'arr' ? (s.expectedArrival ?? s.arrival ?? s.expectedDeparture ?? s.departure) : (s.expectedDeparture ?? s.departure ?? s.expectedArrival ?? s.arrival)
    return iso ? new Date(iso).getTime() : NaN
  }
  if (props.now < t(stops[0], 'dep') - 60_000 || props.now > t(stops[stops.length - 1], 'arr') + 60_000) return null
  for (let i = 0; i < stops.length; i++) {
    if (props.now <= t(stops[i], 'dep')) return { prev: i, moving: false }
    if (i + 1 < stops.length && props.now < t(stops[i + 1], 'arr')) return { prev: i, moving: true }
  }
  return null
})

const finished = computed(() => {
  const last = props.trip.stops[props.trip.stops.length - 1]
  const iso = last.expectedArrival ?? last.arrival
  return !!iso && props.now > new Date(iso).getTime() + 60_000
})

const rows = computed<Row[]>(() => {
  const out: Row[] = []
  const w = where.value
  props.trip.stops.forEach((_, i) => {
    const passed = finished.value || (!!w && (i < w.prev || (i === w.prev && w.moving)))
    out.push({ kind: 'stop', index: i, passed, here: !!w && !w.moving && i === w.prev, next: !!w && w.moving && i === w.prev + 1 })
    if (w && w.moving && i === w.prev) out.push({ kind: 'now', index: i, passed: true })
  })
  return out
})

const speed = computed(() => props.trip.position?.speed ?? null)
const lastIndex = computed(() => props.trip.stops.length - 1)

/** Godzina planowa i — przy opóźnieniu — oczekiwana; pierwsza stacja nie ma przyjazdu, ostatnia odjazdu. */
function time(s: TripStop, i: number, kind: 'arr' | 'dep') {
  if ((kind === 'arr' && i === 0) || (kind === 'dep' && i === lastIndex.value)) return null
  const plan = kind === 'arr' ? (s.arrival ?? s.departure) : (s.departure ?? s.arrival)
  if (!plan) return null
  const delay = kind === 'arr' ? s.arrivalDelay : s.departureDelay
  const expected = kind === 'arr' ? s.expectedArrival : s.expectedDeparture
  return { plan: clock(plan), expected: delay && expected ? clock(expected) : null }
}

/** Postój w minutach według rozkładu (pokazujemy dopiero od 2 minut). */
function dwell(s: TripStop) {
  if (!s.arrival || !s.departure) return 0
  return Math.round((new Date(s.departure).getTime() - new Date(s.arrival).getTime()) / 60_000)
}

function details(s: TripStop, row: Row) {
  if (s.skipped) return ['bez postoju']
  const out: string[] = []
  if (s.platform) out.push(`peron ${s.platform}${s.track ? ` · tor ${s.track}` : ''}`)
  if (s.requestOnly) out.push('na żądanie')
  const d = dwell(s)
  if (d >= 2 && row.index !== 0 && row.index !== lastIndex.value) out.push(`postój ${d} min`)
  if (row.here) out.push('pociąg na stacji')
  return out
}
</script>

<template>
  <div class="tl-head text-label-small muted" aria-hidden="true">
    <span>przyj.</span><span>odj.</span>
  </div>
  <ol class="timeline" aria-label="Postoje pociągu">
    <li
      v-for="row in rows"
      :key="row.kind + row.index"
      class="tl"
      :class="{
        passed: row.passed,
        first: row.kind === 'stop' && row.index === 0,
        last: row.kind === 'stop' && row.index === lastIndex,
        terminal: row.kind === 'stop' && (row.index === 0 || row.index === lastIndex),
        skipped: row.kind === 'stop' && trip.stops[row.index].skipped,
        here: row.here,
        next: row.next,
        now: row.kind === 'now',
      }"
    >
      <template v-if="row.kind === 'stop'">
        <template v-for="s in [trip.stops[row.index]]" :key="s.seq">
          <span v-for="kind in (['arr', 'dep'] as const)" :key="kind" class="tl-time tnum">
            <template v-for="t in [time(s, row.index, kind)]" :key="kind">
              <template v-if="t">
                <span class="text-body-medium" :class="{ was: t.expected }">
                  <span class="sr-only">{{ kind === 'arr' ? 'przyjazd' : 'odjazd' }} </span>{{ t.plan }}
                </span>
                <span v-if="t.expected" class="late text-body-small">{{ t.expected }}</span>
              </template>
            </template>
          </span>
          <span class="tl-rail" aria-hidden="true"><i /></span>
          <button class="tl-stn" type="button" @click="emit('station', s.station.id)">
            <span class="tl-name ellipsis">{{ s.station.name }}</span>
            <span v-if="row.next" class="tl-flag text-label-small">następna stacja</span>
            <span v-if="details(s, row).length" class="text-body-small muted">{{ details(s, row).join(' · ') }}</span>
          </button>
        </template>
      </template>
      <template v-else>
        <span class="tl-time" /><span class="tl-time" />
        <span class="tl-rail" aria-hidden="true"><b><v-icon :icon="trip.isBus ? 'directions_bus-fill' : 'train-fill'" size="16" /></b></span>
        <span class="tl-stn tl-here text-body-medium">{{ trip.isBus ? 'Autobus' : 'Pociąg' }} jest tutaj<template v-if="speed"> · {{ speed }} km/h</template></span>
      </template>
    </li>
  </ol>
</template>

<style scoped>
.tl-head, .tl { display: grid; grid-template-columns: 44px 44px 28px minmax(0, 1fr); column-gap: 6px; padding: 0 16px 0 12px; }
.tl-head { padding-top: 12px; }
.tl-head span { text-align: right; }
.timeline { list-style: none; margin: 0; padding: 0 0 16px; }
.tl { min-height: 56px; }
.tl-time { display: grid; align-content: center; justify-items: end; color: rgb(var(--v-theme-on-surface)); }
.tl-time .text-body-medium { font-weight: 500; }

/* linia trasy: przejechany odcinek w kolorze głównym, pozostały w neutralnym */
.tl-rail { position: relative; }
.tl-rail::before { content: ''; position: absolute; left: 12px; top: 0; bottom: 0; width: 4px; background: rgb(var(--v-theme-outline-variant)); }
.tl.first .tl-rail::before { top: 50%; }
.tl.last .tl-rail::before { bottom: 50%; }
.tl.passed .tl-rail::before { background: rgb(var(--v-theme-primary)); }

/* punkty postoju */
.tl-rail i { position: absolute; left: 7px; top: 50%; width: 14px; height: 14px; margin-top: -7px; border-radius: 50%; border: 3px solid rgb(var(--v-theme-outline)); background: rgb(var(--v-theme-surface)); }
.tl.passed .tl-rail i { border-color: rgb(var(--v-theme-primary)); background: rgb(var(--v-theme-primary)); }
.tl.terminal .tl-rail i { left: 4px; width: 20px; height: 20px; margin-top: -10px; border-width: 5px; border-color: rgb(var(--v-theme-primary)); }
.tl.skipped .tl-rail i { left: 10px; width: 8px; height: 8px; margin-top: -4px; border-width: 2px; border-color: rgb(var(--v-theme-outline-variant)); }
.tl.here .tl-rail i, .tl.next .tl-rail i { border-color: rgb(var(--v-theme-primary)); box-shadow: 0 0 0 4px color-mix(in srgb, rgb(var(--v-theme-primary)) 20%, transparent); }

/* nazwy: przejechane wyciszone, krańcowe i następna pogrubione */
.tl-stn { display: grid; align-content: center; justify-items: start; min-width: 0; padding: 6px 0; border: 0; background: none; text-align: left; color: inherit; cursor: pointer; font: inherit; }
.tl-name { max-width: 100%; font-size: 16px; line-height: 24px; }
.tl.terminal .tl-name, .tl.next .tl-name, .tl.here .tl-name { font-weight: 600; }
button.tl-stn:hover .tl-name, button.tl-stn:focus-visible .tl-name { color: rgb(var(--v-theme-primary)); text-decoration: underline; }
.tl.passed .tl-name, .tl.passed .tl-time { color: rgb(var(--v-theme-on-surface-variant)); }
.tl.passed .tl-time .text-body-medium { font-weight: 400; }
.tl.skipped .tl-name, .tl.skipped .tl-time { color: rgb(var(--v-theme-on-surface-variant)); opacity: .7; }
.tl-flag { padding: 0 6px; border-radius: 6px; background: rgb(var(--v-theme-primary-container)); color: rgb(var(--v-theme-on-primary-container)); }

.tl.now { min-height: 44px; }
.tl.now .tl-rail::before { background: linear-gradient(rgb(var(--v-theme-primary)) 50%, rgb(var(--v-theme-outline-variant)) 50%); }
.tl-rail b { position: absolute; left: 1px; top: 50%; width: 26px; height: 26px; margin-top: -13px; border-radius: 50%; display: grid; place-items: center; background: rgb(var(--v-theme-primary)); color: rgb(var(--v-theme-on-primary)); }
.tl-here { color: rgb(var(--v-theme-primary)); font-weight: 500; cursor: default; }

.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
