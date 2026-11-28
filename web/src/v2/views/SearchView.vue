<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { api } from '@/api/client'
import type { Connection, ConnectionsResult } from '@/api/types'
import { useNotices, useStations } from '@/stores/data'
import { useJourneys } from '@/stores/journeys'
import { useRoutes } from '@/stores/routes'
import { read, useUi, write } from '@/stores/ui'
import { warsawNow } from '@/utils/format'
import { region } from '@/utils/region'
import { changedCount, optionsFromQuery, optionsLabel, optionsToApi, optionsToQuery, sanitize, type SearchOptions } from '@/utils/searchOptions'
import ConnCard from '../components/ConnCard.vue'
import ConnDetail from '../components/ConnDetail.vue'
import NextDeparture from '../components/NextDeparture.vue'
import OptionsArk from '../components/OptionsArk.vue'
import StationPole from '../components/StationPole.vue'
import WhenArk from '../components/WhenArk.vue'
import { connKey, dayChip, fullDate, hm } from '../util'

// Szukaj (makieta: widok „szukaj”): najbliższy wyjazd z Moich tras, formularz Skąd/Dokąd z oknami „Kiedy” i „Opcje”,
// wyniki po 4 z „Wcześniejsze/Późniejsze”, szczegóły obok (na telefonie na całym ekranie). Adres jak w 1.0:
// ?z=&do=&data=&godz=&przyj=1 + opcje (przes, minp, przew), więc linki z 1.0 i udostępnione połączenia działają.
const route = useRoute()
const router = useRouter()
const stations = useStations()
const notices = useNotices()
const routes = useRoutes()
const journeys = useJourneys()
const ui = useUi()
const { mdAndUp } = useDisplay()

const PAGE = 4
const last = read<{ from?: string; to?: string }>('kw_last_search', {})
const from = ref<string | null>((route.query.z as string) || last.from || null)
const to = ref<string | null>((route.query.do as string) || last.to || null)
const start = warsawNow()
const date = ref((route.query.data as string) || (region.startDate && region.startDate > start.date ? region.startDate : start.date))
const time = ref((route.query.godz as string) || start.time)
const arriveBy = ref(route.query.przyj === '1')
/** godzina wybrana w oknie „Kiedy” (inaczej „teraz” — liczone przy każdym wyszukaniu) */
const custom = ref(!!route.query.godz || !!region.startDate)
const options = ref<SearchOptions>(optionsFromQuery(route.query) ?? sanitize(read<Partial<SearchOptions> | null>('kw_search_options', null)))
const whenOpen = ref(false)
const optionsOpen = ref(false)

const result = ref<ConnectionsResult | null>(null)
const searching = ref(false)
const error = ref<string | null>(null)
const paging = ref<'earlier' | 'later' | null>(null)
const resultsEl = ref<HTMLElement | null>(null)
const now = ref(Date.now())

const today = computed(() => warsawNow(new Date(now.value)).date)
const whenLabel = computed(() => `${arriveBy.value ? 'Przyjazd' : 'Odjazd'}: ${custom.value ? `${dayChip(date.value, today.value).toLowerCase()}, ${time.value}` : 'teraz'}`)

async function search(scroll = true) {
  error.value = null
  if (!from.value || !to.value) { error.value = 'Wybierz stację początkową i docelową z listy.'; return }
  if (from.value === to.value) { error.value = 'Wybierz dwie różne stacje.'; return }
  if (!custom.value) ({ date: date.value, time: time.value } = warsawNow())
  searching.value = true
  try {
    result.value = await api.connections({ from: from.value, to: to.value, date: date.value, time: time.value, arriveBy: arriveBy.value, limit: PAGE, ...optionsToApi(options.value) })
    sel.value = result.value.connections[0] ?? null
    detailOpen.value = false
    write('kw_last_search', { from: from.value, to: to.value })
    write('kw_search_options', options.value)
    void router.replace({ query: { z: from.value, do: to.value, ...(custom.value ? { data: date.value, godz: time.value } : {}), ...optionsToQuery(options.value), ...(arriveBy.value ? { przyj: '1' } : {}) } })
    if (scroll && !mdAndUp.value) requestAnimationFrame(() => resultsEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  } catch (e) {
    error.value = (e as Error).message
    result.value = null
  } finally {
    searching.value = false
  }
}

function swap() {
  ;[from.value, to.value] = [to.value, from.value]
  if (result.value) void search(false)
}
const research = () => { if (from.value && to.value) void search(false) }
function whenApplied() {
  custom.value = true
  research()
}

/** Poprzednie albo następne 4 połączenia w miejsce bieżących (jak w 1.0). */
async function page(dir: 'earlier' | 'later') {
  const r = result.value
  if (!r?.connections.length || paging.value) return
  const list = r.connections
  const at = dir === 'earlier' ? new Date(new Date(list[0].arrival).getTime() - 60_000) : new Date(new Date(list.at(-1)!.departure).getTime() + 60_000)
  const w = warsawNow(at)
  paging.value = dir
  try {
    const res = await api.connections({ from: r.from.id, to: r.to.id, date: w.date, time: w.time, arriveBy: dir === 'earlier', limit: PAGE, ...optionsToApi(options.value) })
    if (result.value !== r) return
    const known = new Set(list.map(connKey))
    const fresh = res.connections.filter((c) => !known.has(connKey(c)))
    if (!fresh.length) return ui.notify(dir === 'earlier' ? 'Brak wcześniejszych połączeń.' : 'Brak późniejszych połączeń.')
    r.connections = fresh
    sel.value = fresh[0]
    await nextTick()
    resultsEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } catch (e) {
    ui.notify((e as Error).message)
  } finally {
    paging.value = null
  }
}

const head = computed(() => {
  const list = result.value?.connections ?? []
  if (!list.length) return ''
  const a = hm(list[0].departure)
  const b = hm(list.at(-1)!.departure)
  return `${fullDate(list[0].departure.slice(0, 10))} · ${a === b ? `odjazd ${a}` : `odjazdy ${a}–${b}`}`
})

// Moje trasy: trasa z wyników (stacje i opcje)
const routeSaved = computed(() => !!result.value && routes.has(result.value.from.id, result.value.to.id))
function watchRoute() {
  const r = result.value
  if (!r || routeSaved.value) return
  routes.add(r.from, r.to, options.value)
  ui.notify('Dodano do Moich tras. Najbliższy wyjazd pokażemy na górze.')
}

// wybrane połączenie: na komputerze szczegóły obok listy, na telefonie na całym ekranie po dotknięciu
const sel = ref<Connection | null>(null)
const detailOpen = ref(false)
function select(c: Connection) {
  sel.value = c
  detailOpen.value = true
}

let timer = 0
let refreshTimer = 0
onMounted(() => {
  void stations.load()
  notices.start()
  void routes.refresh()
  void journeys.refresh()
  if (route.query.z && route.query.do) void search(false)
  timer = window.setInterval(() => { now.value = Date.now() }, 20_000)
  refreshTimer = window.setInterval(() => { void routes.refresh() }, 60_000)
})
onBeforeUnmount(() => { window.clearInterval(timer); window.clearInterval(refreshTimer) })
const optionsCount = computed(() => changedCount(options.value))
</script>

<template>
  <section id="v-szukaj" class="dwa">
    <div class="kol">
      <NextDeparture :now="now" @open="select" />
      <h1>Dokąd jedziesz?</h1>
      <form class="plyta kol" style="gap: 10px" autocomplete="off" @submit.prevent="search()">
        <div class="skad-dokad">
          <StationPole id="skad" v-model="from" label="Skąd" />
          <StationPole id="dokad" v-model="to" label="Dokąd" />
          <button type="button" class="kolo zamien" aria-label="Zamień stacje" @click="swap"><v-icon icon="swap_vert" /></button>
        </div>
        <div class="wiersz zawin" style="gap: 6px">
          <button type="button" class="chip" @click="whenOpen = true"><v-icon icon="schedule" size="18" />{{ whenLabel }}</button>
          <button type="button" class="chip" @click="optionsOpen = true"><v-icon icon="tune" size="18" />{{ optionsCount ? optionsLabel(options) : 'Opcje' }}</button>
        </div>
        <button class="glowny" type="submit" :disabled="searching">{{ searching ? 'Szukamy…' : 'Szukaj połączeń' }}</button>
      </form>

      <div ref="resultsEl" class="kol wyniki" style="gap: 8px">
        <div v-if="error" class="plyta pusto" role="alert">{{ error }}</div>
        <div v-else-if="searching && !result" class="plyta pusto">Szukamy połączeń…</div>
        <template v-else-if="result">
          <div v-if="!result.connections.length" class="plyta pusto">
            Nie znaleźliśmy połączeń. {{ optionsCount ? 'Zmień opcje wyszukiwania i wyszukaj ponownie.' : 'Zmień stacje albo godzinę i wyszukaj ponownie.' }}
          </div>
          <template v-else>
            <div class="wiersz rozsun zawin" style="padding: 8px 4px 0; gap: 0 12px">
              <div><h2>Połączenia</h2><p class="dr maly num">{{ head }}</p></div>
              <button type="button" class="tekstowy" :disabled="routeSaved" @click="watchRoute"><v-icon icon="star" size="16" />{{ routeSaved ? 'Obserwujesz trasę' : 'Obserwuj trasę' }}</button>
            </div>
            <ConnCard v-for="c in result.connections" :key="connKey(c)" :c="c" :now="now" :selected="!!sel && connKey(c) === connKey(sel)" @click="select(c)" />
            <div class="strony na-papierze">
              <button type="button" class="drugi" :disabled="!!paging" @click="page('earlier')">{{ paging === 'earlier' ? 'Szukamy…' : 'Wcześniejsze' }}</button>
              <button type="button" class="drugi" :disabled="!!paging" @click="page('later')">{{ paging === 'later' ? 'Szukamy…' : 'Późniejsze' }}</button>
            </div>
          </template>
        </template>
      </div>
    </div>

    <div class="detal" :class="{ otwarty: detailOpen && !!sel }">
      <ConnDetail v-if="sel" :key="connKey(sel)" :c="sel" :now="now" @close="detailOpen = false" />
    </div>

    <WhenArk v-model="whenOpen" v-model:date="date" v-model:time="time" v-model:arrive-by="arriveBy" @apply="whenApplied" />
    <OptionsArk v-model="optionsOpen" v-model:options="options" @apply="research" />
  </section>
</template>

<style scoped>
.wyniki h2 { font-size: 20px; font-weight: 700; }
.tekstowy:disabled { color: var(--tusz-2); cursor: default; }
</style>
