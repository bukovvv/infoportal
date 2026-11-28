<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { api } from '@/api/client'
import type { Board, BoardRow } from '@/api/types'
import { useNotices, useStations } from '@/stores/data'
import { MAX_FAVORITES, useFavorites } from '@/stores/favorites'
import { read, useUi, write } from '@/stores/ui'
import { splitNumbers, warsawNow } from '@/utils/format'
import { noticeTrain } from '@/utils/notices'
import { region } from '@/utils/region'
import { unusualVehicle, VEHICLE_KINDS } from '@/utils/vehicle'
import StationPole from '../components/StationPole.vue'
import { hm, inWords, lineOf, minutesFrom, short, trainShort } from '../util'

// Stacje (makieta: widok „stacje”): wybór stacji, odjazdy/przyjazdy, szybkie stacje (ulubione albo najczęstsze),
// komunikaty o stacji, linie i „Połączenie stąd”, obok tablica na najbliższą dobę (/board, odświeżana co 30 s).
// Adres jak w 1.0: /odjazdy/{id}?tryb=przyjazdy; ostatnia stacja w kw_board_station.
const route = useRoute()
const router = useRouter()
const stations = useStations()
const notices = useNotices()
const favorites = useFavorites()
const ui = useUi()
const { mdAndUp } = useDisplay()

const stationId = ref<string | null>((route.params.id as string) || read<string | null>('kw_board_station', null) || region.hub.id)
const mode = ref<'dep' | 'arr'>(route.query.tryb === 'przyjazdy' ? 'arr' : 'dep')
const board = ref<Board | null>(null)
const error = ref<string | null>(null)
const now = ref(Date.now())
const station = computed(() => (stationId.value ? stations.byId.get(stationId.value) : undefined))

async function load() {
  const id = stationId.value
  if (!id) return
  try {
    const b = await api.board(id, mode.value, mdAndUp.value ? 20 : 12)
    if (id !== stationId.value) return // w międzyczasie wybrano inną stację
    board.value = b
    error.value = null
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    now.value = Date.now()
  }
}

watch([stationId, mode], ([id], [oldId]) => {
  if (!id) return
  if (id !== oldId) board.value = null
  write('kw_board_station', id)
  void router.replace({ name: 'stacje', params: { id }, query: mode.value === 'arr' ? { tryb: 'przyjazdy' } : {} })
  void load()
})
watch(() => route.params.id, (id) => { if (id && id !== stationId.value) stationId.value = id as string })

let timer = 0
onMounted(() => {
  void stations.load()
  notices.start()
  if (route.params.id !== stationId.value) void router.replace({ name: 'stacje', params: { id: stationId.value }, query: route.query })
  void load()
  timer = window.setInterval(load, 30_000)
})
onBeforeUnmount(() => window.clearInterval(timer))

// szybkie stacje: ulubione, a bez nich najczęściej wybierane w regionie (jak w makiecie)
const QUICK: Record<string, string[]> = {
  wielkopolska: ['Poznań Główny', 'Gniezno', 'Września', 'Leszno'],
  malopolska: ['Kraków Główny', 'Tarnów', 'Miechów', 'Kraków Lotnisko'],
}
const quick = computed(() => {
  // ulubione najpierw, resztę do 3 uzupełniają najczęściej wybierane
  const defaults = (QUICK[region.id] ?? []).flatMap((n) => stations.all.find((s) => s.name === n)?.id ?? [])
  return [...new Set([...favorites.ids, ...defaults])].filter((id) => id !== stationId.value).slice(0, 3).flatMap((id) => stations.byId.get(id) ?? [])
})

const isFavorite = computed(() => favorites.has(stationId.value))
function toggleFavorite() {
  const id = stationId.value
  if (!id) return
  const name = station.value?.name ?? 'Stacja'
  const index = favorites.ids.indexOf(id)
  const added = favorites.toggle(id)
  if (added === null) ui.notify(`Możesz mieć najwyżej ${MAX_FAVORITES} ulubionych stacji. Usuń którąś, żeby dodać nową.`)
  else if (added) ui.notify(`${name} w ulubionych: będzie pierwsza w szybkim wyborze.`)
  else ui.notify(`Usunięto ${name} z ulubionych`, { label: 'Cofnij', run: () => favorites.restore(id, index) })
}

const locating = ref(false)
function nearest() {
  if (!navigator.geolocation) return ui.notify('Przeglądarka nie udostępnia lokalizacji. Wybierz stację z listy.')
  locating.value = true
  navigator.geolocation.getCurrentPosition((p) => {
    locating.value = false
    const kx = Math.cos((p.coords.latitude * Math.PI) / 180)
    const best = stations.all.reduce<{ id: string; name: string; d: number } | null>((acc, s) => {
      const d = (s.lat - p.coords.latitude) ** 2 + ((s.lon - p.coords.longitude) * kx) ** 2
      return !acc || d < acc.d ? { id: s.id, name: s.name, d } : acc
    }, null)
    if (best) {
      stationId.value = best.id
      ui.notify(`Najbliższa stacja: ${best.name}`)
    }
  }, (err) => {
    locating.value = false
    ui.notify(err.code === 1 ? 'Zezwól na dostęp do lokalizacji, aby znaleźć najbliższą stację.' : 'Nie udało się ustalić lokalizacji. Wybierz stację z listy.')
  }, { timeout: 10_000, maximumAge: 300_000 })
}

// komunikaty o stacji albo linii przez nią przechodzącej; przy rzędzie — tylko te, które wymieniają pociąg
const stationNotices = computed(() => (station.value ? notices.forStation(station.value) : []))
const rowNotice = (r: BoardRow) => splitNumbers(r.number).some((t) => notices.byTrain.has(noticeTrain(r.agency, t)))
// linie na stacji (z listy linii stacji w rozkładzie)
const LINE_COLORS: Record<string, string> = { PKM1: '#3A76C2', PKM2: '#EA1A35', PKM3: '#3F9236', PKM4: '#823D8C', PKM5: '#E8B120', SKA1: '#00B1EB', SKA2: '#E82F89', SKA3: '#FBBA21' }
const lines = computed(() => [...new Set((station.value?.lines ?? []).map((l) => l.replace(/ ?P$/, '')))].filter((l) => l !== region.agency))

const today = computed(() => warsawNow(new Date(now.value)).date)
const DAYS = ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.']
function rowState(r: BoardRow) {
  if (r.cancelled) return 'odwołany'
  if (r.skipped) return 'nie zatrzyma się'
  const at = r.expected ?? r.scheduled
  if (warsawNow(new Date(at)).date !== today.value) return DAYS[new Date(at).getDay()]
  return inWords(minutesFrom(at, now.value)) + (r.delay ? ` · +${r.delay} min` : '')
}
const rows = computed(() => board.value?.rows ?? [])
</script>

<template>
  <section id="v-stacje" class="kol">
    <h1>Stacje</h1>
    <div class="plyta kol" style="gap: 10px">
      <div class="st-wiersz">
        <StationPole id="stacja" v-model="stationId" label="Stacja" />
        <button type="button" class="kolo st-ulub" :class="{ on: isFavorite }" :aria-pressed="isFavorite" :aria-label="isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'" @click="toggleFavorite"><v-icon icon="star" /></button>
      </div>
      <div>
        <div class="seg" role="group" aria-label="Odjazdy czy przyjazdy">
          <button type="button" :aria-pressed="mode === 'dep'" @click="mode = 'dep'">Odjazdy</button>
          <button type="button" :aria-pressed="mode === 'arr'" @click="mode = 'arr'">Przyjazdy</button>
        </div>
      </div>
      <div class="wiersz zawin" style="gap: 6px">
        <button type="button" class="chip" style="height: 40px" :disabled="locating" @click="nearest"><v-icon icon="my_location" size="18" />{{ locating ? 'Szukamy…' : 'Najbliższa' }}</button>
        <button v-for="s in quick" :key="s.id" type="button" class="chip" style="height: 40px" @click="stationId = s.id">{{ short(s.name) }}</button>
      </div>
    </div>

    <div v-if="stationNotices.length || (mdAndUp && station)" id="st-kom" class="kol" style="gap: 6px">
      <p v-for="n in stationNotices" :key="n.id" class="kpas">
        <span class="kzn m" :class="n.severity === 'info' ? 'info' : n.severity === 'danger' ? 'pow' : 'utr'" aria-hidden="true">{{ n.severity === 'info' ? 'i' : '!' }}</span><b>{{ n.title }}</b>
      </p>
      <section v-if="station" class="plyta kol" style="gap: 10px">
        <template v-if="lines.length">
          <span class="dr maly">Linie na tej stacji</span>
          <div class="wiersz zawin" style="gap: 10px"><span v-for="l in lines" :key="l" class="lin" :style="{ '--c': LINE_COLORS[l] ?? '#8A8F98' }">{{ l }}</span></div>
        </template>
        <div class="wiersz zawin" style="gap: 8px">
          <RouterLink class="drugi" :to="{ name: 'szukaj', query: { z: station.id } }">Połączenie stąd</RouterLink>
        </div>
      </section>
    </div>

    <div id="tablica" class="plyta" style="padding: 8px">
      <div class="wiersz rozsun tab-gl">
        <h2>{{ mode === 'dep' ? 'Odjazdy' : 'Przyjazdy' }}<span v-if="station" class="dr"> · {{ short(station.name) }}</span></h2>
        <span class="dr maly">najbliższa doba</span>
      </div>
      <p v-if="error && !board" class="pusto">Nie udało się pobrać tablicy. Spróbuj ponownie za chwilę.</p>
      <p v-else-if="!board" class="pusto">Wczytujemy tablicę…</p>
      <p v-else-if="!rows.length" class="pusto">W najbliższej dobie nie ma tu pociągów.</p>
      <div v-for="r in rows" :key="r.key + r.scheduled" class="rzad">
        <span class="g" :class="{ op: r.delay || r.cancelled }">
          <template v-if="r.cancelled"><s>{{ hm(r.scheduled) }}</s></template>
          <template v-else>{{ hm(r.expected ?? r.scheduled) }}<s v-if="r.delay">{{ hm(r.scheduled) }}</s></template>
        </span>
        <span class="c">
          <b>{{ mode === 'dep' ? '' : 'ze stacji ' }}{{ short(mode === 'dep' ? r.destination : r.origin) }}</b>
          <span>
            <span class="lin" :style="{ '--c': lineOf(r).color }">{{ lineOf(r).badge === trainShort(r).split(' ')[0] ? '' : lineOf(r).badge }}</span>
            <span>{{ trainShort(r) }}</span>
            <span :class="{ 'op-t': r.cancelled || r.delay }">{{ rowState(r) }}</span>
            <span v-if="unusualVehicle(r.vehicleType)">{{ VEHICLE_KINDS[r.vehicleType!.kind].short }}</span>
            <span v-if="r.agency === 'IC'">osobny bilet</span>
            <span v-if="rowNotice(r)" class="znak op" style="padding: 1px 7px; font-size: 12px">komunikat</span>
          </span>
        </span>
        <span v-if="r.platform" class="pe">peron<b>{{ r.platform }}</b></span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.st-wiersz { display: grid; grid-template-columns: minmax(0, 1fr) 44px; gap: 8px; align-items: center; }
.st-ulub { background: var(--papier); }
.st-ulub.on { color: #E8B120; }
.st-ulub.on :deep(svg) { fill: currentColor; }
.tab-gl { padding: 6px 8px 8px; }
.tab-gl h2 { font-size: 18px; font-weight: 700; }
.op-t { color: var(--opoz); font-weight: 700; }
.rzad { cursor: default; }
.chip:disabled { opacity: .6; }
#st-kom .kpas { margin: 0; padding: 0 4px; }
</style>
