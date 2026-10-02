<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Connection } from '@/api/types'
import { useJourneys } from '@/stores/journeys'
import { useUi } from '@/stores/ui'
import { clock, duration, plural } from '@/utils/format'
import RouteBadge from './RouteBadge.vue'
import TrainChip from './TrainChip.vue'

const props = defineProps<{ connection: Connection }>()
const journeys = useJourneys()
const ui = useUi()
const expanded = ref(false)
const c = computed(() => props.connection)
const first = computed(() => c.value.legs[0])
const last = computed(() => c.value.legs[c.value.legs.length - 1])
const depDelay = computed(() => first.value.departureDelay ?? 0)
const arrDelay = computed(() => last.value.arrivalDelay ?? 0)
const saved = computed(() => journeys.has(c.value))

function watchJourney() {
  if (journeys.add(c.value)) {
    ui.notify('Dodano do Moich podróży', { label: 'Pokaż', run: () => document.getElementById('moje-podroze')?.scrollIntoView({ behavior: 'smooth' }) })
  }
}
</script>

<template>
  <article class="conn">
    <div class="conn-main">
      <div class="conn-top">
        <div class="conn-times tnum" :aria-label="`Odjazd ${clock(c.departure)}, przyjazd ${clock(c.arrival)}`">
          <span class="t" :class="{ was: depDelay >= 2 }">{{ clock(c.departure) }}</span>
          <span v-if="depDelay >= 2" class="late">{{ clock(first.expectedDeparture) }}</span>
          <v-icon icon="arrow_forward" class="muted" size="20" />
          <span class="t" :class="{ was: arrDelay >= 2 }">{{ clock(c.arrival) }}</span>
          <span v-if="arrDelay >= 2" class="late">{{ clock(last.expectedArrival) }}</span>
        </div>
        <div class="text-right">
          <div class="text-title-medium tnum">{{ duration(c.durationMinutes + Math.max(0, arrDelay - depDelay)) }}</div>
          <div class="text-body-small muted">{{ c.transfers ? `przesiadka: ${c.via.map((v) => v.name).join(', ')}` : 'bezpośrednio' }}</div>
        </div>
      </div>
      <div class="d-flex flex-wrap align-center ga-2">
        <template v-for="(leg, i) in c.legs" :key="leg.key">
          <span v-if="i" class="wait text-body-small muted"><v-icon icon="transfer_within_a_station" size="18" />{{ c.waits[i - 1] }} min</span>
          <TrainChip :number="leg.number" :trip-key="leg.key" :bus="leg.isBus" />
        </template>
        <span v-if="depDelay >= 2" class="tag tag-delay"><v-icon icon="schedule" />+{{ depDelay }} min</span>
        <span v-if="first.platform" class="text-body-small muted">peron {{ first.platform }}</span>
      </div>
    </div>
    <div class="conn-actions">
      <v-btn variant="text" :prepend-icon="expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" :aria-expanded="expanded" @click="expanded = !expanded">Szczegóły</v-btn>
      <v-btn :variant="saved ? 'text' : 'flat'" :color="saved ? undefined : 'secondary-container'" :prepend-icon="saved ? 'bookmark_added' : 'bookmark_add'" :disabled="saved" @click="watchJourney">
        {{ saved ? 'Obserwujesz' : 'Obserwuj' }}
      </v-btn>
    </div>
    <v-expand-transition>
      <div v-if="expanded" class="conn-detail">
        <template v-for="(leg, i) in c.legs" :key="leg.key">
          <div class="leg">
            <span class="leg-t tnum">{{ clock(leg.departure) }}</span><span class="leg-rail"><i /></span>
            <div class="leg-s">
              <div class="text-title-small">{{ leg.from.name }}</div>
              <div class="text-body-small muted d-flex flex-wrap align-center ga-1">
                <RouteBadge :route="leg.route" :bus="leg.isBus" />
                KW {{ leg.number }} w kierunku {{ leg.headsign }}<template v-if="leg.platform"> · peron {{ leg.platform }}<template v-if="leg.track">, tor {{ leg.track }}</template></template>
                · {{ leg.stopsBetween }} {{ plural(leg.stopsBetween, 'przystanek', 'przystanki', 'przystanków') }} po drodze
              </div>
            </div>
          </div>
          <div class="leg">
            <span class="leg-t tnum">{{ clock(leg.arrival) }}</span><span class="leg-rail end"><i /></span>
            <div class="leg-s">
              <div class="text-title-small">{{ leg.to.name }}</div>
              <div v-if="leg.arrivalPlatform" class="text-body-small muted">peron {{ leg.arrivalPlatform }}</div>
            </div>
          </div>
          <div v-if="i < c.legs.length - 1" class="leg">
            <span /><span />
            <span class="leg-transfer"><v-icon icon="transfer_within_a_station" size="18" />Przesiadka: {{ c.waits[i] }} min</span>
          </div>
        </template>
      </div>
    </v-expand-transition>
  </article>
</template>

<style scoped>
.conn { border-radius: var(--kw-r-l); background: rgb(var(--v-theme-surface)); border: 1px solid rgb(var(--v-theme-outline-variant)); overflow: hidden; }
.conn-main { display: grid; gap: 12px; padding: 16px 16px 12px 20px; }
.conn-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.conn-times { display: flex; align-items: baseline; flex-wrap: wrap; gap: 10px; }
.conn-times .t { font-size: 24px; line-height: 32px; }
.conn-times .v-icon { align-self: center; }
.wait { display: inline-flex; align-items: center; gap: 2px; }
.conn-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 8px 8px; }
.conn-detail { padding: 4px 16px 16px; border-top: 1px solid rgb(var(--v-theme-outline-variant)); background: rgb(var(--v-theme-surface-container-lowest)); }
.leg { display: grid; grid-template-columns: 52px 20px minmax(0, 1fr); column-gap: 8px; }
.leg-t { text-align: right; font-weight: 500; padding-top: 12px; }
.leg-rail { position: relative; }
.leg-rail::before { content: ''; position: absolute; left: 9px; top: 20px; bottom: -12px; width: 2px; background: rgb(var(--v-theme-primary)); }
.leg-rail.end::before { display: none; }
.leg-rail i { position: absolute; left: 4px; top: 14px; width: 12px; height: 12px; border-radius: 50%; border: 2px solid rgb(var(--v-theme-primary)); background: rgb(var(--v-theme-surface-container-lowest)); }
.leg-s { padding: 10px 0; min-width: 0; }
.leg-transfer { grid-column: 3; margin: 4px 0; display: inline-flex; align-items: center; gap: 6px; color: rgb(var(--v-theme-warning)); font-size: 12px; font-weight: 500; }
@media (max-width: 480px) { .conn-times .t { font-size: 22px; } }
</style>
