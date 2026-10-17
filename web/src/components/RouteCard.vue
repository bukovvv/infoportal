<script setup lang="ts">
// Obserwowana trasa na stronie startowej: przełącznik kierunku i 3 najbliższe połączenia z danymi na żywo.
import { computed, ref } from 'vue'
import type { Connection, StationRef } from '@/api/types'
import { ends, type SavedRoute, useRoutes } from '@/stores/routes'
import { useUi } from '@/stores/ui'
import { isIntercity } from '@/utils/agency'
import { clock, minutesUntil, plural, relative } from '@/utils/format'
import { expectedDeparture, optionsSummary, upcoming, windowLabel } from '@/utils/routes'
import type { SearchOptions } from '@/utils/searchOptions'
import RouteNotifyDialog from './RouteNotifyDialog.vue'
import StatusTag from './StatusTag.vue'
import TrainChip from './TrainChip.vue'

const props = defineProps<{ route: SavedRoute; now: number }>()
/** „Więcej połączeń” — wyszukiwarka na stronie startowej dla pokazywanego kierunku */
const emit = defineEmits<{ search: [from: StationRef, to: StationRef, options: SearchOptions] }>()
const routes = useRoutes()
const ui = useUi()
const notifyOpen = ref(false)

const key = computed(() => `${props.route.id}|${props.route.dir}`)
const result = computed(() => routes.results[key.value])
const busy = computed(() => !!routes.loading[key.value])
// odjechane znikają od razu, nie dopiero po odświeżeniu z serwera
const list = computed(() => (result.value ? upcoming(result.value.connections, props.now, 3) : []))
const dirs = computed(() => (['ab', 'ba'] as const).map((dir) => ({ dir, ...ends(props.route, dir) })))
const current = computed(() => ends(props.route))
const notifyLines = computed(() => (['ab', 'ba'] as const)
  .filter((d) => props.route.notify?.[d])
  .map((d) => `${ends(props.route, d).to.name}: ${windowLabel(props.route.notify![d]!)}`))
const optionsNote = computed(() => optionsSummary(props.route.options))

const depDelay = (c: Connection) => c.legs[0].departureDelay ?? 0
const arrDelay = (c: Connection) => c.legs[c.legs.length - 1].arrivalDelay ?? 0
const arrival = (c: Connection) => (arrDelay(c) >= 2 ? c.legs[c.legs.length - 1].expectedArrival : c.arrival)
const transfers = (c: Connection) => (c.transfers
  ? `${c.transfers} ${plural(c.transfers, 'przesiadka', 'przesiadki', 'przesiadek')} (${c.via.map((v) => v.name).join(', ')})`
  : 'bezpośrednio')
const km = (c: Connection) => (c.distanceKm ? `${c.distanceApprox ? 'ok. ' : ''}${c.distanceKm} km` : '')
const intercity = (c: Connection) => c.legs.some((l) => isIntercity(l.agency))
function countdown(c: Connection) {
  const m = minutesUntil(expectedDeparture(c), props.now)
  return m < 60 ? relative(Math.max(0, m)) : ''
}

function remove() {
  const removed = routes.remove(props.route.id)
  if (removed) ui.notify('Usunięto trasę', { label: 'Cofnij', run: () => routes.restore(removed) })
}
</script>

<template>
  <article class="route card" :aria-label="`Trasa ${route.a.name} – ${route.b.name}`">
    <div class="head">
      <span class="head-ic"><v-icon icon="route" /></span>
      <div class="min-w-0">
        <h3 class="text-title-medium title">{{ route.a.name }} – {{ route.b.name }}</h3>
        <div v-if="optionsNote" class="text-body-small muted">{{ optionsNote }}</div>
      </div>
      <span class="d-flex">
        <v-btn
          :icon="route.notify ? 'notifications_active' : 'notifications'"
          variant="text"
          size="small"
          :loading="!!routes.pending[route.id]"
          :aria-pressed="!!route.notify"
          :aria-label="route.notify ? 'Zmień powiadomienia o tej trasie' : 'Powiadamiaj o opóźnieniach na tej trasie'"
          :title="route.notify ? 'Powiadomienia włączone' : 'Powiadamiaj o opóźnieniach'"
          @click="notifyOpen = true"
        />
        <v-btn icon="close" variant="text" size="small" aria-label="Przestań obserwować trasę" @click="remove" />
      </span>
    </div>

    <div class="dirs" role="group" aria-label="Kierunek">
      <button
        v-for="d in dirs"
        :key="d.dir"
        type="button"
        class="dir"
        :aria-pressed="route.dir === d.dir"
        :aria-label="`Z ${d.from.name} do ${d.to.name}`"
        @click="routes.setDir(route.id, d.dir)"
      >
        <v-icon icon="arrow_forward" size="16" /><span class="ellipsis">{{ d.to.name }}</span>
      </button>
    </div>

    <div class="rows" aria-live="polite">
      <div v-for="c in list" :key="c.legs.map((l) => l.key).join('+')" class="row">
        <div class="row-top">
          <span class="times tnum" :aria-label="`Odjazd ${clock(expectedDeparture(c))}, przyjazd ${clock(arrival(c))}`">
            <span :class="{ late: depDelay(c) >= 2 }">{{ clock(expectedDeparture(c)) }}</span>
            <span v-if="depDelay(c) >= 2" class="was">{{ clock(c.departure) }}</span>
            <v-icon icon="arrow_forward" size="16" class="muted" />
            <span :class="{ late: arrDelay(c) >= 2 }">{{ clock(arrival(c)) }}</span>
          </span>
          <span class="row-end">
            <span v-if="countdown(c)" class="countdown text-body-medium">{{ countdown(c) }}</span>
            <StatusTag v-if="c.legs[0].departureDelay !== null" :delay="c.legs[0].departureDelay" />
          </span>
        </div>
        <div class="row-meta">
          <TrainChip v-for="l in c.legs" :key="l.key" :number="l.number" :trip-key="l.key" :bus="l.isBus" :agency="l.agency" />
          <span class="text-body-small muted">{{ transfers(c) }}<template v-if="km(c)"> · {{ km(c) }}</template></span>
          <span v-if="intercity(c)" class="ic-tag text-label-medium"><v-icon icon="confirmation_number" size="16" />PKP Intercity · osobny bilet</span>
        </div>
      </div>
      <v-skeleton-loader v-if="!result && busy" type="list-item-two-line@2" color="transparent" />
      <p v-else-if="result?.error && !list.length" class="text-body-medium text-error">{{ result.error }}</p>
      <p v-else-if="result && !list.length && !busy" class="text-body-medium muted">Brak połączeń w ciągu 12 godzin.</p>
    </div>

    <div class="foot">
      <span v-if="notifyLines.length" class="notify-line text-body-small">
        <v-icon icon="notifications_active" size="16" />
        <span>{{ notifyLines.join(' · ') }}</span>
      </span>
      <v-btn variant="text" append-icon="chevron_right" class="more" @click="emit('search', current.from, current.to, route.options)">Więcej połączeń</v-btn>
    </div>

    <RouteNotifyDialog v-model="notifyOpen" :route="route" />
  </article>
</template>

<style scoped>
.route { display: grid; gap: 12px; padding: 16px; min-width: 0; }
.head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 12px; }
.head-ic {
  display: grid; place-items: center; width: 40px; height: 40px; border-radius: var(--kw-r-m);
  background: rgb(var(--v-theme-primary-container)); color: rgb(var(--v-theme-on-primary-container));
}
.title { overflow-wrap: anywhere; }

/* kierunek: dwie pigułki (wybrana grafitowa, jak w oknie opcji) */
.dirs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.dir {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-width: 0; height: 40px; padding: 0 12px;
  border: 1px solid rgb(var(--v-theme-outline-variant)); border-radius: 999px; background: transparent; color: rgb(var(--v-theme-on-surface));
  font: inherit; font-size: 14px; font-weight: 700; cursor: pointer;
}
.dir .v-icon { flex: none; }
.dir:hover { background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 6%, transparent); }
.dir[aria-pressed='true'] { border-color: transparent; background: rgb(var(--v-theme-inverse-surface)); color: rgb(var(--v-theme-on-inverse-surface)); }
.dir:focus-visible { outline: 3px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }

.rows { display: grid; gap: 8px; }
.row { display: grid; gap: 6px; padding: 10px 12px; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-surface-container)); }
.row-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.times { display: inline-flex; align-items: baseline; gap: 6px; font-size: 20px; line-height: 26px; font-weight: 800; }
.times .v-icon { align-self: center; }
.times .was { font-size: 13px; font-weight: 500; }
.row-end { display: inline-flex; align-items: center; gap: 8px; }
.countdown { font-weight: 700; color: rgb(var(--v-theme-primary)); }
.row-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.ic-tag {
  display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px 2px 6px; border-radius: 999px;
  background: rgb(var(--v-theme-warning-container)); color: rgb(var(--v-theme-on-warning-container));
}
.foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.notify-line { display: inline-flex; align-items: flex-start; gap: 6px; color: rgb(var(--v-theme-on-surface-variant)); min-width: 0; }
.notify-line .v-icon { margin-top: 1px; color: rgb(var(--v-theme-primary)); flex: none; }
.more { margin-left: auto; }
</style>
