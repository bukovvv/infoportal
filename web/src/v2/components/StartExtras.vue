<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { Board, Connection } from '@/api/types'
import { useNotices, useStations } from '@/stores/data'
import { useJourneys } from '@/stores/journeys'
import { ends, useRoutes, type SavedRoute } from '@/stores/routes'
import { warsawNow } from '@/utils/format'
import { region } from '@/utils/region'
import { dayChip, expArr, expDep, hm, inWords, lineOf, minutesFrom, short, trainShort } from '../util'

// Start bez wyników: Twoje podróże (obserwowane), Moje trasy z najbliższym odjazdem, utrudnienia z komunikatów.
// Na komputerze w prawej kolumnie, na telefonie pod formularzem.
const props = defineProps<{ now: number }>()
const emit = defineEmits<{ open: [c: Connection]; route: [r: SavedRoute]; pick: [from: string, to: string] }>()
const journeys = useJourneys()
const routes = useRoutes()
const notices = useNotices()
const stations = useStations()

// najbliższe odjazdy z głównej stacji regionu (co minutę)
const board = ref<Board | null>(null)
const boardError = ref(false)
async function loadBoard() {
  try {
    board.value = await api.board(region.hub.id, 'dep', 6)
    boardError.value = false
  } catch {
    boardError.value = true
  }
}
let timer = 0
onMounted(() => { void loadBoard(); timer = window.setInterval(loadBoard, 60_000) })
onBeforeUnmount(() => window.clearInterval(timer))
const rows = computed(() => (board.value?.rows ?? []).filter((r) => !r.skipped).slice(0, 6))
// popularne trasy z głównej stacji: stacje z największą liczbą kursów
const popular = computed(() => [...stations.all].filter((s) => s.kw !== false && !s.name.startsWith(region.hub.name.split(' ')[0])).sort((a, b) => b.daily - a.daily).slice(0, 6))

const today = computed(() => warsawNow(new Date(props.now)).date)
const trips = computed(() => journeys.sorted.filter((j) => new Date(expArr(j.connection)).getTime() > props.now).slice(0, 4))
const next = (r: SavedRoute) => routes.results[`${r.id}|${r.dir}`]?.connections.find((c) => minutesFrom(expDep(c), props.now) > -1) ?? null
const alerts = computed(() => notices.alerts.slice(0, 3))
const empty = computed(() => !trips.value.length && !routes.list.length)
const when = (c: Connection) => {
  const day = c.departure.slice(0, 10)
  if (day !== today.value) return dayChip(day, today.value)
  const m = minutesFrom(expDep(c), props.now)
  return m < 0 ? 'w drodze' : inWords(m)
}
</script>

<template>
  <div class="kol start-extras" style="gap: 20px">
    <section v-if="trips.length" class="kol" style="gap: 8px" aria-labelledby="h-podroze">
      <h2 id="h-podroze">Twoje podróże</h2>
      <button v-for="j in trips" :key="j.id" type="button" class="pol" @click="emit('open', j.connection)">
        <span class="g">
          <span class="godz"><span>{{ hm(expDep(j.connection)) }}</span><em>→</em><span>{{ hm(expArr(j.connection)) }}</span></span>
          <span class="znak" :class="minutesFrom(expDep(j.connection), now) <= 60 && minutesFrom(expDep(j.connection), now) >= 0 ? 'ok' : 'neutr'">{{ when(j.connection) }}</span>
        </span>
        <span class="meta">
          <span v-for="l in j.connection.legs" :key="l.key" class="lin" :style="{ '--c': lineOf(l).color }">{{ lineOf(l).badge }}</span>
          <span>{{ short(j.from) }} → {{ short(j.to) }}</span>
          <span v-if="j.notify"><v-icon icon="notifications" size="14" /> powiadomienia</span>
        </span>
      </button>
    </section>

    <section v-if="routes.list.length" class="kol" style="gap: 8px" aria-labelledby="h-trasy">
      <h2 id="h-trasy">Moje trasy</h2>
      <div class="plyta lista-tras">
        <button v-for="r in routes.list" :key="r.id" type="button" class="trasa" @click="emit('route', r)">
          <span class="min-w-0">
            <b>{{ short(ends(r).from.name) }} → {{ short(ends(r).to.name) }}</b>
            <small v-if="next(r)" class="dr">najbliższy: {{ hm(expDep(next(r)!)) }}, {{ inWords(minutesFrom(expDep(next(r)!), now)) }}</small>
            <small v-else class="dr">{{ routes.results[`${r.id}|${r.dir}`] ? 'brak najbliższych połączeń' : 'sprawdzamy…' }}</small>
          </span>
          <v-icon icon="arrow_forward" size="18" />
        </button>
      </div>
    </section>

    <section v-if="alerts.length" class="kol" style="gap: 8px" aria-labelledby="h-utr">
      <h2 id="h-utr">Utrudnienia</h2>
      <div class="plyta kol" style="gap: 12px">
        <div v-for="n in alerts" :key="n.id" class="utr-w">
          <span class="kzn m" :class="n.severity === 'danger' ? 'pow' : 'utr'" aria-hidden="true">!</span>
          <span class="min-w-0"><b>{{ n.title }}</b><small class="dr">{{ n.line }}</small></span>
        </div>
      </div>
    </section>

    <section v-if="empty && popular.length" class="kol" style="gap: 8px" aria-labelledby="h-popularne">
      <h2 id="h-popularne">Popularne trasy</h2>
      <div class="wiersz zawin na-papierze" style="gap: 6px">
        <button v-for="s in popular" :key="s.id" type="button" class="chip" @click="emit('pick', region.hub.id, s.id)">{{ short(region.hub.name) }} → {{ short(s.name) }}</button>
      </div>
      <p class="dr maly" style="padding: 0 4px">Wybierz trasę i „Obserwuj trasę” przy wynikach: jej najbliższy odjazd będzie zawsze na górze, a obserwowane podróże pokażemy tutaj.</p>
    </section>

    <section class="kol" style="gap: 8px" aria-labelledby="h-odjazdy">
      <h2 id="h-odjazdy">Najbliższe odjazdy · {{ short(region.hub.name) }}</h2>
      <div class="plyta" style="padding: 6px 8px">
        <p v-if="!board" class="pusto">{{ boardError ? 'Nie udało się pobrać odjazdów.' : 'Wczytujemy odjazdy…' }}</p>
        <p v-else-if="!rows.length" class="pusto">Brak odjazdów w najbliższym czasie.</p>
        <div v-for="r in rows" :key="r.key" class="rzad">
          <span class="g" :class="{ op: r.delay }">{{ hm(r.expected ?? r.scheduled) }}<s v-if="r.delay">{{ hm(r.scheduled) }}</s></span>
          <span class="c"><b>{{ r.cancelled ? `Odwołany: ${short(r.destination)}` : short(r.destination) }}</b><span><span class="lin" :style="{ '--c': lineOf(r).color }">{{ trainShort(r) }}</span><span v-if="r.delay" class="op-t">+{{ r.delay }} min</span></span></span>
          <span v-if="r.platform" class="pe">peron<b>{{ r.platform }}</b></span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.start-extras h2 { font-size: 20px; font-weight: 700; padding: 0 4px; }
.lista-tras { padding: 6px; display: flex; flex-direction: column; gap: 2px; }
.trasa { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px; border-radius: var(--r-m); text-align: left; }
.trasa:hover { background: var(--papier); }
.trasa span, .utr-w span { display: flex; flex-direction: column; }
.trasa small, .utr-w small { font-size: 13px; }
.utr-w { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 10px; align-items: start; }
.utr-w b { font-weight: 600; font-size: 14px; }
.min-w-0 { min-width: 0; }
.op-t { color: var(--opoz); font-weight: 700; }
.rzad { cursor: default; }
</style>
