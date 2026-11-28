<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { Leg, Trip, TripStop } from '@/api/types'
import { VEHICLE_KINDS, vehicleAmenities } from '@/utils/vehicle'
import { dur, hm, lineOf, minutesBetween, plural, short, trainName, trainShort } from '../util'

// Jeden pociąg połączenia na własnej płycie: plakietka linii, numer i nazwa, kierunek i relacja całego pociągu,
// fakty (czas jazdy, km, przystanki, pojazd, udogodnienia), uwagi o biletach i postoje. Postoje z kursu (/trips):
// przyjazd i odjazd, peron i tor, postój, km od wsiadania; zanim kurs się wczyta — z danych wyszukiwarki.
const props = defineProps<{ leg: Leg; now: number }>()
const l = computed(() => props.leg)
const line = computed(() => lineOf(l.value))

// kursy wspólne dla wszystkich płyt (ten sam pociąg w kilku połączeniach pobieramy raz)
const trip = ref<Trip | null>(cache.get(props.leg.key) ?? null)
onMounted(async () => {
  if (trip.value) return
  try {
    const t = await api.trip(props.leg.key)
    cache.set(props.leg.key, t)
    trip.value = t
  } catch { /* kurs mógł zniknąć z rozkładu — zostają postoje z wyszukiwarki */ }
})

/** postoje od wsiadania do wysiadania (z kursu) albo null, gdy kurs nie wczytany lub stacje się nie zgadzają */
const rows = computed<TripStop[] | null>(() => {
  const st = trip.value?.stops
  if (!st) return null
  const i = st.findIndex((s) => s.station.id === l.value.from.id)
  const j = st.findIndex((s, x) => x > i && s.station.id === l.value.to.id)
  return i < 0 || j < 0 ? null : st.slice(i, j + 1)
})
const middle = computed(() => (rows.value ? rows.value.slice(1, -1) : (l.value.stops ?? [])).filter((s) => !s.skipped))
const open = ref(false)

const minutes = computed(() => minutesBetween(l.value.departure, l.value.arrival))
const vehicle = computed(() => l.value.vehicleType ?? trip.value?.vehicleType ?? null)
const relation = computed(() => (trip.value ? `${short(trip.value.origin)} – ${short(trip.value.destination)}` : ''))

const plus = (iso: string | null, d: number | null | undefined) => (iso ? new Date(new Date(iso).getTime() + (d ?? 0) * 60_000).toISOString() : null)
const past = (iso: string | null) => !!iso && new Date(iso).getTime() < props.now
/** wiersz postoju z kursu: godzina (z opóźnieniem), peron/tor, postój, km od wsiadania */
function row(s: TripStop, kind: 'p' | 'm' | 'k') {
  const planned = kind === 'k' ? s.arrival : s.departure ?? s.arrival
  const d = kind === 'k' ? s.arrivalDelay : s.departureDelay ?? s.arrivalDelay
  const dwell = kind === 'm' && s.arrival && s.departure ? minutesBetween(s.arrival, s.departure) : 0
  const km0 = rows.value?.[0].km
  return {
    key: `${s.seq}`,
    time: hm(plus(planned, d)),
    old: d ? hm(planned) : '',
    past: past(plus(planned, d)),
    name: short(s.station.name),
    sub: [s.skipped ? 'pociąg się tu nie zatrzyma' : '', s.requestOnly ? 'na żądanie' : '', s.platform ? `peron ${s.platform}${s.track ? ` · tor ${s.track}` : ''}` : '', dwell >= 2 ? `postój ${dwell} min` : ''].filter(Boolean).join(' · '),
    km: kind !== 'p' && s.km != null && km0 != null ? Math.round(s.km - km0) : null,
  }
}
const firstRow = computed(() => (rows.value ? row(rows.value[0], 'p') : {
  key: 'p', time: hm(plus(l.value.departure, l.value.departureDelay)), old: l.value.departureDelay ? hm(l.value.departure) : '', past: past(plus(l.value.departure, l.value.departureDelay)),
  name: short(l.value.from.name), sub: l.value.platform ? `peron ${l.value.platform}${l.value.track ? ` · tor ${l.value.track}` : ''}` : '', km: null,
}))
const lastRow = computed(() => (rows.value ? row(rows.value.at(-1)!, 'k') : {
  key: 'k', time: hm(plus(l.value.arrival, l.value.arrivalDelay)), old: l.value.arrivalDelay ? hm(l.value.arrival) : '', past: past(plus(l.value.arrival, l.value.arrivalDelay)),
  name: short(l.value.to.name), sub: l.value.arrivalPlatform ? `peron ${l.value.arrivalPlatform}` : '', km: l.value.distanceKm != null ? Math.round(l.value.distanceKm) : null,
}))
const midRows = computed(() => (rows.value
  ? (middle.value as TripStop[]).map((s) => row(s, 'm'))
  : (l.value.stops ?? []).filter((s) => !s.skipped).map((s) => ({ key: s.id, time: hm(plus(s.departure, s.delay)), old: s.delay ? hm(s.departure) : '', past: past(plus(s.departure, s.delay)), name: short(s.name), sub: s.requestOnly ? 'na żądanie' : '', km: null }))))
</script>

<script lang="ts">
const cache = new Map<string, Trip>()
</script>

<template>
  <section class="plyta kol poc-plyta">
    <div class="poc-gl">
      <span class="poc-znak" :style="{ background: line.color }">{{ line.badge }}</span>
      <div class="min-w-0">
        <p class="poc-nr"><b>{{ trainShort(leg) }}</b><span v-if="trainName(leg.number)" class="nazwa-p"> „{{ trainName(leg.number) }}”</span></p>
        <p class="dr maly">do {{ short(leg.headsign) }}{{ relation && trip?.destination !== leg.headsign ? ` · pociąg relacji ${relation}` : '' }}</p>
      </div>
    </div>

    <div class="poc-fakty">
      <span><v-icon icon="schedule" size="16" />{{ dur(minutes) }}</span>
      <span v-if="leg.distanceKm"><v-icon icon="route" size="16" />{{ Math.round(leg.distanceKm) }} km</span>
      <span>{{ leg.stopsBetween ? `${leg.stopsBetween} ${plural(leg.stopsBetween, 'przystanek', 'przystanki', 'przystanków')} po drodze` : 'bez przystanków po drodze' }}</span>
      <span v-if="vehicle"><v-icon :icon="vehicle.kind === 'emu' ? 'electric_bolt' : 'train'" size="16" />{{ VEHICLE_KINDS[vehicle.kind].short }}</span>
      <span v-for="a in vehicle ? vehicleAmenities(vehicle).filter((x) => x.on) : []" :key="a.icon"><v-icon :icon="a.icon" size="16" />{{ a.label.toLowerCase() }}</span>
      <span v-if="leg.isBus"><v-icon icon="warning" size="16" />autobus zastępczy</span>
    </div>
    <p class="dr maly">{{ line.company }}{{ line.line ? ` · linia ${line.line}` : '' }}</p>
    <p v-if="leg.agency === 'IC'" class="bilet-uw">Bilety KW i POLREGIO tu nie obowiązują, potrzebny bilet PKP Intercity.</p>
    <p v-else-if="leg.agency === 'PR' && leg.kwTickets === false" class="bilet-uw">Na tym odcinku potrzebny bilet POLREGIO.</p>

    <div>
      <div class="os pos gl p" :class="{ byl: firstRow.past }" :style="{ '--c': line.color }">
        <time><span :class="{ op: firstRow.old }">{{ firstRow.time }}</span><s v-if="firstRow.old">{{ firstRow.old }}</s></time><div class="sz"><i /></div>
        <div class="n"><span><b class="nz">{{ firstRow.name }}</b><small v-if="firstRow.sub">{{ firstRow.sub }}</small></span></div>
      </div>
      <template v-if="midRows.length">
        <div class="os" :style="{ '--c': line.color }">
          <span /><div class="sz" />
          <button type="button" class="chip" style="justify-self: start; height: 36px" :aria-expanded="open" @click="open = !open">
            {{ open ? 'Zwiń przystanki' : `Pokaż ${midRows.length} ${plural(midRows.length, 'przystanek', 'przystanki', 'przystanków')}` }} <v-icon :icon="open ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" size="14" />
          </button>
        </div>
        <div v-if="open">
          <div v-for="r in midRows" :key="r.key" class="os pos" :class="{ byl: r.past }" :style="{ '--c': line.color }">
            <time><span :class="{ op: r.old }">{{ r.time }}</span><s v-if="r.old">{{ r.old }}</s></time><div class="sz"><i /></div>
            <div class="n"><span><span class="nz">{{ r.name }}</span><small v-if="r.sub">{{ r.sub }}</small></span><em v-if="r.km != null">{{ r.km }} km</em></div>
          </div>
        </div>
      </template>
      <div class="os pos gl k" :class="{ byl: lastRow.past }" :style="{ '--c': line.color }">
        <time><span :class="{ op: lastRow.old }">{{ lastRow.time }}</span><s v-if="lastRow.old">{{ lastRow.old }}</s></time><div class="sz"><i /></div>
        <div class="n"><span><b class="nz">{{ lastRow.name }}</b><small v-if="lastRow.sub">{{ lastRow.sub }}</small></span><em v-if="lastRow.km != null">{{ lastRow.km }} km</em></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.poc-plyta { gap: 12px; }
.poc-gl { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px; align-items: center; }
.poc-znak { min-width: 44px; height: 32px; padding: 0 10px; border-radius: 16px; display: grid; place-items: center; color: #fff; font-weight: 800; font-size: 13px; letter-spacing: .02em; }
.poc-nr { font-size: 17px; line-height: 1.25; }
.poc-nr b { font-weight: 700; }
.poc-fakty { display: flex; flex-wrap: wrap; gap: 6px; }
.poc-fakty span { display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 10px; border-radius: 15px; background: var(--papier); font-size: 13px; font-weight: 600; }
.bilet-uw { font-size: 13px; font-weight: 600; color: var(--opoz); background: var(--opoz-tlo); padding: 8px 12px; border-radius: var(--r-s); }
.os .n > span { display: flex; flex-direction: column; min-width: 0; }
.os .n > span small { white-space: normal; }
.os .n em { font-style: normal; font-size: 12px; color: var(--tusz-2); white-space: nowrap; }
.os time .op { color: var(--opoz); }
.min-w-0 { min-width: 0; }
</style>
