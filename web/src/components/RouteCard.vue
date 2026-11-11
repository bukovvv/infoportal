<script setup lang="ts">
// Obserwowana trasa na stronie startowej: kierunek w nagłówku (zmiana przyciskiem) i 3 najbliższe połączenia z danymi na żywo.
import { computed, ref } from 'vue'
import type { Connection, StationRef } from '@/api/types'
import { ends, type SavedRoute, useRoutes } from '@/stores/routes'
import { useUi } from '@/stores/ui'
import { agencyLabel, isIntercity, shortNumber } from '@/utils/agency'
import { clock, minutesUntil, plural, relative } from '@/utils/format'
import { expectedDeparture, optionsSummary, upcoming, windowLabel } from '@/utils/routes'
import type { SearchOptions } from '@/utils/searchOptions'
import RouteNotifyDialog from './RouteNotifyDialog.vue'
import StatusTag from './StatusTag.vue'

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
const current = computed(() => ends(props.route))
/** okienko powiadomień pokazywanego kierunku i opcje wyszukiwania — jedna szara linia pod trasą */
const subtitle = computed(() => {
  const w = props.route.notify?.[props.route.dir]
  return [w ? `Powiadomienia ${windowLabel(w)}` : '', optionsSummary(props.route.options)].filter(Boolean).join(' · ')
})
const flip = () => routes.setDir(props.route.id, props.route.dir === 'ab' ? 'ba' : 'ab')

const depDelay = (c: Connection) => c.legs[0].departureDelay ?? 0
const arrDelay = (c: Connection) => c.legs[c.legs.length - 1].arrivalDelay ?? 0
const arrival = (c: Connection) => (arrDelay(c) >= 2 ? c.legs[c.legs.length - 1].expectedArrival : c.arrival)
const transfers = (c: Connection) => (c.transfers
  ? `${c.transfers} ${plural(c.transfers, 'przesiadka', 'przesiadki', 'przesiadek')} (${c.via.map((v) => v.name).join(', ')})`
  : 'bezpośrednio')
/** „IC 262” — numer bez nazwy pociągu, żeby wiersz się nie rozjeżdżał */
const trainLabel = (agency: string | undefined, number: string) => `${agencyLabel(agency)} ${shortNumber(number)}`
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
      <div class="min-w-0">
        <h3 class="text-title-medium title">
          {{ current.from.name }}<v-icon icon="arrow_forward" size="18" class="muted" />{{ current.to.name }}
        </h3>
        <div v-if="subtitle" class="text-body-small muted">{{ subtitle }}</div>
      </div>
      <span class="d-flex">
        <v-btn
          icon="swap_horiz"
          variant="text"
          size="small"
          color="on-surface-variant"
          :aria-label="`Pokaż kierunek do ${current.from.name}`"
          :title="`Kierunek do ${current.from.name}`"
          @click="flip"
        />
        <v-btn
          :icon="route.notify ? 'notifications_active' : 'notifications'"
          variant="text"
          size="small"
          :color="route.notify ? 'primary' : 'on-surface-variant'"
          :loading="!!routes.pending[route.id]"
          :aria-pressed="!!route.notify"
          :aria-label="route.notify ? 'Zmień powiadomienia o tej trasie' : 'Powiadamiaj o opóźnieniach na tej trasie'"
          :title="route.notify ? 'Powiadomienia włączone' : 'Powiadamiaj o opóźnieniach'"
          @click="notifyOpen = true"
        />
        <v-btn icon="close" variant="text" size="small" color="on-surface-variant" aria-label="Przestań obserwować trasę" title="Przestań obserwować" @click="remove" />
      </span>
    </div>

    <div class="rows" aria-live="polite">
      <div v-for="c in list" :key="c.legs.map((l) => l.key).join('+')" class="row">
        <span class="times tnum" :aria-label="`Odjazd ${clock(expectedDeparture(c))}, przyjazd ${clock(arrival(c))}`">
          <span :class="{ late: depDelay(c) >= 2 }">{{ clock(expectedDeparture(c)) }}</span>
          <v-icon icon="arrow_forward" size="14" class="muted" />
          <span :class="{ late: arrDelay(c) >= 2 }">{{ clock(arrival(c)) }}</span>
        </span>
        <span class="row-end">
          <StatusTag v-if="c.legs[0].departureDelay !== null" :delay="c.legs[0].departureDelay" />
          <span v-if="countdown(c)" class="countdown text-body-medium">{{ countdown(c) }}</span>
        </span>
        <span class="row-meta text-body-small muted">
          <template v-for="(l, i) in c.legs" :key="l.key">
            <span v-if="i" aria-hidden="true"> → </span>
            <button type="button" class="train" :aria-label="`Szczegóły pociągu ${trainLabel(l.agency, l.number)}`" @click="ui.openTrain({ key: l.key })">
              <v-icon :icon="l.isBus ? 'directions_bus' : 'train'" size="14" />{{ trainLabel(l.agency, l.number) }}
            </button>
          </template>
          · {{ transfers(c) }}
          <v-icon v-if="intercity(c)" icon="confirmation_number" size="16" class="ic" title="PKP Intercity · osobny bilet" aria-label="PKP Intercity, osobny bilet" />
        </span>
      </div>
      <v-skeleton-loader v-if="!result && busy" type="list-item-two-line@2" color="transparent" />
      <p v-else-if="result?.error && !list.length" class="empty text-body-medium text-error">{{ result.error }}</p>
      <p v-else-if="result && !list.length && !busy" class="empty text-body-medium muted">Brak połączeń w ciągu 12 godzin.</p>
    </div>

    <v-btn variant="text" size="small" append-icon="chevron_right" class="more" @click="emit('search', current.from, current.to, route.options)">Więcej połączeń</v-btn>

    <RouteNotifyDialog v-model="notifyOpen" :route="route" />
  </article>
</template>

<style scoped>
.route { display: grid; gap: 4px; padding: 12px 8px 8px 16px; min-width: 0; align-content: start; }
.head { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; }
.title { display: flex; align-items: center; flex-wrap: wrap; gap: 0 6px; font-weight: 800; overflow-wrap: anywhere; }

/* najbliższe połączenia: zwykła lista z kreskami, bez kafelków */
.rows { display: grid; padding-right: 8px; }
.row {
  display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 2px 8px; padding: 8px 0;
  border-top: 1px solid rgb(var(--v-theme-outline-variant));
}
.row:first-child { border-top: 0; }
.times { display: inline-flex; align-items: baseline; gap: 6px; font-size: 18px; line-height: 24px; font-weight: 800; }
.times .v-icon { align-self: center; }
.row-end { display: inline-flex; align-items: center; justify-content: flex-end; gap: 8px; }
.countdown { font-weight: 700; color: rgb(var(--v-theme-primary)); white-space: nowrap; }
.row-meta { grid-column: 1 / -1; min-width: 0; }
.train {
  display: inline-flex; align-items: center; gap: 3px; padding: 0; border: 0; background: none; font: inherit; font-weight: 700;
  color: rgb(var(--v-theme-on-surface)); cursor: pointer;
}
.train .v-icon { color: rgb(var(--v-theme-primary)); }
.train:hover { text-decoration: underline; }
.train:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 2px; border-radius: 4px; }
.ic { margin-left: 4px; vertical-align: -3px; color: rgb(var(--v-theme-warning)); }
.empty { padding: 8px 0; }
.more { justify-self: end; }
</style>
