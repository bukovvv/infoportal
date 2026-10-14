<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { Trip } from '@/api/types'
import { useNotices } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { clock, dayLabel } from '@/utils/format'
import { shareLink } from '@/utils/share'
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
  const t = trip.value
  void shareLink({ title: `KW ${t.number}`, text: `KW ${t.number} ${t.origin} → ${t.destination}`, url: `${location.origin}/pociag/${t.number.split('/')[0]}` })
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
          <span class="head-label d-flex align-center ga-2">
            <RouteBadge :route="trip.route" :bus="trip.isBus" class="badge-on-band" />{{ category }} · {{ dayLabel(trip.serviceDate + 'T12:00:00') }}
          </span>
          <v-btn v-if="inSheet" icon="close" variant="text" color="on-band" aria-label="Zamknij" @click="emit('close')" />
        </div>
        <h2 class="head-title">KW {{ trip.number }}<span v-if="trip.name && !trip.name.startsWith('PKM')" class="head-name"> „{{ trip.name }}”</span></h2>
        <p class="head-route">{{ trip.origin }} → {{ trip.destination }}</p>
        <div class="d-flex flex-wrap ga-2">
          <StatusTag :delay="trip.realtime.delay" :source="trip.realtime.source" :cancelled="trip.realtime.cancelled" :estimated="trip.position?.source === 'est'" />
          <span v-if="trip.position?.source === 'gps'" class="tag tag-band"><v-icon icon="satellite_alt" />GPS · {{ trip.position.speed ? `${trip.position.speed} km/h` : 'postój' }}</span>
          <span class="tag tag-band tnum"><v-icon icon="schedule" />{{ clock(trip.stops[0].departure) }} – {{ clock(trip.stops[trip.stops.length - 1].arrival) }}</span>
        </div>
        <v-progress-linear v-if="progress !== null" :model-value="progress" rounded height="6" color="on-band" class="head-progress" aria-label="Postęp kursu" />
        <v-alert v-if="trip.realtime.cancelled" color="error-container" icon="cancel-fill" density="compact">
          Ten kurs dziś nie jedzie. Wyszukaj inne połączenie.
        </v-alert>
        <div v-if="trip.otherLegs.length" class="text-body-small head-legs">
          Ten kurs składa się z kilku odcinków:
          <a v-for="leg in trip.otherLegs" :key="leg.key" href="#" class="mr-2" @click.prevent="ui.openTrain({ key: leg.key }, false)">
            {{ leg.isBus ? 'autobus' : 'pociąg' }} {{ leg.from }} – {{ leg.to }}
          </a>
        </div>
      </header>
      <div class="actions">
        <v-btn variant="flat" color="primary-container" prepend-icon="map" @click="toMap">Pokaż na mapie</v-btn>
        <v-btn v-if="inSheet" variant="outlined" prepend-icon="open_in_full" @click="fullView">Pełny widok</v-btn>
        <v-btn variant="outlined" prepend-icon="share" @click="share">Udostępnij</v-btn>
      </div>
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
        Rozkład: PKP PLK, GTFS mkuran.pl.<template v-if="trip.vehicle?.url"> Pojazd: <a :href="trip.vehicle.url" target="_blank" rel="noopener noreferrer" class="text-primary">vagonWEB.cz</a>.</template>
      </p>
    </template>
  </div>
</template>

<style scoped>
/* nagłówek kursu na grafitowym pasku (jak górny pasek aplikacji) */
.head {
  display: grid; gap: 10px; padding: 16px 16px 20px 24px; border-radius: 0 0 var(--kw-r-l) var(--kw-r-l);
  background: rgb(var(--v-theme-band)); color: rgb(var(--v-theme-on-band));
}
.head-label { font-size: 13px; font-weight: 600; opacity: .9; }
.badge-on-band { box-shadow: 0 0 0 1.5px color-mix(in srgb, rgb(var(--v-theme-on-band)) 70%, transparent); }
.head-title { font-size: 30px; line-height: 36px; font-weight: 800; letter-spacing: -0.3px; }
.head-name { opacity: .75; }
.head-route { font-size: 18px; font-weight: 600; }
.tag-band { background: color-mix(in srgb, rgb(var(--v-theme-on-band)) 16%, transparent); color: rgb(var(--v-theme-on-band)); }
.head-progress { margin-top: 4px; }
.head-progress :deep(.v-progress-linear__background) { background: rgb(var(--v-theme-on-band)); opacity: .22; }
.head-legs { opacity: .9; }
.head-legs a { color: inherit; font-weight: 700; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; padding: 14px 16px 6px 24px; }
.notices { background: rgb(var(--v-theme-surface-container-low)); }
</style>
