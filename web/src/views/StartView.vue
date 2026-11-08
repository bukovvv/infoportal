<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { Connection, ConnectionsResult, StationRef } from '@/api/types'
import BandHero from '@/components/BandHero.vue'
import ConnectionCard from '@/components/ConnectionCard.vue'
import FavoriteStations from '@/components/FavoriteStations.vue'
import JourneyCard from '@/components/JourneyCard.vue'
import RouteCard from '@/components/RouteCard.vue'
import NoticeItem from '@/components/NoticeItem.vue'
import StationField from '@/components/StationField.vue'
import BtkHint from '@/components/BtkHint.vue'
import StatusBanner from '@/components/StatusBanner.vue'
import MourningNote from '@/components/MourningNote.vue'
import { MOURNING } from '@/utils/mourning'
import SearchOptionsChip from '@/components/SearchOptionsChip.vue'
import WhenChip from '@/components/WhenChip.vue'
import { useNotices, useStatus } from '@/stores/data'
import { useFavorites } from '@/stores/favorites'
import { useJourneys } from '@/stores/journeys'
import { useRoutes } from '@/stores/routes'
import { read, useUi, write } from '@/stores/ui'
import { clock, dayLabel, plural, warsawNow } from '@/utils/format'
import { changedCount, optionsFromQuery, optionsToApi, optionsToQuery, sanitize, type SearchOptions } from '@/utils/searchOptions'

const route = useRoute()
const router = useRouter()
const notices = useNotices()
const status = useStatus()
const journeys = useJourneys()
const routes = useRoutes()
const favorites = useFavorites()
const ui = useUi()

const initial = warsawNow()
const last = read<{ from?: string; to?: string }>('kw_last_search', {})
const from = ref<string | null>((route.query.z as string) || last.from || null)
const to = ref<string | null>((route.query.do as string) || last.to || null)
const date = ref((route.query.data as string) || initial.date)
const time = ref((route.query.godz as string) || initial.time)
// opcje: z adresu (link udostępniony), inaczej ostatnio używane w tej przeglądarce
const options = ref<SearchOptions>(optionsFromQuery(route.query) ?? sanitize(read<Partial<SearchOptions> | null>('kw_search_options', null)))
const optionsChanged = computed(() => changedCount(options.value) > 0)
const timeMode = ref<'dep' | 'arr'>(route.query.przyj === '1' ? 'arr' : 'dep')
const arriveBy = computed(() => timeMode.value === 'arr')
const result = ref<ConnectionsResult | null>(null)
const searching = ref(false)
const error = ref<string | null>(null)
const now = ref(Date.now())
const resultsEl = ref<HTMLElement | null>(null)
/** wyniki stronami po 4 — „Wcześniejsze”/„Późniejsze” podmieniają listę zamiast dopisywać */
const PAGE = 4

const range = computed(() => ({ min: status.status?.timetable.validFrom, max: status.status?.timetable.validUntil }))

async function search(scroll = true) {
  error.value = null
  if (!from.value || !to.value) { error.value = 'Wybierz stację początkową i docelową z listy podpowiedzi.'; return }
  if (from.value === to.value) { error.value = 'Stacja początkowa i docelowa muszą się różnić.'; return }
  searching.value = true
  try {
    result.value = await api.connections({ from: from.value, to: to.value, date: date.value, time: time.value, arriveBy: arriveBy.value, limit: PAGE, ...optionsToApi(options.value) })
    highlightKey.value = result.value.connections.length ? connKey(result.value.connections[0]) : null
    paged.value = false
    write('kw_last_search', { from: from.value, to: to.value })
    write('kw_search_options', options.value)
    void router.replace({ query: { z: from.value, do: to.value, data: date.value, godz: time.value, ...optionsToQuery(options.value), ...(arriveBy.value ? { przyj: '1' } : {}) }, hash: route.hash })
    if (scroll) requestAnimationFrame(() => resultsEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  } catch (e) {
    error.value = (e as Error).message
    result.value = null
  } finally {
    searching.value = false
  }
}

/** BTK obowiązuje w pociągach regionalnych KW i POLREGIO — nie w interREGIO ani PKP Intercity. */
const btkFits = computed(() => !!result.value?.connections.length && result.value.connections[0].legs.every((l) => l.route?.short !== 'IR' && l.agency !== 'IC'))

/** Nagłówek dnia nad połączeniem, które odjeżdża innego dnia niż poprzednie (lub niż data wyszukiwania). */
function newDay(i: number) {
  const list = result.value!.connections
  return list[i].departure.slice(0, 10) !== (i ? list[i - 1].departure.slice(0, 10) : result.value!.date)
}

function swap() {
  ;[from.value, to.value] = [to.value, from.value]
  if (result.value) void search(false)
}
/** Po zamknięciu okna opcji — zapamiętane i, gdy są wyniki, nowe wyszukiwanie. */
function optionsDone() {
  write('kw_search_options', options.value)
  if (result.value) void search(false)
}
/** Po zamknięciu okna dnia i godziny — nowe wyniki dla zmienionych ustawień. */
function whenChanged() {
  if (result.value) void search(false)
}

const connKey = (c: Connection) => c.legs.map((l) => l.key).join('+')
/** wyróżnione połączenie: pierwsze z wyszukiwania (na innych stronach wyników go nie ma) */
const highlightKey = ref<string | null>(null)
/** strona inna niż z wyszukiwania — nagłówek „od” pierwszego odjazdu na liście */
const paged = ref(false)
const paging = ref<'earlier' | 'later' | null>(null)
const resultsInfo = computed(() => {
  const r = result.value
  if (!r) return ''
  const n = r.connections.length
  const count = `${n} ${plural(n, 'połączenie', 'połączenia', 'połączeń')}`
  if (!n) return r.arriveBy ? `z przyjazdem do ${r.time}` : `od ${r.time}`
  if (r.arriveBy && !paged.value) return `${count} z przyjazdem do ${r.time}`
  const a = clock(r.connections[0].departure)
  const b = clock(r.connections[n - 1].departure)
  return a === b ? `${count} · odjazd ${a}` : `${count} · odjazdy ${a}–${b}`
})

/** Zamyka wyniki (stacje zostają w polach) i czyści adres, żeby po odświeżeniu nie wróciły. */
function closeResults() {
  result.value = null
  void router.replace({ query: {}, hash: route.hash })
}

/**
 * Poprzednie albo następne 4 połączenia w miejsce bieżących: wcześniejsze = z przyjazdem przed pierwszym
 * na liście, późniejsze = z odjazdem po ostatnim (niezależnie od trybu odjazd/przyjazd).
 */
async function page(dir: 'earlier' | 'later') {
  const r = result.value
  if (!r?.connections.length || paging.value) return
  const list = r.connections
  const at = dir === 'earlier'
    ? new Date(new Date(list[0].arrival).getTime() - 60_000)
    : new Date(new Date(list[list.length - 1].departure).getTime() + 60_000)
  const w = warsawNow(at)
  paging.value = dir
  try {
    const res = await api.connections({ from: r.from.id, to: r.to.id, date: w.date, time: w.time, arriveBy: dir === 'earlier', limit: PAGE, ...optionsToApi(options.value) })
    if (result.value !== r) return
    const known = new Set(list.map(connKey))
    const fresh = res.connections.filter((c) => !known.has(connKey(c)))
    if (!fresh.length) {
      ui.notify(dir === 'earlier' ? 'Brak wcześniejszych połączeń.' : 'Brak późniejszych połączeń.')
      return
    }
    r.connections = fresh
    paged.value = true
    await nextTick()
    resultsEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } catch (e) {
    ui.notify((e as Error).message)
  } finally {
    paging.value = null
  }
}

/** Moje trasy: trasa z wyników (stacje i opcje wyszukiwania) — oba kierunki na stronie startowej. */
const routeSaved = computed(() => !!result.value && routes.has(result.value.from.id, result.value.to.id))
function watchRoute() {
  const r = result.value
  if (!r || !routes.add(r.from, r.to, options.value)) return
  ui.notify('Dodano do Moich tras', { label: 'Pokaż', run: () => document.getElementById('moje-trasy')?.scrollIntoView({ behavior: 'smooth' }) })
}
/** „Więcej połączeń” z karty trasy: wyszukiwarka od teraz z opcjami trasy. */
function searchRoute(a: StationRef, b: StationRef, o: SearchOptions) {
  const w = warsawNow()
  from.value = a.id
  to.value = b.id
  options.value = { ...o, agencies: [...o.agencies] }
  date.value = w.date
  time.value = w.time
  timeMode.value = 'dep'
  void search()
}

let timer: number | undefined
onMounted(() => {
  if (route.query.z && route.query.do) void search(false)
  timer = window.setInterval(() => { now.value = Date.now() }, 20_000)
  void journeys.refresh()
  void routes.refresh()
  routes.resync()
  if (route.hash === '#szukaj') requestAnimationFrame(() => document.getElementById('skad')?.focus())
  if (route.hash === '#moje-trasy') requestAnimationFrame(() => document.getElementById('moje-trasy')?.scrollIntoView())
})
onBeforeUnmount(() => window.clearInterval(timer))
watch(() => route.hash, (h) => { if (h === '#szukaj') document.getElementById('skad')?.focus() })
const journeyTimer = window.setInterval(() => { void journeys.refresh(); void routes.refresh() }, 60_000)
onBeforeUnmount(() => window.clearInterval(journeyTimer))
</script>

<template>
  <BandHero overlap>
    <div class="hero">
      <h1 id="search-title" class="hero-title">Dokąd jedziesz?</h1>
      <p class="hero-sub">Rozkład pociągów po Wielkopolsce. Szybko i w jednej aplikacji! :)</p>
    </div>
  </BandHero>

  <div class="page start">
    <form id="szukaj" class="search card band-lift" aria-labelledby="search-title" @submit.prevent="search()">
      <StationField id="skad" v-model="from" label="Skąd" icon="trip_origin" hide-details variant="solo-filled" flat class="f-from" />
      <v-btn icon="swap_vert" variant="flat" color="surface-container" class="f-swap" aria-label="Zamień stacje" @click="swap" />
      <StationField v-model="to" label="Dokąd" icon="location_on" hide-details variant="solo-filled" flat class="f-to" />
      <div class="f-opts">
        <WhenChip v-model:date="date" v-model:time="time" v-model:mode="timeMode" :min="range.min" :max="range.max" @done="whenChanged" />
        <SearchOptionsChip v-model="options" @done="optionsDone" />
      </div>
      <v-btn type="submit" size="x-large" prepend-icon="search" :loading="searching" class="f-btn">Szukaj połączeń</v-btn>
      <v-alert v-if="error" color="error-container" icon="error" density="compact" class="f-error">{{ error }}</v-alert>
    </form>

    <MourningNote v-if="MOURNING" />

    <StatusBanner />

    <div class="cols" :class="{ 'has-result': !!result }">
      <section v-if="result" ref="resultsEl" class="results" aria-live="polite" aria-labelledby="results-title">
        <div class="results-head card">
          <div class="results-title">
            <h2 id="results-title" class="text-title-large">
              {{ result.from.name }}<v-icon icon="arrow_forward" size="20" class="muted" />{{ result.to.name }}
            </h2>
            <span class="text-body-medium muted tnum">{{ resultsInfo }}</span>
          </div>
          <v-btn icon="close" variant="text" size="small" color="on-surface-variant" class="results-close" aria-label="Zamknij wyniki" title="Zamknij wyniki" @click="closeResults" />
          <v-btn
            :variant="routeSaved ? 'text' : 'flat'"
            :color="routeSaved ? undefined : 'surface-container-high'"
            :prepend-icon="routeSaved ? 'check' : 'add_road'"
            :disabled="routeSaved"
            size="small"
            class="results-watch"
            @click="watchRoute"
          >
            {{ routeSaved ? 'Obserwujesz trasę' : 'Obserwuj trasę' }}
          </v-btn>
        </div>
        <template v-for="(c, i) in result.connections" :key="connKey(c)">
          <h3 v-if="newDay(i)" class="day-sep text-title-small">{{ dayLabel(c.departure) }}</h3>
          <ConnectionCard :connection="c" :now="now" :highlight="connKey(c) === highlightKey" />
        </template>
        <v-empty-state
          v-if="!result.connections.length"
          icon="search_off"
          title="Brak połączeń w ciągu 12 godzin"
          :text="optionsChanged ? 'Zmień opcje wyszukiwania albo godzinę.' : 'Zmień godzinę. Szukamy pociągów KW, POLREGIO i PKP Intercity w Wielkopolsce.'"
          class="card"
        />
        <nav v-else class="pager" aria-label="Kolejne połączenia">
          <v-btn variant="flat" color="surface-container-high" prepend-icon="chevron_left" :loading="paging === 'earlier'" :disabled="!!paging" @click="page('earlier')">
            Wcześniejsze
          </v-btn>
          <v-btn variant="flat" color="surface-container-high" append-icon="chevron_right" :loading="paging === 'later'" :disabled="!!paging" @click="page('later')">
            Późniejsze
          </v-btn>
        </nav>
        <BtkHint
          v-if="btkFits"
          :stations="[result.from.name, result.to.name, ...result.connections[0].via.map((v) => v.name)]"
          context="trip"
        />
      </section>
      <div v-else ref="resultsEl" class="results-anchor" />

      <div class="aside">
        <section v-if="routes.list.length" id="moje-trasy" class="routes-sec" aria-labelledby="routes-title">
          <div class="section-head"><h2 id="routes-title" class="text-title-large">Moje trasy</h2></div>
          <div class="routes-grid">
            <RouteCard v-for="r in routes.list" :key="r.id" :route="r" :now="now" @search="searchRoute" />
          </div>
        </section>

        <section id="moje-podroze" aria-labelledby="journeys-title">
          <div class="section-head"><h2 id="journeys-title" class="text-title-large">Moje podróże</h2></div>
          <div class="gap-grid">
            <JourneyCard v-for="j in journeys.sorted" :key="j.id" :journey="j" :now="now" />
            <div v-if="!journeys.list.length" class="empty card">
              <span class="empty-ic"><v-icon icon="bookmark" /></span>
              <div class="d-grid ga-1">
                <strong class="text-title-small">Nie obserwujesz żadnej podróży</strong>
                <span class="text-body-medium muted">Wyszukaj połączenie i wybierz „Obserwuj”. Pokażemy tu odliczanie, opóźnienia i komunikaty dla Twojej trasy. Jeździsz tak codziennie? Wybierz „Obserwuj trasę” nad wynikami.</span>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="favorites-title">
          <div class="section-head">
            <h2 id="favorites-title" class="text-title-large">Ulubione stacje</h2>
            <v-btn v-if="favorites.ids.length" variant="text" append-icon="chevron_right" to="/odjazdy">Tablica</v-btn>
          </div>
          <FavoriteStations v-if="favorites.ids.length" :now="now" />
          <div v-else class="empty card">
            <span class="empty-ic"><v-icon icon="star" /></span>
            <div class="d-grid ga-1">
              <strong class="text-title-small">Nie masz ulubionych stacji</strong>
              <span class="text-body-medium muted">Na <router-link to="/odjazdy">tablicy odjazdów</router-link> wybierz gwiazdkę przy stacji. Pokażemy tu najbliższe odjazdy, a stacja będzie pierwsza na liście w wyszukiwarce.</span>
            </div>
          </div>
        </section>

        <section aria-labelledby="notices-title">
          <div class="section-head">
            <h2 id="notices-title" class="text-title-large">Komunikaty</h2>
            <v-btn variant="text" append-icon="chevron_right" to="/komunikaty">Wszystkie</v-btn>
          </div>
          <div v-if="notices.loaded && !notices.list.length" class="empty card">
            <span class="empty-ic ok"><v-icon icon="check_circle" /></span>
            <div class="d-grid ga-1">
              <strong class="text-title-small">Brak aktywnych komunikatów</strong>
              <span class="text-body-medium muted">Ruch odbywa się zgodnie z rozkładem, o ile pojedynczy pociąg nie ma opóźnienia.</span>
            </div>
          </div>
          <div v-else class="card notices">
            <NoticeItem v-for="n in notices.list.slice(0, 2)" :key="n.id" :notice="n" compact link />
            <v-skeleton-loader v-if="!notices.loaded" type="list-item-avatar-three-line" color="transparent" />
          </div>
        </section>

        <p class="text-body-small muted footnote">
          zanimwyjdziesz.pl to niezależny serwis informacji pasażerskiej. Dane o połączeniach i opóźnieniach mogą różnić się od sytuacji na kolei. <router-link to="/o-nas">O nas</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero { display: grid; gap: 4px; padding-top: 4px; }
.hero-title { font-size: 30px; line-height: 36px; font-weight: 800; letter-spacing: -0.3px; }
.hero-sub { font-size: 16px; opacity: .85; }
.start { display: grid; gap: 24px; grid-template-columns: minmax(0, 1fr); padding-top: 0; }

/* wyszukiwarka: Skąd i Dokąd (z zamianą), pod nimi dzień i godzina jako chip, przycisk; na komputerze stacje i przycisk w jednym rzędzie */
.search {
  display: grid; gap: 10px; padding: 16px; align-items: center;
  grid-template-columns: minmax(0, 1fr) 48px;
  grid-template-areas: 'from swap' 'to swap' 'opts opts' 'btn btn' 'err err';
}
.f-from { grid-area: from; }
.f-to { grid-area: to; }
.f-swap { grid-area: swap; justify-self: center; }
.f-opts { grid-area: opts; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0; }
/* oba chipy w jednym rzędzie także na wąskim telefonie (360 px) */
.f-btn { grid-area: btn; margin-top: 2px; }
.f-error { grid-area: err; }
.search :deep(.v-field--variant-solo-filled) { background: rgb(var(--v-theme-surface-container)); }
@media (min-width: 960px) {
  .search {
    padding: 20px; gap: 12px 8px;
    grid-template-columns: minmax(0, 1fr) 48px minmax(0, 1fr) auto;
    grid-template-areas: 'from swap to btn' 'opts opts opts opts' 'err err err err';
  }
  .f-swap :deep(.v-icon) { transform: rotate(90deg); }
  .f-btn { height: 56px !important; margin: 0 0 0 4px; }
}

.cols { display: grid; gap: 24px; grid-template-columns: minmax(0, 1fr); align-items: start; }
/* minmax(0, 1fr): przewijany w bok pasek ulubionych stacji nie rozpycha strony na telefonie */
.aside { display: grid; gap: 24px; align-content: start; min-width: 0; grid-template-columns: minmax(0, 1fr); }
/* bez wyników: podróże, ulubione i komunikaty obok siebie */
@media (min-width: 1145px) {
  .cols.has-result { grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); }
  .cols:not(.has-result) .aside { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .cols:not(.has-result) .footnote, .cols:not(.has-result) .routes-sec { grid-column: 1 / -1; }
}
/* trasy: bez wyników na całą szerokość, karty obok siebie */
.routes-sec { scroll-margin-top: 80px; min-width: 0; }
.routes-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); }
.has-result .routes-grid { grid-template-columns: minmax(0, 1fr); }
.results { display: grid; gap: 12px; scroll-margin-top: 80px; min-width: 0; }
.results-anchor { display: none; }
/* nagłówek wyników: trasa i zakres godzin, ✕ w rogu, pod spodem „Obserwuj trasę” */
.results-head {
  display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: 'title close' 'watch watch';
  align-items: start; gap: 8px; padding: 14px 8px 12px 18px;
}
.results-title { grid-area: title; display: grid; gap: 2px; min-width: 0; }
.results-title h2 { display: flex; align-items: center; flex-wrap: wrap; gap: 0 8px; font-weight: 800; }
.results-close { grid-area: close; margin: -6px 0; }
.results-watch { grid-area: watch; justify-self: start; margin-left: -4px; }
@media (min-width: 600px) {
  .results-head { grid-template-columns: minmax(0, 1fr) auto auto; grid-template-areas: 'title watch close'; align-items: center; padding: 12px 8px 12px 18px; }
  .results-watch, .results-close { margin: 0; }
}
/* Wcześniejsze / Późniejsze: dwie równe pigułki pod listą */
.pager { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }

.day-sep { margin-top: 8px; padding: 0 4px; color: rgb(var(--v-theme-primary)); }
.day-sep::first-letter { text-transform: uppercase; }
.notices { overflow: hidden; }
.empty { display: flex; align-items: flex-start; gap: 16px; padding: 16px; }
.empty-ic {
  display: grid; place-items: center; width: 40px; height: 40px; flex: none; border-radius: var(--kw-r-m);
  background: rgb(var(--v-theme-surface-container-high)); color: rgb(var(--v-theme-on-surface-variant));
}
.empty-ic.ok { background: rgb(var(--v-theme-success-container)); color: rgb(var(--v-theme-on-success-container)); }
.d-grid { display: grid; }
.footnote { max-width: 70ch; padding: 0 4px; }
@media (max-width: 839px) {
  .hero-title { font-size: 28px; line-height: 34px; }
  .hero-sub { display: none; }
}
</style>
