<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { Trip } from '@/api/types'
import { useNotices } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { clock, dayLabel } from '@/utils/format'
import NoticeItem from './NoticeItem.vue'
import RouteBadge from './RouteBadge.vue'
import StatusTag from './StatusTag.vue'
import TrainTimeline from './TrainTimeline.vue'
import VehicleCard from './VehicleCard.vue'

const props = defineProps<{ tripKey?: string; number?: string; inSheet?: boolean }>()
const emit = defineEmits<{ close: []; loaded: [trip: Trip] }>()
const router = useRouter()
const ui = useUi()
const notices = useNotices()
const trip = ref<Trip | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)
const now = ref(Date.now())
let timer: number | undefined

async function load(silent = false) {
  if (!props.tripKey && !props.number) return
  if (!silent) loading.value = true
  try {
    trip.value = props.tripKey ? await api.trip(props.tripKey) : await api.train(props.number!)
    error.value = null
    emit('loaded', trip.value)
  } catch (e) {
    if (!silent) error.value = (e as Error).message
  } finally {
    loading.value = false
    now.value = Date.now()
  }
}

watch(() => [props.tripKey, props.number], () => { trip.value = null; void load() }, { immediate: true })
timer = window.setInterval(() => void load(true), 30_000)
onBeforeUnmount(() => window.clearInterval(timer))

const category = computed(() => {
  const t = trip.value
  if (!t) return ''
  if (t.isBus) return 'Zastępcza komunikacja autobusowa'
  return t.route?.id === 'KW_P' ? 'Pociąg przyspieszony' : 'Pociąg osobowy'
})
const related = computed(() => (trip.value ? notices.forNumbers(trip.value.numbers.length ? trip.value.numbers : [trip.value.number]) : []))
const progress = computed(() => {
  const t = trip.value
  if (!t?.position) return null
  const first = new Date(t.stops[0].expectedDeparture ?? t.stops[0].departure!).getTime()
  const lastStop = t.stops[t.stops.length - 1]
  const last = new Date(lastStop.expectedArrival ?? lastStop.arrival!).getTime()
  return Math.round(Math.min(1, Math.max(0, (now.value - first) / Math.max(1, last - first))) * 100)
})

function toStation(id: string) {
  emit('close')
  void router.push({ name: 'board', params: { stationId: id } })
}
function toMap() {
  if (!trip.value) return
  emit('close')
  void router.push({ name: 'map', query: { kurs: trip.value.key } })
}
function fullView() {
  if (!trip.value) return
  emit('close')
  void router.push({ name: 'train', params: { number: trip.value.number.split('/')[0] }, query: { kurs: trip.value.key } })
}
function share() {
  if (!trip.value) return
  const url = `${location.origin}/pociag/${trip.value.number.split('/')[0]}`
  navigator.clipboard?.writeText(url).then(() => ui.notify('Skopiowano link do pociągu.'), () => ui.notify(url))
}
defineExpose({ trip })
</script>

<template>
  <div class="train-detail">
    <div v-if="loading && !trip" class="pa-6">
      <v-skeleton-loader type="heading, text, divider, list-item-two-line@5" color="transparent" />
    </div>
    <v-empty-state v-else-if="error" icon="search_off" :title="error" text="Sprawdź numer pociągu albo wybierz kurs z tablicy odjazdów.">
      <template #actions><v-btn variant="flat" color="secondary-container" @click="load()">Spróbuj ponownie</v-btn></template>
    </v-empty-state>
    <template v-else-if="trip">
      <header class="head">
        <div class="d-flex align-center justify-space-between ga-2">
          <span class="text-label-medium muted d-flex align-center ga-2">
            <RouteBadge :route="trip.route" :bus="trip.isBus" />{{ category }} · {{ dayLabel(trip.serviceDate + 'T12:00:00') }}
          </span>
          <v-btn v-if="inSheet" icon="close" variant="text" aria-label="Zamknij" @click="emit('close')" />
        </div>
        <h2 class="text-headline-small">KW {{ trip.number }}<span v-if="trip.name && !trip.name.startsWith('PKM')" class="muted"> „{{ trip.name }}”</span></h2>
        <p class="text-title-medium font-weight-regular">{{ trip.origin }} → {{ trip.destination }}</p>
        <div class="d-flex flex-wrap ga-2">
          <StatusTag :delay="trip.realtime.delay" :source="trip.realtime.source" :cancelled="trip.realtime.cancelled" :estimated="trip.position?.source === 'est'" />
          <span v-if="trip.position?.source === 'gps'" class="tag tag-neutral"><v-icon icon="satellite_alt" />GPS · {{ trip.position.speed ? `${trip.position.speed} km/h` : 'postój' }}</span>
          <span class="tag tag-neutral"><v-icon icon="schedule" />{{ clock(trip.stops[0].departure) }} – {{ clock(trip.stops[trip.stops.length - 1].arrival) }}</span>
        </div>
        <v-progress-linear v-if="progress !== null" :model-value="progress" rounded height="4" bg-color="surface-container-highest" aria-label="Postęp kursu" />
        <v-alert v-if="trip.realtime.cancelled" color="error-container" icon="cancel-fill" density="compact">
          Ten kurs dziś nie jedzie. Wyszukaj inne połączenie.
        </v-alert>
        <div v-if="trip.otherLegs.length" class="text-body-small muted">
          Ten kurs składa się z kilku odcinków:
          <a v-for="leg in trip.otherLegs" :key="leg.key" href="#" class="text-primary mr-2" @click.prevent="ui.openTrain({ key: leg.key }, false)">
            {{ leg.isBus ? 'autobus' : 'pociąg' }} {{ leg.from }} – {{ leg.to }}
          </a>
        </div>
        <div class="d-flex flex-wrap ga-2">
          <v-btn variant="flat" color="secondary-container" prepend-icon="map" @click="toMap">Pokaż na mapie</v-btn>
          <v-btn v-if="inSheet" variant="outlined" prepend-icon="open_in_full" @click="fullView">Pełny widok</v-btn>
          <v-btn v-else variant="outlined" prepend-icon="link" @click="share">Kopiuj link</v-btn>
        </div>
      </header>
      <div v-if="related.length" class="notices divider">
        <NoticeItem v-for="n in related" :key="n.id" :notice="n" compact link />
      </div>
      <VehicleCard v-if="trip.vehicle" :vehicle="trip.vehicle" class="divider" />
      <div class="divider">
        <TrainTimeline :trip="trip" :now="now" @station="toStation" />
      </div>
      <p class="text-body-small muted px-6 pb-6">
        <template v-if="trip.realtime.source === 'rt'">Opóźnienia z systemu PKP PLK.</template>
        <template v-else-if="trip.realtime.source === 'gps'">Opóźnienie według pozycji GPS.</template>
        <template v-else>Godziny według rozkładu jazdy.</template>
        Rozkład: PKP PLK, GTFS mkuran.pl.<template v-if="trip.vehicle"> Pojazd: <a :href="trip.vehicle.url" target="_blank" rel="noopener noreferrer" class="text-primary">vagonWEB.cz</a>.</template>
      </p>
    </template>
  </div>
</template>

<style scoped>
.head { display: grid; gap: 12px; padding: 16px 16px 20px 24px; }
.notices { background: rgb(var(--v-theme-surface-container-low)); }
</style>
