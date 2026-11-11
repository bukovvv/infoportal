<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Connection, Leg } from '@/api/types'
import { useNotices } from '@/stores/data'
import { useJourneys } from '@/stores/journeys'
import { usePrefs } from '@/stores/prefs'
import { useUi } from '@/stores/ui'
import { clock, duration, minutesUntil, plural, relative } from '@/utils/format'
import { agencyCode, agencyName, isIntercity, isPartner } from '@/utils/agency'
import { region } from '@/utils/region'
import { downloadIcs } from '@/utils/ics'
import { connectionUrl, shareConnection } from '@/utils/share'
import { unitLabel, vehicleTitle } from '@/utils/vehicle'
import NoticeStrip from './NoticeStrip.vue'
import RouteBadge from './RouteBadge.vue'
import StatusTag from './StatusTag.vue'
import TrainChip from './TrainChip.vue'

// now: odliczanie „za X min” (bez niego karta pokazuje same godziny); highlight: wyróżnienie najbliższego połączenia
const props = defineProps<{ connection: Connection; now?: number; highlight?: boolean }>()
const journeys = useJourneys()
const notices = useNotices()
const prefs = usePrefs()
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
/** komunikaty o pociągach, stacjach lub liniach tego połączenia */
const related = computed(() => notices.forConnection(c.value).filter(prefs.showsNotice))
const first = computed(() => c.value.legs[0])
const last = computed(() => c.value.legs[c.value.legs.length - 1])
const depDelay = computed(() => first.value.departureDelay ?? 0)
const arrDelay = computed(() => last.value.arrivalDelay ?? 0)
const saved = computed(() => journeys.has(c.value))
const notifying = computed(() => journeys.notifying(c.value))
const notifyBusy = computed(() => !!journeys.pending[journeys.idOf(c.value)])
function toggleNotify() {
  if (notifying.value) void journeys.setNotify(journeys.idOf(c.value), false)
  else void journeys.notifyFor(c.value)
}
/** Godzina z innego dnia niż odjazd (kurs przez północ) dostaje dopisek „+1”. */
const nextDay = (iso: string | null | undefined) => !!iso && iso.slice(0, 10) !== c.value.departure.slice(0, 10)

/** Kolor odcinka: linia z rozkładu, autobus zastępczy neutralnie, bez koloru — kolor akcji. */
const legColor = (leg: Leg) => (leg.isBus ? 'rgb(var(--v-theme-outline))' : leg.route?.color ?? 'rgb(var(--v-theme-primary))')
/** Bilety na odcinku POLREGIO: KW (KML) honorowane na odcinkach wspólnych z przewoźnikiem regionu. W PKP Intercity — osobny bilet. */
function partnerTickets(leg: Leg) {
  const name = agencyName(leg.agency)
  const own = region.agency
  if (isIntercity(leg.agency)) return `Pociąg ${name}: bilety ${own} i POLREGIO nie obowiązują, potrzebny bilet ${name}`
  if (leg.kwTickets === true) return `Pociąg ${name}: bilety ${own} są tu honorowane`
  if (leg.kwTickets === false) return `Pociąg ${name}: na tym odcinku nie jeżdżą pociągi ${own}, potrzebny bilet ${name}`
  return `Pociąg ${name}`
}
/** „102 km”, przy autobusie zastępczym „ok. 45 km”; brak w starszych zapisanych podróżach. */
const km = computed(() => (c.value.distanceKm ? `${c.value.distanceApprox ? 'ok. ' : ''}${c.value.distanceKm} km` : ''))
const intercity = computed(() => c.value.legs.some((l) => isIntercity(l.agency)))
/** „12 przystanków po drodze”, „bez zatrzymań po drodze” */
const stopsLabel = (leg: Leg) => (leg.stopsBetween
  ? `${leg.stopsBetween} ${plural(leg.stopsBetween, 'przystanek', 'przystanki', 'przystanków')} po drodze`
  : 'bez zatrzymań po drodze')
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
        <div class="dur tnum">{{ duration(c.durationMinutes + Math.max(0, arrDelay - depDelay)) }}</div>
        <div class="conn-facts text-body-small muted tnum">
          <span>{{ c.transfers ? `${c.transfers} ${plural(c.transfers, 'przesiadka', 'przesiadki', 'przesiadek')}` : 'bezpośrednio' }}</span>
          <span v-if="km">{{ km }}</span>
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
            <TrainChip :number="leg.number" :trip-key="leg.key" :bus="leg.isBus" :agency="leg.agency" />
            <span v-if="leg.platform" class="text-body-small muted ml-1">peron {{ leg.platform }}</span>
          </span>
        </template>
        <span v-if="intercity" class="ic-tag text-label-medium"><v-icon icon="confirmation_number" size="16" />PKP Intercity · osobny bilet</span>
        <span class="meta-end">
          <span v-if="countdown" class="countdown text-body-medium">{{ countdown }}</span>
          <StatusTag v-if="first.departureDelay !== null" :delay="first.departureDelay" />
        </span>
      </div>
      <NoticeStrip :notices="related" />
    </div>
    <div class="conn-actions">
      <v-btn variant="text" :prepend-icon="expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" :aria-expanded="expanded" @click="expanded = !expanded">Szczegóły</v-btn>
      <v-btn variant="text" :color="saved ? undefined : 'primary'" :prepend-icon="saved ? 'bookmark_added' : 'bookmark_add'" :disabled="saved" @click="watchJourney">
        {{ saved ? 'Obserwujesz' : 'Obserwuj' }}
      </v-btn>
    </div>
    <v-expand-transition>
      <div v-if="expanded" class="conn-detail">
        <div class="detail-actions">
          <button type="button" class="detail-action" :aria-pressed="notifying" :disabled="notifyBusy" @click="toggleNotify">
            <v-icon :icon="notifying ? 'notifications_active' : 'notifications'" />{{ notifying ? 'Powiadamiamy' : 'Powiadom' }}
          </button>
          <button type="button" class="detail-action" @click="downloadIcs(c, connectionUrl(c))">
            <v-icon icon="calendar_add_on" />Do kalendarza
          </button>
          <button type="button" class="detail-action" @click="shareConnection(c)">
            <v-icon icon="share" />Udostępnij
          </button>
        </div>
        <template v-for="(leg, i) in c.legs" :key="leg.key">
          <div class="leg" :style="{ '--leg': legColor(leg) }">
            <span class="leg-t tnum">{{ clock(leg.departure) }}<sup v-if="nextDay(leg.departure)" class="plus-day">+1</sup></span><span class="leg-rail"><i /></span>
            <div class="leg-s">
              <div class="leg-name">{{ leg.from.name }}</div>
              <div class="text-body-small muted d-flex flex-wrap align-center ga-1">
                <RouteBadge :route="leg.route" :bus="leg.isBus" />
                <strong class="leg-no">{{ agencyCode(leg.agency) }} {{ leg.number }}</strong> do {{ leg.headsign }}<template v-if="leg.platform"> · peron {{ leg.platform }}<template v-if="leg.track">, tor {{ leg.track }}</template></template>
              </div>
              <div v-if="isPartner(leg.agency)" class="partner-note text-body-small" :class="{ ic: isIntercity(leg.agency) }">
                <v-icon :icon="isIntercity(leg.agency) ? 'confirmation_number' : 'info'" size="16" />{{ partnerTickets(leg) }}
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
              <component
                :is="leg.stops?.length ? 'button' : 'div'"
                :type="leg.stops?.length ? 'button' : undefined"
                class="leg-facts"
                :aria-expanded="leg.stops?.length ? openLegs.has(leg.key) : undefined"
                @click="leg.stops?.length && toggleLeg(leg.key)"
              >
                <span class="facts">
                  <span><v-icon icon="location_on" size="16" />{{ stopsLabel(leg) }}</span>
                  <span v-if="leg.distanceKm"><v-icon icon="straighten" size="16" />{{ leg.isBus ? 'ok. ' : '' }}{{ leg.distanceKm }} km</span>
                  <span><v-icon icon="schedule" size="16" />{{ duration(legMinutes(leg)) }}</span>
                </span>
                <v-icon v-if="leg.stops?.length" :icon="openLegs.has(leg.key) ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" size="20" class="chev" />
              </component>
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
.conn-main { display: grid; gap: 10px; padding: 14px 16px 6px 18px; }
/* godziny i czas podróży w jednym rzędzie (od 360 px), przesiadki i km pod nimi — nic nie łamie godzin */
.conn-top { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 0 12px; }
.conn-times { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 8px; }
.conn-times .t { font-size: 26px; line-height: 32px; font-weight: 800; letter-spacing: -0.3px; }
.conn-times .t.late { color: rgb(var(--v-theme-warning)); }
.conn-times .was { font-size: 14px; }
.conn-times .v-icon { align-self: center; }
.dur { align-self: start; margin-top: 4px; font-size: 16px; font-weight: 800; white-space: nowrap; }
.conn-facts { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 0 6px; }
.conn-facts > span { white-space: nowrap; }
.conn-facts > span + span::before { content: '·'; margin-right: 6px; }
.strip { display: flex; align-items: center; gap: 6px; }
.strip-seg { height: 6px; border-radius: 3px; flex-basis: 0; }
.strip-stop, .strip-end { flex: none; width: 10px; height: 10px; border-radius: 50%; border: 2px solid rgb(var(--v-theme-on-surface-variant)); }
.meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
.meta-end { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; }
.wait { display: inline-flex; align-items: center; gap: 2px; }
.conn-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 8px 6px; }
.conn-detail { padding: 6px 16px 16px 8px; border-top: 1px solid rgb(var(--v-theme-outline-variant)); }
/* Powiadom / Do kalendarza / Udostępnij: ikona nad podpisem */
.detail-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 4px 0 8px 8px; }
.detail-action {
  display: grid; justify-items: center; gap: 4px; padding: 10px 4px; border: 0; border-radius: var(--kw-r-m); cursor: pointer;
  background: rgb(var(--v-theme-surface-container)); color: rgb(var(--v-theme-primary)); font: inherit; font-size: 13px; font-weight: 700;
}
.detail-action:hover { background: rgb(var(--v-theme-surface-container-high)); }
.detail-action:focus-visible { outline: 3px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
.detail-action[aria-pressed='true'] { background: rgb(var(--v-theme-primary-container)); color: rgb(var(--v-theme-on-primary-container)); }
.detail-action:disabled { opacity: .6; cursor: progress; }
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
.partner-note { display: flex; align-items: center; gap: 6px; margin-top: 4px; color: rgb(var(--v-theme-on-surface-variant)); }
/* PKP Intercity: inny bilet — wyraźnie, jak ostrzeżenie */
.partner-note.ic {
  align-items: flex-start; width: fit-content; margin-top: 6px; padding: 6px 12px 6px 8px; border-radius: var(--kw-r-m);
  background: rgb(var(--v-theme-warning-container)); color: rgb(var(--v-theme-on-warning-container)); font-weight: 600;
}
.partner-note.ic .v-icon { margin-top: 1px; }
.ic-tag {
  display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px 2px 6px; border-radius: 999px;
  background: rgb(var(--v-theme-warning-container)); color: rgb(var(--v-theme-on-warning-container));
}
.leg-drawing { display: flex; align-items: flex-end; gap: 1px; overflow-x: auto; }
.leg-drawing img { flex: none; display: block; max-width: none; }
/* przystanki · km · czas odcinka: kafelek, który się zawija zamiast ucinać; z listą stacji — rozwija ją */
.leg-facts {
  display: flex; align-items: center; gap: 8px; max-width: 100%; margin-top: 8px; padding: 6px 8px 6px 12px;
  border: 0; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-surface-container)); color: rgb(var(--v-theme-on-surface-variant));
  font: inherit; font-size: 14px; line-height: 20px; text-align: left;
}
button.leg-facts { cursor: pointer; }
button.leg-facts:hover { background: rgb(var(--v-theme-surface-container-high)); }
button.leg-facts:focus-visible { outline: 3px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
.facts { display: flex; flex-wrap: wrap; gap: 2px 14px; min-width: 0; }
.facts > span { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.chev { flex: none; color: rgb(var(--v-theme-primary)); }
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
@media (max-width: 400px) { .conn-times { column-gap: 6px; } .conn-times .t { font-size: 22px; } }
</style>
