<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Connection, Leg } from '@/api/types'
import { useJourneys } from '@/stores/journeys'
import { useUi } from '@/stores/ui'
import { clock, duration, minutesUntil, plural, relative } from '@/utils/format'
import { unitLabel, vehicleTitle } from '@/utils/vehicle'
import RouteBadge from './RouteBadge.vue'
import StatusTag from './StatusTag.vue'
import TrainChip from './TrainChip.vue'

// now: odliczanie „za X min” (bez niego karta pokazuje same godziny); highlight: wyróżnienie najbliższego połączenia
const props = defineProps<{ connection: Connection; now?: number; highlight?: boolean }>()
const journeys = useJourneys()
const ui = useUi()
const expanded = ref(false)
/** odcinki z rozwiniętą listą stacji pośrednich */
const openLegs = ref(new Set<string>())
function toggleLeg(key: string) {
  const next = new Set(openLegs.value)
  if (!next.delete(key)) next.add(key)
  openLegs.value = next
}
const c = computed(() => props.connection)
const first = computed(() => c.value.legs[0])
const last = computed(() => c.value.legs[c.value.legs.length - 1])
const depDelay = computed(() => first.value.departureDelay ?? 0)
const arrDelay = computed(() => last.value.arrivalDelay ?? 0)
const saved = computed(() => journeys.has(c.value))
/** Godzina z innego dnia niż odjazd (kurs przez północ) dostaje dopisek „+1”. */
const nextDay = (iso: string | null | undefined) => !!iso && iso.slice(0, 10) !== c.value.departure.slice(0, 10)

/** Kolor odcinka: linia z rozkładu, autobus zastępczy neutralnie, bez koloru — kolor akcji. */
const legColor = (leg: Leg) => (leg.isBus ? 'rgb(var(--v-theme-outline))' : leg.route?.color ?? 'rgb(var(--v-theme-primary))')
const legMinutes = (leg: Leg) => Math.max(1, (new Date(leg.arrival).getTime() - new Date(leg.departure).getTime()) / 60_000)
/** Odliczanie do odjazdu (z opóźnieniem) w ciągu najbliższej godziny. */
const countdown = computed(() => {
  if (props.now === undefined) return ''
  const m = minutesUntil(first.value.expectedDeparture ?? c.value.departure, props.now)
  return m >= 0 && m < 60 ? relative(m) : ''
})

function watchJourney() {
  if (journeys.add(c.value)) {
    ui.notify('Dodano do Moich podróży', { label: 'Pokaż', run: () => document.getElementById('moje-podroze')?.scrollIntoView({ behavior: 'smooth' }) })
  }
}
</script>

<template>
  <article class="conn card" :class="{ highlight }">
    <div class="conn-main">
      <div class="conn-top">
        <div class="conn-times tnum" :aria-label="`Odjazd ${clock(c.departure)}, przyjazd ${clock(c.arrival)}${nextDay(c.arrival) ? ' następnego dnia' : ''}`">
          <span class="t" :class="{ late: depDelay >= 2 }">{{ clock(depDelay >= 2 ? first.expectedDeparture : c.departure) }}</span>
          <span v-if="depDelay >= 2" class="was">{{ clock(c.departure) }}</span>
          <v-icon icon="arrow_forward" class="muted" size="20" />
          <span class="t" :class="{ late: arrDelay >= 2 }">{{ clock(arrDelay >= 2 ? last.expectedArrival : c.arrival) }}<sup v-if="nextDay(arrDelay >= 2 ? last.expectedArrival : c.arrival)" class="plus-day">+1</sup></span>
          <span v-if="arrDelay >= 2" class="was">{{ clock(c.arrival) }}</span>
        </div>
        <div class="text-right">
          <div class="dur tnum">{{ duration(c.durationMinutes + Math.max(0, arrDelay - depDelay)) }}</div>
          <div class="text-body-small muted">{{ c.transfers ? `${c.transfers} ${plural(c.transfers, 'przesiadka', 'przesiadki', 'przesiadek')}` : 'bezpośrednio' }}</div>
        </div>
      </div>
      <div class="strip" aria-hidden="true">
        <v-icon :icon="first.isBus ? 'directions_bus' : 'train'" size="18" class="muted" />
        <template v-for="(leg, i) in c.legs" :key="leg.key">
          <span v-if="i" class="strip-stop" />
          <span class="strip-seg" :style="{ flexGrow: legMinutes(leg), background: legColor(leg) }" />
        </template>
        <span class="strip-end" :style="{ borderColor: legColor(last) }" />
      </div>
      <div class="meta">
        <template v-for="(leg, i) in c.legs" :key="leg.key">
          <span v-if="i" class="wait text-body-small muted"><v-icon icon="transfer_within_a_station" size="18" />{{ c.via[i - 1].name }} · {{ c.waits[i - 1] }} min</span>
          <span class="d-inline-flex align-center ga-1">
            <RouteBadge :route="leg.route" :bus="leg.isBus" />
            <TrainChip :number="leg.number" :trip-key="leg.key" :bus="leg.isBus" />
            <span v-if="leg.platform" class="text-body-small muted ml-1">peron {{ leg.platform }}</span>
          </span>
        </template>
        <span class="meta-end">
          <span v-if="countdown" class="countdown text-body-medium">{{ countdown }}</span>
          <StatusTag v-if="first.departureDelay !== null" :delay="first.departureDelay" />
        </span>
      </div>
    </div>
    <div class="conn-actions">
      <v-btn variant="text" :prepend-icon="expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" :aria-expanded="expanded" @click="expanded = !expanded">Szczegóły</v-btn>
      <v-btn :variant="saved ? 'text' : 'flat'" :color="saved ? undefined : 'primary-container'" :prepend-icon="saved ? 'bookmark_added' : 'bookmark_add'" :disabled="saved" @click="watchJourney">
        {{ saved ? 'Obserwujesz' : 'Obserwuj' }}
      </v-btn>
    </div>
    <v-expand-transition>
      <div v-if="expanded" class="conn-detail">
        <template v-for="(leg, i) in c.legs" :key="leg.key">
          <div class="leg" :style="{ '--leg': legColor(leg) }">
            <span class="leg-t tnum">{{ clock(leg.departure) }}<sup v-if="nextDay(leg.departure)" class="plus-day">+1</sup></span><span class="leg-rail"><i /></span>
            <div class="leg-s">
              <div class="leg-name">{{ leg.from.name }}</div>
              <div class="text-body-small muted d-flex flex-wrap align-center ga-1">
                <RouteBadge :route="leg.route" :bus="leg.isBus" />
                <strong class="leg-no">KW {{ leg.number }}</strong> do {{ leg.headsign }}<template v-if="leg.platform"> · peron {{ leg.platform }}<template v-if="leg.track">, tor {{ leg.track }}</template></template>
              </div>
              <div v-if="leg.vehicle" class="leg-vehicle">
                <span class="text-body-small"><span class="muted">Możesz spodziewać się pojazdu:</span> {{ vehicleTitle(leg.vehicle) }}</span>
                <div class="leg-drawing">
                  <template v-for="(u, j) in leg.vehicle.vehicles" :key="j">
                    <img
                      v-if="u.image"
                      :src="u.image"
                      :width="u.width ? Math.round(u.width / 2) : undefined"
                      :height="u.height ? Math.round(u.height / 2) : undefined"
                      :alt="`Rysunek pojazdu ${unitLabel(u)}`"
                      loading="lazy"
                    >
                  </template>
                </div>
              </div>
              <v-btn
                v-if="leg.stops?.length"
                variant="text"
                size="small"
                class="stops-btn"
                :append-icon="openLegs.has(leg.key) ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
                :aria-expanded="openLegs.has(leg.key)"
                @click="toggleLeg(leg.key)"
              >
                {{ leg.stopsBetween }} {{ plural(leg.stopsBetween, 'przystanek', 'przystanki', 'przystanków') }} po drodze
              </v-btn>
              <div v-else class="text-body-small muted mt-1">
                {{ leg.stopsBetween ? `${leg.stopsBetween} ${plural(leg.stopsBetween, 'przystanek', 'przystanki', 'przystanków')} po drodze` : 'bez zatrzymań po drodze' }}
              </div>
            </div>
          </div>
          <template v-if="openLegs.has(leg.key)">
            <div v-for="st in leg.stops" :key="st.id + st.departure" class="leg mid" :class="{ skipped: st.skipped }" :style="{ '--leg': legColor(leg) }">
              <span class="leg-t tnum text-body-small">
                <span :class="{ was: (st.delay ?? 0) >= 2 }">{{ clock(st.departure) }}</span><sup v-if="nextDay(st.departure)" class="plus-day">+1</sup>
                <span v-if="(st.delay ?? 0) >= 2" class="late d-block">{{ clock(st.expectedDeparture) }}</span>
              </span>
              <span class="leg-rail"><i /></span>
              <div class="leg-s text-body-medium">
                {{ st.name }}
                <span v-if="st.skipped" class="text-body-small late"> · nie zatrzyma się</span>
                <span v-else-if="st.requestOnly" class="text-body-small muted"> · na żądanie</span>
              </div>
            </div>
          </template>
          <div class="leg" :style="{ '--leg': legColor(leg) }">
            <span class="leg-t tnum">{{ clock(leg.arrival) }}<sup v-if="nextDay(leg.arrival)" class="plus-day">+1</sup></span><span class="leg-rail end" :class="{ final: i === c.legs.length - 1 }"><i /></span>
            <div class="leg-s">
              <div class="leg-name">{{ leg.to.name }}</div>
              <div v-if="leg.arrivalPlatform" class="text-body-small muted">przyjazd na peron {{ leg.arrivalPlatform }}</div>
            </div>
          </div>
          <div v-if="i < c.legs.length - 1" class="leg">
            <span /><span class="leg-rail walk" />
            <span class="leg-transfer"><v-icon icon="transfer_within_a_station" size="20" />Przesiadka · {{ c.waits[i] }} min</span>
          </div>
        </template>
      </div>
    </v-expand-transition>
  </article>
</template>

<style scoped>
.conn { overflow: hidden; }
.conn.highlight { box-shadow: 0 0 0 2px rgb(var(--v-theme-primary)); }
.conn-main { display: grid; gap: 10px; padding: 16px 16px 8px 18px; }
.conn-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.conn-times { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 8px; }
.conn-times .t { font-size: 26px; line-height: 32px; font-weight: 800; letter-spacing: -0.3px; }
.conn-times .t.late { color: rgb(var(--v-theme-warning)); }
.conn-times .was { font-size: 14px; }
.conn-times .v-icon { align-self: center; }
.dur { font-size: 16px; font-weight: 800; }
.strip { display: flex; align-items: center; gap: 6px; }
.strip-seg { height: 6px; border-radius: 3px; flex-basis: 0; }
.strip-stop, .strip-end { flex: none; width: 10px; height: 10px; border-radius: 50%; border: 2px solid rgb(var(--v-theme-on-surface-variant)); }
.meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
.meta-end { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; }
.wait { display: inline-flex; align-items: center; gap: 2px; }
.conn-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 8px 8px; }
.conn-detail { padding: 6px 16px 16px 8px; border-top: 1px solid rgb(var(--v-theme-outline-variant)); }
.leg { display: grid; grid-template-columns: 52px 24px minmax(0, 1fr); column-gap: 10px; }
.leg-t { text-align: right; font-weight: 800; padding-top: 11px; white-space: nowrap; }
.plus-day { margin-left: 2px; font-size: 11px; font-weight: 700; color: rgb(var(--v-theme-primary)); }
/* oś odcinka w kolorze linii (--leg) */
.leg-rail { position: relative; }
.leg-rail::before { content: ''; position: absolute; left: 10px; top: 22px; bottom: -12px; width: 4px; border-radius: 2px; background: var(--leg); }
.leg-rail.end::before { top: -12px; bottom: auto; height: 26px; }
.leg-rail i { position: absolute; left: 4px; top: 14px; width: 16px; height: 16px; border-radius: 50%; border: 4px solid var(--leg); background: rgb(var(--v-theme-surface)); }
.leg-rail.final i { background: var(--leg); }
.leg-rail.walk::before { left: 11px; top: 0; bottom: 0; width: 2px; background: repeating-linear-gradient(rgb(var(--v-theme-outline)) 0 4px, transparent 4px 8px); }
.leg-s { padding: 10px 0; min-width: 0; }
.leg-name { font-size: 16px; font-weight: 800; }
.leg-no { color: rgb(var(--v-theme-on-surface)); }
.leg-vehicle { display: grid; gap: 4px; margin-top: 6px; }
.leg-drawing { display: flex; align-items: flex-end; gap: 1px; overflow-x: auto; scrollbar-width: thin; }
.leg-drawing img { flex: none; display: block; max-width: none; }
.stops-btn { margin: 2px 0 -6px -12px; }
.leg.mid .leg-t { font-weight: 400; padding-top: 6px; color: rgb(var(--v-theme-on-surface-variant)); }
.leg.mid .leg-rail::before { top: 0; bottom: -14px; }
.leg.mid .leg-rail i { left: 8px; top: 12px; width: 8px; height: 8px; border-width: 0; background: var(--leg); }
.leg.mid .leg-s { padding: 4px 0; }
.leg.mid.skipped .leg-s { text-decoration: line-through; text-decoration-color: rgb(var(--v-theme-on-surface-variant)); }
.leg.mid.skipped .leg-s span { text-decoration: none; display: inline-block; }
.leg-transfer {
  grid-column: 3; justify-self: start; margin: 6px 0; display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px 8px 10px;
  border-radius: var(--kw-r-m); background: rgb(var(--v-theme-warning-container)); color: rgb(var(--v-theme-on-warning-container)); font-size: 14px; font-weight: 700;
}
@media (max-width: 480px) { .conn-times .t { font-size: 24px; } }
</style>
