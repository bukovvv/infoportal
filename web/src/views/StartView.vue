<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { ConnectionsResult } from '@/api/types'
import ConnectionCard from '@/components/ConnectionCard.vue'
import DateField from '@/components/DateField.vue'
import FavoriteStations from '@/components/FavoriteStations.vue'
import JourneyCard from '@/components/JourneyCard.vue'
import NoticeItem from '@/components/NoticeItem.vue'
import StationField from '@/components/StationField.vue'
import BtkHint from '@/components/BtkHint.vue'
import StatusBanner from '@/components/StatusBanner.vue'
import TimeField from '@/components/TimeField.vue'
import { useNotices, useStatus } from '@/stores/data'
import { useFavorites } from '@/stores/favorites'
import { useJourneys } from '@/stores/journeys'
import { read, write } from '@/stores/ui'
import { dayLabel, plural, warsawNow } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const notices = useNotices()
const status = useStatus()
const journeys = useJourneys()
const favorites = useFavorites()

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
watch(arriveBy, () => { if (result.value) void search(false) })

/** Następna strona wyników: późniejsze odjazdy albo, przy „przyjeździe do”, wcześniejsze przyjazdy. */
function more() {
  const list = result.value?.connections
  if (!list?.length) return
  const next = result.value!.arriveBy
    ? new Date(new Date(list[0].arrival).getTime() - 60_000)
    : new Date(new Date(list[list.length - 1].departure).getTime() + 60_000)
  const w = warsawNow(next)
  date.value = w.date
  time.value = w.time
  void search(false)
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
  <div class="page">
    <div class="start">
      <StatusBanner class="full" />

      <div class="col">
        <form id="szukaj" class="search" aria-labelledby="search-title" @submit.prevent="search()">
          <div class="d-flex align-end justify-space-between flex-wrap ga-3">
            <h1 id="search-title" class="text-headline-small">Dokąd jedziesz?</h1>
          </div>
          <div class="route-fields">
            <div class="stack">
              <StationField id="skad" v-model="from" label="Skąd" icon="trip_origin" hide-details />
              <StationField v-model="to" label="Dokąd" icon="location_on" hide-details />
            </div>
            <v-btn icon="swap_vert" variant="outlined" aria-label="Zamień stacje" @click="swap" />
          </div>
          <div class="search-row">
            <DateField v-model="date" label="Data" :min="range.min" :max="range.max" class="f-date" />
            <TimeField v-model="time" :label="arriveBy ? 'Przyjazd do' : 'Odjazd od'" class="f-time" />
          </div>
          <div class="search-row">
            <v-btn-toggle v-model="timeMode" mandatory variant="outlined" divided density="comfortable" aria-label="Godzina oznacza">
              <v-btn value="dep" :prepend-icon="arriveBy ? undefined : 'check'">Odjazd</v-btn>
              <v-btn value="arr" :prepend-icon="arriveBy ? 'check' : undefined">Przyjazd</v-btn>
            </v-btn-toggle>
            <v-chip :variant="direct ? 'flat' : 'outlined'" :color="direct ? 'secondary-container' : undefined" :prepend-icon="direct ? 'check' : undefined" filter @click="toggleDirect">
              Tylko bezpośrednie
            </v-chip>
            <v-btn type="submit" size="large" prepend-icon="search" :loading="searching" class="search-btn">Szukaj połączeń</v-btn>
          </div>
          <v-alert v-if="error" color="error-container" icon="error" density="compact">{{ error }}</v-alert>
        </form>

        <section ref="resultsEl" class="results" aria-live="polite" aria-labelledby="results-title">
          <template v-if="result">
            <div class="d-flex align-baseline justify-space-between flex-wrap ga-2 px-1">
              <h2 id="results-title" class="text-title-medium">{{ result.from.name }} → {{ result.to.name }}</h2>
              <span class="text-body-small muted">{{ result.connections.length }} {{ plural(result.connections.length, 'połączenie', 'połączenia', 'połączeń') }} {{ result.arriveBy ? 'z przyjazdem do' : 'od' }} {{ result.time }}</span>
            </div>
            <template v-for="(c, i) in result.connections" :key="c.legs.map((l) => l.key).join('+')">
              <h3 v-if="newDay(i)" class="day-sep text-title-small">{{ dayLabel(c.departure) }}</h3>
              <ConnectionCard :connection="c" />
            </template>
            <v-empty-state
              v-if="!result.connections.length"
              icon="search_off"
              title="Brak połączeń KW w ciągu 12 godzin"
              :text="direct ? 'Wyłącz filtr „Tylko bezpośrednie” albo zmień godzinę.' : 'Zmień godzinę albo sprawdź, czy obie stacje obsługują pociągi KW.'"
            />
            <v-btn v-else variant="text" :prepend-icon="result.arriveBy ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" class="justify-self-start" @click="more">
              {{ result.arriveBy ? 'Wcześniejsze połączenia' : 'Późniejsze połączenia' }}
            </v-btn>
            <BtkHint
              v-if="result.connections.length"
              :stations="[result.from.name, result.to.name, ...result.connections[0].via.map((v) => v.name)]"
              context="trip"
            />
          </template>
        </section>
      </div>

      <div class="col">
        <section id="moje-podroze" aria-labelledby="journeys-title">
          <div class="section-head"><h2 id="journeys-title" class="text-title-large">Moje podróże</h2></div>
          <div class="gap-grid">
            <JourneyCard v-for="j in journeys.sorted" :key="j.id" :journey="j" :now="now" />
            <div v-if="!journeys.list.length" class="empty">
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
          <div v-else class="empty">
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
          <div v-if="notices.loaded && !notices.list.length" class="empty">
            <span class="empty-ic"><v-icon icon="check_circle" /></span>
            <div class="d-grid ga-1">
              <strong class="text-title-small">Brak aktywnych komunikatów</strong>
              <span class="text-body-medium muted">Ruch odbywa się zgodnie z rozkładem, o ile pojedynczy pociąg nie ma opóźnienia.</span>
            </div>
          </div>
          <v-card v-else color="surface-container-low">
            <NoticeItem v-for="n in notices.list.slice(0, 2)" :key="n.id" :notice="n" compact link />
            <v-skeleton-loader v-if="!notices.loaded" type="list-item-avatar-three-line" color="transparent" />
          </v-card>
        </section>

        <p class="text-body-small muted footnote">
          zanimwyjdziesz to nieoficjalny serwis pasażerski, niezwiązany z przewoźnikami. Bilety kupisz na stronie przewoźnika. <router-link to="/o-nas">O nas</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.start { display: grid; gap: 24px; grid-template-columns: minmax(0, 1fr); }
.col { display: grid; gap: 24px; align-content: start; min-width: 0; }
@media (min-width: 1145px) {
  .start { grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); }
  .full { grid-column: 1 / -1; }
}
.search { display: grid; gap: 20px; padding: 24px; border-radius: var(--kw-r-l); background: rgb(var(--v-theme-surface-container-low)); }
.route-fields { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; }
.stack { display: grid; gap: 12px; min-width: 0; }
.search-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
/* DateField i TimeField mają okno jako korzeń: klasa trafia na pole, ale bez atrybutu tego widoku, stąd :deep */
.search-row :deep(.f-date) { flex: 3 1 230px; min-width: 190px; }
.search-row :deep(.f-time) { flex: 2 1 140px; min-width: 120px; }
.search-btn { margin-left: auto; }
.results { display: grid; gap: 12px; scroll-margin-top: 80px; }
.justify-self-start { justify-self: start; }
.day-sep { margin-top: 8px; padding: 0 4px; color: rgb(var(--v-theme-primary)); }
.day-sep::first-letter { text-transform: uppercase; }
.empty { display: flex; align-items: flex-start; gap: 16px; padding: 16px; border-radius: var(--kw-r-l); background: rgb(var(--v-theme-surface-container-low)); }
.empty-ic {
  display: grid; place-items: center; width: 40px; height: 40px; flex: none; border-radius: var(--kw-r-m);
  background: rgb(var(--v-theme-surface-container-highest)); color: rgb(var(--v-theme-on-surface-variant));
}
.d-grid { display: grid; }
.footnote { max-width: 70ch; padding: 0 4px; }
@media (max-width: 839px) {
  .search { padding: 20px 16px; border-radius: var(--kw-r-l); }
  .search-row :deep(.f-date), .search-row :deep(.f-time) { flex: 1 1 calc(50% - 6px); min-width: 0; }
  .search-btn { width: 100%; margin: 0; }
}
</style>
