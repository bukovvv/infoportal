<script setup lang="ts">
// Mapa: pociąg po dotknięciu pastylki — plan kursu: zwarty nagłówek (numer i cel, linia stanu, małe pigułki akcji),
// dalej stacje krok po kroku (przejechane i dalsze zwinięte). Panel wysuwa się od dołu na środku mapy.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { Trip, TripStop } from '@/api/types'
import NoticeStrip from '@/components/NoticeStrip.vue'
import RouteBadge from '@/components/RouteBadge.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useNotices, useStations } from '@/stores/data'
import { agencyLabel, agencyName, isIntercity, isPartner, shortNumber, trainLabel } from '@/utils/agency'
import { clock, dayLabel, minutesUntil, plural, relative, warsawNow } from '@/utils/format'
import { region, regionPath } from '@/utils/region'
import { stationRank } from '@/utils/mapLines'
import { shareLink } from '@/utils/share'
import { departureAfterDwell, stopTime, tripPlan } from '@/utils/tripPlan'
import { VEHICLE_KINDS } from '@/utils/vehicle'

// pending — wybrano inny pociąg, a jego kurs jeszcze się wczytuje (do tego czasu stary, przygaszony — bez mignięcia pustym panelem)
const props = defineProps<{ trip: Trip | null; error: string | null; collapsed: boolean; pending?: boolean }>()
const emit = defineEmits<{ close: []; collapse: [value: boolean]; fit: []; retry: []; leg: [key: string]; height: [px: number] }>()
const router = useRouter()
const notices = useNotices()
const stations = useStations()

const now = ref(Date.now())
const timer = window.setInterval(() => { now.value = Date.now() }, 30_000)
watch(() => props.trip, () => { now.value = Date.now() })

/**
 * Widoczna wysokość panelu (zwinięty — sam nagłówek) — mapa trzyma pociąg nad nim.
 * Zwinięty panel zjeżdża w dół (translate) zamiast tracić treść, więc zwijanie i rozwijanie są płynne.
 */
const el = ref<HTMLElement | null>(null)
const band = ref<HTMLElement | null>(null)
const peek = ref(0)
const visibleHeight = () => (props.collapsed ? band.value?.offsetHeight ?? 0 : el.value?.offsetHeight ?? 0)
let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(() => {
    peek.value = band.value?.offsetHeight ?? 0
    emit('height', visibleHeight())
  })
  if (el.value) observer.observe(el.value)
  if (band.value) observer.observe(band.value)
})
watch(() => props.collapsed, () => emit('height', visibleHeight()))
onBeforeUnmount(() => {
  window.clearInterval(timer)
  observer?.disconnect()
  emit('height', 0)
})
defineExpose({ visibleHeight })

/** Przeciąganie za nagłówek: w dół zwija (zwinięty — zamyka), w górę rozwija; w trakcie panel jedzie za palcem. */
const drag = ref<{ y: number; dy: number; id: number } | null>(null)
function dragStart(e: PointerEvent) {
  if ((e.target as HTMLElement).closest('button:not(.handle), a') || e.button > 0) return
  drag.value = { y: e.clientY, dy: 0, id: e.pointerId }
  try {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  } catch { /* wskaźnik już nieaktywny — przeciąganie zadziała bez przechwycenia */ }
}
function dragMove(e: PointerEvent) {
  if (drag.value?.id === e.pointerId) drag.value.dy = e.clientY - drag.value.y
}
function dragEnd(e: PointerEvent) {
  const d = drag.value
  if (!d || d.id !== e.pointerId) return
  drag.value = null
  if (Math.abs(d.dy) < 8) {
    // dotknięcie uchwytu albo nagłówka zwiniętego panelu — przełącza
    if ((e.target as HTMLElement).closest('.handle') || props.collapsed) emit('collapse', !props.collapsed)
  } else if (d.dy > 48) {
    if (props.collapsed) emit('close')
    else emit('collapse', true)
  } else if (d.dy < -48 && props.collapsed) emit('collapse', false)
}
const dragStyle = computed(() => {
  const d = drag.value
  if (!d || Math.abs(d.dy) < 8) return undefined
  // rozwinięty w górę stawia opór, zwinięty wyjeżdża najwyżej do pełnej wysokości
  const y = props.collapsed
    ? `max(0px, calc(100% - ${peek.value}px + ${Math.round(d.dy)}px))`
    : `${Math.round(d.dy > 0 ? d.dy : d.dy / 3)}px`
  return { translate: `0 ${y}`, transition: 'none' }
})

const category = computed(() => {
  const t = props.trip
  if (!t) return ''
  if (t.isBus) return 'Zastępcza komunikacja autobusowa'
  // pisownia przewoźnika: „Intercity” (w rozkładzie bywa „InterCity”, „Express InterCity”)
  if (isIntercity(t.agency)) return (t.route?.long || 'PKP Intercity').replace(/InterCity/g, 'Intercity')
  if (t.route?.id === 'PR_IR') return 'interREGIO'
  return t.route?.id === 'KW_P' || t.route?.id === 'PR_RP' ? 'Pociąg przyspieszony' : 'Pociąg osobowy'
})
/** dzień kursu tylko, gdy nie dzisiejszy (nocne kursy z wczoraj, jutrzejsze z tablicy stacji) */
const day = computed(() => {
  const d = props.trip?.serviceDate
  if (!d) return ''
  const today = warsawNow(new Date(now.value)).date
  const tomorrow = warsawNow(new Date(now.value + 86_400_000)).date
  const yesterday = warsawNow(new Date(now.value - 86_400_000)).date
  return d === today ? '' : d === tomorrow ? 'jutro' : d === yesterday ? 'wczoraj' : dayLabel(`${d}T12:00:00`)
})
/** kolor osi jak trasa kursu na mapie (z rozkładu; autobus zastępczy neutralnie) */
const color = computed(() => (props.trip?.isBus || !props.trip?.route?.color ? 'rgb(var(--v-theme-outline))' : props.trip.route.color))
const related = computed(() => (props.trip && !isPartner(props.trip.agency)
  ? notices.forTrip(props.trip.numbers.length ? props.trip.numbers : [props.trip.number], props.trip.stops.map((s) => s.station))
  : []))

const plan = computed(() => (props.trip ? tripPlan(props.trip, now.value) : null))
const stops = computed(() => props.trip?.stops ?? [])
const last = computed(() => stops.value.length - 1)
const timeOf = (i: number) => stopTime(stops.value[i], i === 0)
const short = (name: string) => name.replace(/ Wielkopolsk(i|a|ie)$/, ' Wlkp.')

/** Duże godziny w nagłówku: najbliższa stacja (albo odjazd ze stacji, na której stoi) i cel. */
const nextBlock = computed(() => {
  const p = plan.value
  if (!p || p.next === null || p.next === last.value) return null
  const s = stops.value[p.next]
  if (p.phase === 'dwelling' || p.phase === 'before') {
    const dep = p.phase === 'before' ? timeOf(p.next) : departureAfterDwell(s) ?? stopTime(s, true)
    if (!dep) return null
    const m = minutesUntil(dep.best, now.value)
    // stacja odjazdu jest w planie pod spodem — tu krótko
    return { label: `odjazd ${m >= 1 ? relative(m) : 'zaraz'}`, time: dep.best }
  }
  const t = timeOf(p.next)
  if (!t) return null
  const m = minutesUntil(t.best, now.value)
  return { label: `${short(s.station.name)} ${m >= 1 ? relative(m) : 'zaraz'}`, time: t.best }
})
const destBlock = computed(() => {
  if (!stops.value.length) return null
  const t = timeOf(last.value)
  const s = stops.value[last.value]
  return t ? { label: plan.value?.phase === 'done' ? `dojechał · ${short(s.station.name)}` : short(s.station.name), time: t.best, platform: s.platform } : null
})

/** „Teraz” na osi: w drodze — między stacjami, na stacji — nazwa. */
const nowText = computed(() => {
  const p = plan.value
  if (!p || p.prev === null) return null
  if (p.phase === 'moving' && p.next !== null) return `${short(stops.value[p.prev].station.name)} → ${short(stops.value[p.next].station.name)}`
  if (p.phase === 'dwelling') return `Na stacji ${short(stops.value[p.prev].station.name)}`
  return null
})

const showPassed = ref(false)
const showAll = ref(false)
watch(() => props.trip?.key, () => { showPassed.value = false; showAll.value = false })
const passed = computed(() => (plan.value?.phase === 'done' ? [] : stops.value.slice(0, plan.value?.passed ?? 0).map((_, i) => i)))
const ahead = computed(() => {
  const p = plan.value
  if (!p || p.phase === 'done') return stops.value.map((_, i) => i)
  return stops.value.map((_, i) => i).slice(p.phase === 'unknown' ? 0 : p.passed)
})
/** dalsze stacje: najbliższe trzy, zwinięta reszta i cel */
const SHOWN = 3
const hidden = computed(() => (showAll.value || ahead.value.length <= SHOWN + 2 ? [] : ahead.value.slice(SHOWN, -1)))
const visibleAhead = computed(() => (hidden.value.length ? [...ahead.value.slice(0, SHOWN), ...ahead.value.slice(-1)] : ahead.value))
const hiddenText = computed(() => {
  const n = hidden.value.length
  const major = hidden.value.map((i) => stops.value[i].station).filter((s) => {
    const st = stations.byId.get(s.id)
    return st && stationRank(st) >= 2
  }).slice(0, 2).map((s) => short(s.name))
  return `i ${n} ${plural(n, 'kolejna stacja', 'kolejne stacje', 'kolejnych stacji')}${major.length ? `, w tym ${major.join(' i ')}` : ''}`
})

function rowState(i: number) {
  const p = plan.value
  return {
    passed: !!p && (p.phase === 'done' || i < p.passed),
    next: !!p && p.next === i && p.phase !== 'done',
    terminal: i === 0 || i === last.value,
  }
}
const extra = (s: TripStop) => (s.requestOnly ? 'na żądanie' : '')

function fullView() {
  if (!props.trip) return
  void router.push({ name: 'train', params: { number: props.trip.number.split('/')[0] }, query: { kurs: props.trip.key } })
}
function share() {
  const t = props.trip
  if (!t) return
  void shareLink({ title: trainLabel(t), text: `${trainLabel(t)} ${t.origin} → ${t.destination}`, url: `${location.origin}${regionPath('/pociag/' + t.number.split('/')[0])}` })
}
</script>

<template>
  <section ref="el" class="map-train" :class="{ collapsed, pending, dragging: !!dragStyle }" :style="[{ '--peek': `${peek}px` }, dragStyle]" :aria-label="trip ? `Pociąg ${trainLabel(trip)}` : 'Pociąg'">
    <header ref="band" class="band" @pointerdown="dragStart" @pointermove="dragMove" @pointerup="dragEnd" @pointercancel="drag = null">
      <!-- myszą i palcem przełącza dragEnd; tu tylko klawiatura (detail = 0) -->
      <button type="button" class="handle" :aria-label="collapsed ? 'Rozwiń plan kursu' : 'Zwiń plan kursu'" :aria-expanded="!collapsed" @click="(e: MouseEvent) => { if (!e.detail) emit('collapse', !collapsed) }"><span /></button>
      <template v-if="trip">
        <div class="top">
          <RouteBadge :route="trip.route" :bus="trip.isBus" class="badge" />
          <h2 class="title">{{ agencyLabel(trip.agency) }} {{ shortNumber(trip.number) }} → {{ trip.destination }}</h2>
          <v-btn icon="close" variant="text" size="36" class="close" aria-label="Zamknij" @click="emit('close')" />
        </div>
        <!-- najważniejsze w jednej linii: opóźnienie, najbliższa stacja, przyjazd do celu -->
        <p class="status">
          <StatusTag :delay="trip.realtime.delay" :source="trip.realtime.source" :cancelled="trip.realtime.cancelled" :estimated="trip.position?.source === 'est'" />
          <span class="status-text"><template v-if="day">{{ day }} · </template>{{ nextBlock?.label ?? destBlock?.label }}</span>
          <!-- przyjazd do celu (nazwa jest w tytule) — nie ucina się -->
          <span v-if="destBlock && nextBlock" class="arr">przyjazd <strong>{{ clock(destBlock.time) }}</strong></span>
          <span v-else-if="destBlock" class="arr"><strong>{{ clock(destBlock.time) }}</strong><template v-if="destBlock.platform"> · peron {{ destBlock.platform }}</template></span>
        </p>
        <div class="acts">
          <button v-if="trip.shape.length || trip.stops.length > 1" type="button" class="act" @click="emit('fit')"><v-icon icon="route" size="18" />Cała trasa</button>
          <button type="button" class="act" @click="share"><v-icon icon="share" size="18" />Udostępnij</button>
          <button type="button" class="act" @click="fullView"><v-icon icon="open_in_full" size="18" />Szczegóły</button>
        </div>
      </template>
      <div v-else-if="error" class="top">
        <p class="grow">{{ error }}</p>
        <v-btn variant="text" @click="emit('retry')">Spróbuj ponownie</v-btn>
        <v-btn icon="close" variant="text" size="36" class="close" aria-label="Zamknij" @click="emit('close')" />
      </div>
      <div v-else class="top">
        <v-skeleton-loader type="heading, text" color="transparent" class="grow" />
        <v-btn icon="close" variant="text" size="36" class="close" aria-label="Zamknij" @click="emit('close')" />
      </div>
    </header>

    <div v-if="trip" class="body" :style="{ '--line': color }" :inert="collapsed || undefined">
      <v-alert v-if="trip.realtime.cancelled" color="error-container" icon="cancel-fill" density="compact" class="mb-2">Ten kurs dziś nie jedzie.</v-alert>
      <NoticeStrip v-if="related.length" :notices="related" :max="1" class="mb-2" />
      <p v-if="isIntercity(trip.agency)" class="note ic"><v-icon icon="confirmation_number" size="18" />Bilety {{ region.agencyLabel }} i POLREGIO nie obowiązują, potrzebny bilet {{ agencyName(trip.agency) }}.</p>
      <p v-if="trip.otherLegs.length" class="note">
        <v-icon icon="info" size="18" />
        <span>Ten kurs ma też odcinek:
          <a v-for="leg in trip.otherLegs" :key="leg.key" href="#" @click.prevent="emit('leg', leg.key)">{{ leg.isBus ? 'autobus' : 'pociąg' }} {{ leg.from }} – {{ leg.to }}</a>
        </span>
      </p>

      <ol class="plan">
        <li v-if="passed.length" class="row fold" :class="{ open: showPassed }">
          <button type="button" class="fold-btn" :aria-expanded="showPassed" @click="showPassed = !showPassed">
            <span class="fold-text">{{ passed.length }} {{ plural(passed.length, 'stacja', 'stacje', 'stacji') }} za nami · {{ short(stops[0].station.name) }} {{ clock(timeOf(0)?.best) }}</span>
            <v-icon :icon="showPassed ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" size="20" />
          </button>
        </li>
        <template v-for="i in [...(showPassed ? passed : []), ...visibleAhead]" :key="i">
          <li v-if="nowText && plan?.prev !== null && i === (plan?.phase === 'dwelling' ? plan?.prev : plan!.passed)" class="row now">
            <span class="dot-now"><svg v-if="plan?.phase === 'moving'" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 2.5V12M3 8L7 12L11 8" /></svg></span>
            <span class="now-text">Teraz: {{ nowText }}</span>
          </li>
          <li v-if="hidden.length && i === visibleAhead[visibleAhead.length - 1]" class="row fold">
            <button type="button" class="fold-btn" :aria-expanded="false" @click="showAll = true">
              <span class="fold-text">{{ hiddenText }}</span>
              <v-icon icon="keyboard_arrow_down" size="20" />
            </button>
          </li>
          <li class="row stop" :class="rowState(i)">
            <span class="dot" />
            <span class="what">
              <span class="st-name" :class="{ gone: stops[i].skipped }">{{ stops[i].station.name }}</span>
              <span v-if="stops[i].skipped" class="st-extra">bez postoju</span>
              <span v-else-if="extra(stops[i]) || departureAfterDwell(stops[i])" class="st-extra">
                <template v-if="departureAfterDwell(stops[i]) && i !== 0">odjazd {{ clock(departureAfterDwell(stops[i])!.best) }}<template v-if="extra(stops[i])"> · </template></template>{{ extra(stops[i]) }}
              </span>
            </span>
            <span v-if="!stops[i].skipped && timeOf(i)" class="tm">
              <s v-if="timeOf(i)!.expected" class="tm-plan">{{ clock(timeOf(i)!.plan) }}</s>
              <span :class="{ late: timeOf(i)!.expected }">{{ clock(timeOf(i)!.best) }}</span>
            </span>
            <span v-if="stops[i].platform && !stops[i].skipped" class="pl" :title="`peron ${stops[i].platform}`" :aria-label="`peron ${stops[i].platform}`">{{ stops[i].platform }}</span>
            <span v-else class="pl none" />
          </li>
        </template>
      </ol>
      <p class="src text-body-small">
        {{ category }}<template v-if="trip.distanceKm"> · {{ trip.distanceKm }} km</template><template v-if="trip.vehicleType"> · {{ VEHICLE_KINDS[trip.vehicleType.kind].name }}</template>.
        <template v-if="trip.realtime.source === 'rt'">Opóźnienia z systemu PKP PLK.</template>
        <template v-else>Godziny według rozkładu jazdy.</template>
        <template v-if="trip.position?.source === 'gps' && trip.position.gpsProvider"> Pozycja GPS: {{ trip.position.gpsProvider }}.</template>
        <template v-if="trip.trimmed"> Pokazujemy stacje {{ region.inName }}.</template>
      </p>
    </div>
  </section>
</template>

<style scoped>
/* na komputerze na środku mapy przy dolnej krawędzi, na telefonie na całą szerokość */
.map-train {
  position: absolute; z-index: 3; left: 50%; bottom: 0; transform: translateX(-50%); width: min(580px, calc(100% - 160px)); max-height: min(64%, 600px);
  display: flex; flex-direction: column; overflow: hidden; border-radius: var(--kw-r-xl) var(--kw-r-xl) 0 0;
  background: rgb(var(--v-theme-surface)); box-shadow: 0 -4px 22px rgb(0 0 0 / .24);
  /* wysuwanie, zwijanie i powrót po przeciągnięciu: translate (transform zajmuje wyśrodkowanie na komputerze) */
  transition: translate .34s cubic-bezier(.2, 0, 0, 1);
}
/* zwinięty: widać sam nagłówek, reszta pod krawędzią mapy */
.map-train.collapsed { translate: 0 calc(100% - var(--peek)); }
/* wysuwanie przy otwarciu i chowanie (Transition w MapView) — po regule zwiniętego, żeby ją przykryć */
.map-train.sheet-enter-from, .map-train.sheet-leave-to { translate: 0 100%; }
.map-train.sheet-leave-active { transition-duration: .24s; transition-timing-function: cubic-bezier(.3, 0, .8, .15); }
.map-train.pending .band > *:not(.handle), .map-train.pending .body { opacity: .55; transition: opacity .15s; }
/* lista pociągów otwarta z lewej (komputer) — panel na środku pozostałej części mapy */
.map-train.beside-list { left: calc(376px + (100% - 456px) / 2); width: min(560px, calc(100% - 488px)); }
/* nagłówek (wariant A z makiet 2026-11-11, „kompakt”): na tle panelu, bez osobnego bloku; tytuł, linia stanu, małe pigułki */
.band {
  flex: none; display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; padding: 2px 8px 12px 16px;
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant)); touch-action: none; user-select: none;
}
.collapsed .band { cursor: pointer; border-bottom-color: transparent; }
.handle { justify-self: center; display: grid; place-items: center; width: 64px; height: 18px; margin: 0 0 -2px 8px; padding: 0; border: 0; background: none; cursor: pointer; }
.handle span { width: 32px; height: 4px; border-radius: 2px; background: rgb(var(--v-theme-outline-variant)); }
.handle:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); border-radius: 10px; }
.top { display: flex; align-items: center; gap: 8px; }
.grow { flex: 1; min-width: 0; }
.badge { flex: none; }
.title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 18px; line-height: 24px; font-weight: 800; letter-spacing: -0.1px; }
.close { flex: none; margin: -4px 0; color: rgb(var(--v-theme-on-surface-variant)); }
.status { display: flex; align-items: center; gap: 8px; min-width: 0; margin: 0 8px 0 0; font-size: 13px; line-height: 18px; color: rgb(var(--v-theme-on-surface-variant)); }
.status .tag { flex: none; }
.status-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-text { flex: 0 1 auto; }
.arr { flex: none; margin-left: auto; white-space: nowrap; }
.arr strong { color: rgb(var(--v-theme-on-surface)); font-weight: 800; font-variant-numeric: tabular-nums; }
.acts { display: flex; gap: 6px; margin: 4px 8px 0 0; }
.act {
  flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-width: 0; height: 34px; padding: 0 10px;
  border: 0; border-radius: 17px; background: rgb(var(--v-theme-surface-container-high)); color: rgb(var(--v-theme-on-surface));
  font: 600 13px/16px var(--kw-font); white-space: nowrap; cursor: pointer; transition: background .15s;
}
.act:hover { background: rgb(var(--v-theme-surface-container-highest)); }
.act:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }

.body { flex: 1; min-height: 0; overflow-y: auto; padding: 6px 16px 12px 16px; }
.note { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; padding: 8px 10px; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-surface-container)); font-size: 13px; line-height: 18px; }
.note.ic { background: rgb(var(--v-theme-warning-container)); color: rgb(var(--v-theme-on-warning-container)); font-weight: 600; }
.note a { color: inherit; font-weight: 700; margin-left: 4px; }

/* oś kursu: pionowa kreska w kolorze linii, przejechany odcinek wyszarzony */
.plan { position: relative; margin: 0; padding: 0; list-style: none; }
.row { position: relative; display: grid; grid-template-columns: 28px minmax(0, 1fr) auto 32px; align-items: center; column-gap: 10px; min-height: 40px; }
.row::before { content: ''; position: absolute; left: 12px; top: 0; bottom: 0; width: 4px; background: var(--line); }
.row.passed::before, .row.fold:first-child::before { background: rgb(var(--v-theme-outline-variant)); }
.plan > .row.stop:first-child::before { top: 50%; }
.plan > .row:last-child::before { bottom: 50%; }
.dot { position: relative; justify-self: center; width: 10px; height: 10px; border-radius: 50%; background: rgb(var(--v-theme-surface)); box-shadow: 0 0 0 3px var(--line); }
.row.passed .dot { box-shadow: 0 0 0 3px rgb(var(--v-theme-outline-variant)); }
.row.next .dot { width: 14px; height: 14px; box-shadow: 0 0 0 3.5px var(--line); }
.row.terminal .dot { border-radius: 3px; }
.what { display: grid; min-width: 0; padding: 6px 0; }
.st-name { font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row.next .st-name { font-size: 16px; font-weight: 800; }
.row.passed .st-name, .row.passed .tm { color: rgb(var(--v-theme-on-surface-variant)); }
.st-name.gone { text-decoration: line-through; opacity: .7; }
.st-extra { font-size: 12px; color: rgb(var(--v-theme-on-surface-variant)); }
.tm { display: grid; justify-items: end; font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.15; }
.tm-plan { font-size: 12px; font-weight: 600; color: rgb(var(--v-theme-on-surface-variant)); }
.tm .late { color: rgb(var(--v-theme-warning)); }
.pl { display: grid; place-items: center; min-width: 28px; height: 28px; padding: 0 4px; box-sizing: border-box; border-radius: 10px; background: rgb(var(--v-theme-surface-container)); font-size: 13px; font-weight: 800; }
.pl.none { background: none; }
.row.now { min-height: 34px; }
.dot-now { position: relative; justify-self: center; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; background: var(--line); box-shadow: 0 0 0 4px color-mix(in srgb, var(--line) 25%, transparent); }
.dot-now svg { width: 11px; height: 11px; }
.dot-now path { fill: none; stroke: #FFFFFF; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.now-text { grid-column: 2 / -1; font-size: 13px; font-weight: 700; color: rgb(var(--v-theme-on-surface)); }
.fold-btn {
  grid-column: 2 / -1; display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 4px 0 0; border: 0; background: none; cursor: pointer;
  color: rgb(var(--v-theme-on-surface-variant)); font: 700 13px/18px var(--kw-font); text-align: left;
}
.fold-btn:hover .fold-text { text-decoration: underline; }
.fold-btn:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 2px; border-radius: 8px; }
.fold-text { flex: 1; min-width: 0; }
.src { margin-top: 8px; color: rgb(var(--v-theme-on-surface-variant)); }

@media (max-width: 839px) {
  .map-train { left: 0; right: 0; transform: none; width: auto; max-height: 62%; }
  .band { padding: 2px 6px 10px 14px; }
  .act { padding: 0 8px; }
}
</style>
