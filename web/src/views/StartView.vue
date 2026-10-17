<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { Connection, ConnectionsResult } from '@/api/types'
import BandHero from '@/components/BandHero.vue'
import ConnectionCard from '@/components/ConnectionCard.vue'
import FavoriteStations from '@/components/FavoriteStations.vue'
import JourneyCard from '@/components/JourneyCard.vue'
import NoticeItem from '@/components/NoticeItem.vue'
import StationField from '@/components/StationField.vue'
import BtkHint from '@/components/BtkHint.vue'
import StatusBanner from '@/components/StatusBanner.vue'
import WhenChip from '@/components/WhenChip.vue'
import { useNotices, useStatus } from '@/stores/data'
import { useFavorites } from '@/stores/favorites'
import { useJourneys } from '@/stores/journeys'
import { read, useUi, write } from '@/stores/ui'
import { dayLabel, plural, warsawNow } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const notices = useNotices()
const status = useStatus()
const journeys = useJourneys()
const favorites = useFavorites()
const ui = useUi()

const initial = warsawNow()
const last = read<{ from?: string; to?: string }>('kw_last_search', {})
const from = ref<string | null>((route.query.z as string) || last.from || null)
const to = ref<string | null>((route.query.do as string) || last.to || null)
const date = ref((route.query.data as string) || initial.date)
const time = ref((route.query.godz as string) || initial.time)
const direct = ref(route.query.bezp === '1')
const timeMode = ref<'dep' | 'arr'>(route.query.przyj === '1' ? 'arr' : 'dep')
const arriveBy = computed(() => timeMode.value === 'arr')
const result = ref<ConnectionsResult | null>(null)
const searching = ref(false)
const error = ref<string | null>(null)
const now = ref(Date.now())
const resultsEl = ref<HTMLElement | null>(null)

const range = computed(() => ({ min: status.status?.timetable.validFrom, max: status.status?.timetable.validUntil }))

async function search(scroll = true) {
  error.value = null
  if (!from.value || !to.value) { error.value = 'Wybierz stację początkową i docelową z listy podpowiedzi.'; return }
  if (from.value === to.value) { error.value = 'Stacja początkowa i docelowa muszą się różnić.'; return }
  searching.value = true
  try {
    result.value = await api.connections({ from: from.value, to: to.value, date: date.value, time: time.value, direct: direct.value, arriveBy: arriveBy.value })
    firstIndex.value = 0
    extended.value = false
    write('kw_last_search', { from: from.value, to: to.value })
    void router.replace({ query: { z: from.value, do: to.value, data: date.value, godz: time.value, ...(direct.value ? { bezp: '1' } : {}), ...(arriveBy.value ? { przyj: '1' } : {}) }, hash: route.hash })
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
function toggleDirect() {
  direct.value = !direct.value
  if (result.value) void search(false)
}
/** Po zamknięciu okna dnia i godziny — nowe wyniki dla zmienionych ustawień. */
function whenChanged() {
  if (result.value) void search(false)
}

const connKey = (c: Connection) => c.legs.map((l) => l.key).join('+')
/** wyróżnione połączenie: pierwsze z wyszukiwania (dopisane wcześniejsze go nie przejmują) */
const firstIndex = ref(0)
const highlightKey = computed(() => (result.value?.connections.length ? connKey(result.value.connections[firstIndex.value]) : null))
/** wyniki poszerzone przyciskami — nagłówek bez „od 14:05” */
const extended = ref(false)
const paging = ref<'earlier' | 'later' | null>(null)
const resultsInfo = computed(() => {
  const r = result.value
  if (!r) return ''
  const n = r.connections.length
  const count = `${n} ${plural(n, 'połączenie', 'połączenia', 'połączeń')}`
  return extended.value ? count : `${count} ${r.arriveBy ? 'z przyjazdem do' : 'od'} ${r.time}`
})

/**
 * Wcześniejsze albo późniejsze połączenia dopisywane do listy: wcześniejsze = z przyjazdem przed pierwszym
 * na liście, późniejsze = z odjazdem po ostatnim (niezależnie od trybu odjazd/przyjazd).
 * Wcześniejszych po 3 — strona przewija się do nich (nad listą, poza widokiem).
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
    const res = await api.connections({ from: r.from.id, to: r.to.id, date: w.date, time: w.time, direct: direct.value, arriveBy: dir === 'earlier', limit: dir === 'earlier' ? 3 : undefined })
    if (result.value !== r) return
    const known = new Set(list.map(connKey))
    const fresh = res.connections.filter((c) => !known.has(connKey(c)))
    if (!fresh.length) {
      ui.notify(dir === 'earlier' ? 'Brak wcześniejszych połączeń.' : 'Brak późniejszych połączeń.')
      return
    }
    const first = highlightKey.value
    r.connections = dir === 'earlier' ? [...fresh, ...list] : [...list, ...fresh]
    firstIndex.value = r.connections.findIndex((c) => connKey(c) === first)
    extended.value = true
    if (dir === 'earlier') {
      await nextTick()
      resultsEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  } catch (e) {
    ui.notify((e as Error).message)
  } finally {
    paging.value = null
  }
}

let timer: number | undefined
onMounted(() => {
  if (route.query.z && route.query.do) void search(false)
  timer = window.setInterval(() => { now.value = Date.now() }, 20_000)
  void journeys.refresh()
  if (route.hash === '#szukaj') requestAnimationFrame(() => document.getElementById('skad')?.focus())
})
onBeforeUnmount(() => window.clearInterval(timer))
watch(() => route.hash, (h) => { if (h === '#szukaj') document.getElementById('skad')?.focus() })
const journeyTimer = window.setInterval(() => void journeys.refresh(), 60_000)
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
        <v-chip :variant="direct ? 'flat' : 'outlined'" :color="direct ? 'secondary-container' : undefined" :prepend-icon="direct ? 'check' : undefined" filter class="opt-chip" @click="toggleDirect">
          Bez przesiadek
        </v-chip>
      </div>
      <v-btn type="submit" size="x-large" prepend-icon="search" :loading="searching" class="f-btn">Szukaj połączeń</v-btn>
      <v-alert v-if="error" color="error-container" icon="error" density="compact" class="f-error">{{ error }}</v-alert>
    </form>

    <StatusBanner />

    <div class="cols" :class="{ 'has-result': !!result }">
      <section v-if="result" ref="resultsEl" class="results" aria-live="polite" aria-labelledby="results-title">
        <div class="results-head">
          <h2 id="results-title" class="text-title-large">{{ result.from.name }} → {{ result.to.name }}</h2>
          <span class="text-body-medium muted">{{ resultsInfo }}</span>
        </div>
        <v-btn v-if="result.connections.length" variant="text" prepend-icon="keyboard_arrow_up" :loading="paging === 'earlier'" class="more" @click="page('earlier')">
          Wcześniejsze połączenia
        </v-btn>
        <template v-for="(c, i) in result.connections" :key="connKey(c)">
          <h3 v-if="newDay(i)" class="day-sep text-title-small">{{ dayLabel(c.departure) }}</h3>
          <ConnectionCard :connection="c" :now="now" :highlight="connKey(c) === highlightKey" />
        </template>
        <v-empty-state
          v-if="!result.connections.length"
          icon="search_off"
          title="Brak połączeń w ciągu 12 godzin"
          :text="direct ? 'Wyłącz filtr „Bez przesiadek” albo zmień godzinę.' : 'Zmień godzinę. Szukamy pociągów KW, POLREGIO i PKP Intercity w Wielkopolsce.'"
          class="card"
        />
        <v-btn v-else variant="text" prepend-icon="keyboard_arrow_down" :loading="paging === 'later'" class="more" @click="page('later')">
          Późniejsze połączenia
        </v-btn>
        <BtkHint
          v-if="btkFits"
          :stations="[result.from.name, result.to.name, ...result.connections[0].via.map((v) => v.name)]"
          context="trip"
        />
      </section>
      <div v-else ref="resultsEl" class="results-anchor" />

      <div class="aside">
        <section id="moje-podroze" aria-labelledby="journeys-title">
          <div class="section-head"><h2 id="journeys-title" class="text-title-large">Moje podróże</h2></div>
          <div class="gap-grid">
            <JourneyCard v-for="j in journeys.sorted" :key="j.id" :journey="j" :now="now" />
            <div v-if="!journeys.list.length" class="empty card">
              <span class="empty-ic"><v-icon icon="bookmark" /></span>
              <div class="d-grid ga-1">
                <strong class="text-title-small">Nie obserwujesz żadnej podróży</strong>
                <span class="text-body-medium muted">Wyszukaj połączenie i wybierz „Obserwuj”. Pokażemy tu odliczanie, opóźnienia i komunikaty dla Twojej trasy.</span>
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
.opt-chip { font-size: 13px; padding: 0 10px; }
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
  .cols:not(.has-result) .footnote { grid-column: 1 / -1; }
}
.results { display: grid; gap: 12px; scroll-margin-top: 80px; min-width: 0; }
.results-anchor { display: none; }
.results-head { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 4px 12px; padding: 0 4px; }
.more { justify-self: center; }
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
