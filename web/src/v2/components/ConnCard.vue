<script setup lang="ts">
import { computed } from 'vue'
import type { Connection } from '@/api/types'
import { useNotices } from '@/stores/data'
import { warsawNow } from '@/utils/format'
import { unusualVehicle, VEHICLE_KINDS } from '@/utils/vehicle'
import { depDelay, dur, minutesBetween, expArr, expDep, hm, inWords, lineOf, minutesFrom, plural, short, trainShort } from '../util'

// Połączenie na liście wyników (karta .pol z makiety): godziny, „za 12 min · +3 min”, pasek odcinków w kolorach linii
// (długość = czas jazdy), łańcuch pociągów z przesiadkami („Poznań Gł. · 8 min”), czas, peron, pojazd, utrudnienia.
const props = defineProps<{ c: Connection; selected?: boolean; now: number }>()
const notices = useNotices()

const delay = computed(() => depDelay(props.c))
const today = computed(() => props.c.departure.slice(0, 10) === warsawNow(new Date(props.now)).date)
const toGo = computed(() => minutesFrom(expDep(props.c), props.now))
const state = computed(() => {
  if (!today.value) return null
  if (toGo.value < 0) return { cls: 'neutr', text: 'odjechał' }
  return { cls: delay.value ? 'op' : toGo.value <= 60 ? 'ok' : 'neutr', text: inWords(toGo.value) + (delay.value ? ` · +${delay.value} min` : '') }
})
const alerts = computed(() => notices.forConnection(props.c).filter((n) => n.severity !== 'info'))
const platform = computed(() => props.c.legs[0].platform)
const separate = computed(() => props.c.legs.some((l) => l.agency === 'IC'))
const span = (a: string, b: string) => Math.max(1, minutesBetween(a, b))
/** pasek: odcinki jazdy i przerwy na przesiadki, szerokość według minut */
const parts = computed(() => props.c.legs.flatMap((l, i) => [
  ...(i ? [{ key: `w${i}`, wait: true, min: span(props.c.legs[i - 1].arrival, l.departure), color: '' }] : []),
  { key: l.key, wait: false, min: span(l.departure, l.arrival), color: lineOf(l).color },
]))
const vehicle = computed(() => props.c.legs.map((l) => l.vehicleType).find(unusualVehicle))
</script>

<template>
  <button type="button" class="pol" :aria-current="selected">
    <span class="g">
      <span class="godz">
        <s v-if="delay">{{ hm(c.departure) }}</s>
        <span>{{ hm(expDep(c)) }}</span><em>→</em><span>{{ hm(expArr(c)) }}</span>
      </span>
      <span v-if="state" class="znak" :class="state.cls">{{ state.text }}</span>
    </span>

    <span class="odcinki" aria-hidden="true">
      <i v-for="p in parts" :key="p.key" :class="{ czeka: p.wait }" :style="{ flexGrow: p.min, background: p.wait ? undefined : p.color }" />
    </span>
    <span class="lancuch">
      <template v-for="(l, i) in c.legs" :key="l.key">
        <span v-if="i" class="przes-pig"><v-icon icon="directions_walk" size="14" />{{ short(l.from.name) }} · {{ span(c.legs[i - 1].arrival, l.departure) }} min</span>
        <span class="lin" :style="{ '--c': lineOf(l).color }">{{ lineOf(l).badge === trainShort(l).split(' ')[0] ? trainShort(l) : `${lineOf(l).badge} · ${trainShort(l)}` }}</span>
      </template>
      <span v-if="c.legs.length === 1" class="dr">do {{ short(c.legs[0].headsign) }}</span>
    </span>

    <span class="meta">
      <span>{{ dur(c.durationMinutes) }}</span>
      <span>{{ c.legs.length === 1 ? 'bez przesiadek' : `${c.legs.length - 1} ${plural(c.legs.length - 1, 'przesiadka', 'przesiadki', 'przesiadek')}` }}</span>
      <span v-if="c.distanceKm">{{ c.distanceApprox ? 'ok. ' : '' }}{{ Math.round(c.distanceKm) }} km</span>
      <span v-if="platform">peron {{ platform }}</span>
      <span v-if="vehicle">{{ VEHICLE_KINDS[vehicle.kind].short }}</span>
      <span v-if="separate">osobny bilet</span>
    </span>
    <span v-if="alerts.length" class="kpas">
      <span class="kzn m" :class="alerts[0].severity === 'danger' ? 'pow' : 'utr'" aria-hidden="true">!</span>
      <b>{{ alerts[0].title }}</b>
      <em v-if="alerts.length > 1">i {{ alerts.length - 1 }} {{ plural(alerts.length - 1, 'kolejny', 'kolejne', 'kolejnych') }}</em>
    </span>
  </button>
</template>

<style scoped>
.odcinki { display: flex; gap: 3px; height: 6px; margin: 2px 0; }
.odcinki i { flex-basis: 0; min-width: 6px; border-radius: 3px; }
.odcinki i.czeka { background: repeating-linear-gradient(90deg, var(--tusz-2) 0 3px, transparent 3px 7px); opacity: .5; height: 2px; align-self: center; }
.lancuch { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; font-size: 13px; }
.lancuch .lin { color: var(--tusz); }
.przes-pig { display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 9px; border-radius: 12px; background: var(--papier); font-weight: 600; color: var(--tusz-2); white-space: nowrap; }
.pol[aria-current='true'] .przes-pig, .pol:hover .przes-pig { background: var(--plyta); }
</style>
