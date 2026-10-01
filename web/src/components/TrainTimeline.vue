<script setup lang="ts">
import { computed } from 'vue'
import type { Trip } from '@/api/types'
import { clock } from '@/utils/format'

const props = defineProps<{ trip: Trip; now: number }>()
const emit = defineEmits<{ station: [id: string] }>()

interface Row {
  kind: 'stop' | 'now'
  index: number
  passed: boolean
  here?: boolean
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
  props.trip.stops.forEach((_, i) => {
    const w = where.value
    const passed = finished.value || (!!w && (i < w.prev || (i === w.prev && w.moving)))
    out.push({ kind: 'stop', index: i, passed, here: !!w && !w.moving && i === w.prev })
    if (w && w.moving && i === w.prev) out.push({ kind: 'now', index: i, passed: true })
  })
  return out
})

const speed = computed(() => props.trip.position?.speed ?? null)
</script>

<template>
  <ol class="timeline" aria-label="Postoje pociągu">
    <li
      v-for="row in rows"
      :key="row.kind + row.index"
      class="tl"
      :class="{ passed: row.passed, first: row.kind === 'stop' && row.index === 0, last: row.kind === 'stop' && row.index === trip.stops.length - 1, now: row.kind === 'now' }"
    >
      <template v-if="row.kind === 'stop'">
        <span class="tl-time tnum">
          <template v-for="s in [trip.stops[row.index]]" :key="s.seq">
            <span :class="{ was: (row.index === 0 ? s.departureDelay : s.arrivalDelay) && !row.passed }" class="text-body-medium font-weight-medium">
              {{ clock(row.index === 0 ? s.departure : s.arrival) }}
            </span>
            <span
              v-if="!row.passed && (row.index === 0 ? s.expectedDeparture : s.expectedArrival) && (row.index === 0 ? s.departureDelay : s.arrivalDelay)"
              class="late text-body-small"
            >{{ clock(row.index === 0 ? s.expectedDeparture : s.expectedArrival) }}</span>
          </template>
        </span>
        <span class="tl-rail" aria-hidden="true"><i /></span>
        <button class="tl-stn" type="button" @click="emit('station', trip.stops[row.index].station.id)">
          <span class="tl-name ellipsis" :class="{ 'text-disabled': trip.stops[row.index].skipped }">{{ trip.stops[row.index].station.name }}</span>
          <span class="text-body-small muted">
            <template v-if="trip.stops[row.index].skipped">bez postoju</template>
            <template v-else-if="trip.stops[row.index].platform">peron {{ trip.stops[row.index].platform }}<template v-if="trip.stops[row.index].track"> · tor {{ trip.stops[row.index].track }}</template></template>
            <template v-else>{{ trip.stops[row.index].requestOnly ? 'na żądanie' : '' }}</template>
            <template v-if="row.here"> · pociąg na stacji</template>
          </span>
        </button>
      </template>
      <template v-else>
        <span class="tl-time" />
        <span class="tl-rail" aria-hidden="true"><b><v-icon :icon="trip.isBus ? 'directions_bus-fill' : 'train-fill'" size="16" /></b></span>
        <span class="tl-stn tl-here text-body-medium">{{ trip.isBus ? 'Autobus' : 'Pociąg' }} jest tutaj<template v-if="speed"> · {{ speed }} km/h</template></span>
      </template>
    </li>
  </ol>
</template>

<style scoped>
.timeline { list-style: none; margin: 0; padding: 8px 0 16px; }
.tl { display: grid; grid-template-columns: 64px 28px minmax(0, 1fr); column-gap: 8px; min-height: 56px; padding: 0 16px 0 8px; }
.tl-time { display: grid; align-content: center; justify-items: end; }
.tl-rail { position: relative; }
.tl-rail::before { content: ''; position: absolute; left: 13px; top: 0; bottom: 0; width: 2px; background: rgb(var(--v-theme-outline-variant)); }
.tl.first .tl-rail::before { top: 50%; }
.tl.last .tl-rail::before { bottom: 50%; }
.tl.passed .tl-rail::before { background: rgb(var(--v-theme-primary)); }
.tl-rail i { position: absolute; left: 7px; top: 50%; width: 14px; height: 14px; margin-top: -7px; border-radius: 50%; border: 2px solid rgb(var(--v-theme-outline)); background: rgb(var(--v-theme-surface)); }
.tl.passed .tl-rail i { border-color: rgb(var(--v-theme-primary)); background: rgb(var(--v-theme-primary)); }
.tl.first .tl-rail i, .tl.last .tl-rail i { border-color: rgb(var(--v-theme-primary)); }
.tl-stn { display: grid; align-content: center; min-width: 0; padding: 6px 0; border: 0; background: none; text-align: left; color: inherit; cursor: pointer; font: inherit; }
.tl-name { font-size: 16px; line-height: 24px; }
button.tl-stn:hover .tl-name, button.tl-stn:focus-visible .tl-name { color: rgb(var(--v-theme-primary)); text-decoration: underline; }
.tl.passed .tl-name { color: rgb(var(--v-theme-on-surface-variant)); }
.tl.now { min-height: 44px; }
.tl.now .tl-rail::before { background: linear-gradient(rgb(var(--v-theme-primary)) 50%, rgb(var(--v-theme-outline-variant)) 50%); }
.tl-rail b { position: absolute; left: 1px; top: 50%; width: 26px; height: 26px; margin-top: -13px; border-radius: 50%; display: grid; place-items: center; background: rgb(var(--v-theme-primary)); color: rgb(var(--v-theme-on-primary)); }
.tl-here { color: rgb(var(--v-theme-primary)); font-weight: 500; cursor: default; }
</style>
