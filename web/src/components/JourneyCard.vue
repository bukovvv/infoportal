<script setup lang="ts">
import { computed } from 'vue'
import { type Journey, useJourneys } from '@/stores/journeys'
import { useNotices } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { clock, dayLabel, minutesUntil, relative, splitNumbers, warsawNow } from '@/utils/format'
import StatusTag from './StatusTag.vue'
import TrainChip from './TrainChip.vue'

const props = defineProps<{ journey: Journey; now: number }>()
const journeys = useJourneys()
const notices = useNotices()
const ui = useUi()

const legs = computed(() => props.journey.connection.legs.map((_, i) => journeys.legState(props.journey, i)))
const departure = computed(() => legs.value[0].expectedDeparture ?? legs.value[0].departure)
const arrival = computed(() => legs.value[legs.value.length - 1].expectedArrival ?? legs.value[legs.value.length - 1].arrival)
const cancelled = computed(() => legs.value.some((l) => l.cancelled))
const state = computed(() => {
  const toDep = minutesUntil(departure.value, props.now)
  const toArr = minutesUntil(arrival.value, props.now)
  if (cancelled.value) return { label: 'Odwołany kurs', lead: '', big: 'Znajdź inne połączenie', progress: null, done: false }
  if (toDep > 0) return { label: 'Zaplanowana', lead: 'Odjazd', big: relative(toDep), progress: null, done: false }
  if (toArr > 0) {
    const total = (new Date(arrival.value).getTime() - new Date(departure.value).getTime()) / 60000
    return { label: 'W drodze', lead: 'Przyjazd', big: relative(toArr), progress: Math.round((1 - toArr / Math.max(1, total)) * 100), done: false }
  }
  return { label: 'Zakończona', lead: 'Przyjazd', big: clock(arrival.value), progress: null, done: true }
})
const otherDay = computed(() => props.journey.connection.departure.slice(0, 10) !== warsawNow(new Date(props.now)).date)
const numbers = computed(() => props.journey.connection.legs.flatMap((l) => splitNumbers(l.number)))
const related = computed(() => notices.alerts.filter((n) => n.trains.some((t) => numbers.value.includes(t))))

function remove() {
  const removed = journeys.remove(props.journey.id)
  if (removed) ui.notify('Usunięto podróż', { label: 'Cofnij', run: () => journeys.restore(removed) })
}
</script>

<template>
  <article class="journey" :class="{ done: state.done, cancelled }">
    <div class="d-flex justify-space-between align-start ga-2">
      <div class="min-w-0">
        <div class="label">{{ state.label }}<template v-if="otherDay"> · {{ dayLabel(journey.connection.departure) }}</template></div>
        <h3 class="text-title-medium">{{ journey.from }} → {{ journey.to }}</h3>
      </div>
      <span class="d-flex">
        <v-btn
          :icon="journey.notify ? 'notifications_active' : 'notifications'"
          variant="text"
          size="small"
          :loading="!!journeys.pending[journey.id]"
          :aria-pressed="!!journey.notify"
          :aria-label="journey.notify ? 'Wyłącz powiadomienia o tej podróży' : 'Powiadom o opóźnieniu tej podróży'"
          :title="journey.notify ? 'Powiadomienia włączone' : 'Powiadom o opóźnieniu'"
          @click="journeys.setNotify(journey.id, !journey.notify)"
        />
        <v-btn icon="close" variant="text" size="small" aria-label="Przestań obserwować" @click="remove" />
      </span>
    </div>
    <div class="d-flex justify-space-between align-end ga-2 flex-wrap">
      <span class="big-line"><span v-if="state.lead" class="lead">{{ state.lead }}</span> <span class="big tnum" :class="{ msg: !state.lead }">{{ state.big }}</span></span>
      <span class="text-title-small tnum">{{ clock(departure) }} – {{ clock(arrival) }}</span>
    </div>
    <v-progress-linear v-if="state.progress !== null" :model-value="state.progress" rounded height="4" aria-label="Postęp podróży" />
    <div v-for="(leg, i) in legs" :key="leg.key" class="d-flex align-center justify-space-between ga-2 flex-wrap">
      <span class="d-flex align-center ga-2">
        <TrainChip :number="leg.number" :trip-key="leg.key" :bus="journey.connection.legs[i].isBus" />
        <span v-if="leg.platform" class="text-body-small">peron {{ leg.platform }}</span>
      </span>
      <StatusTag :delay="leg.delay" :cancelled="leg.cancelled" />
    </div>
    <v-alert v-for="n in related" :key="n.id" color="error-container" density="compact" icon="warning" class="text-body-medium">
      {{ n.title }}
      <template #append><v-btn variant="text" size="small" to="/komunikaty">Szczegóły</v-btn></template>
    </v-alert>
  </article>
</template>

<style scoped>
.label { font-size: 12px; font-weight: 700; opacity: .8; }
.big-line { display: inline-flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.lead { font-size: 16px; font-weight: 600; }
.big { font-size: 34px; line-height: 38px; font-weight: 800; letter-spacing: -0.4px; }
.big.msg { font-size: 22px; line-height: 28px; }
.journey { display: grid; gap: 12px; padding: 16px 16px 16px 18px; border-radius: var(--kw-r-l); background: rgb(var(--v-theme-primary-container)); color: rgb(var(--v-theme-on-primary-container)); }
.journey.done { background: rgb(var(--v-theme-surface-container-high)); color: rgb(var(--v-theme-on-surface)); }
.journey.cancelled { background: rgb(var(--v-theme-error-container)); color: rgb(var(--v-theme-on-error-container)); }
.journey :deep(.v-progress-linear__background) { background: currentColor; opacity: .16; }
</style>
