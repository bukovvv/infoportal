<script setup lang="ts">
import 'maplibre-gl/dist/maplibre-gl.css'
import { type FilterSpecification, type GeoJSONSource, type LngLatBoundsLike, Map as MlMap, Marker, setWorkerUrl } from 'maplibre-gl'
import maplibreWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay, useTheme } from 'vuetify'
import { api } from '@/api/client'
import type { LiveTrain, Notice, Station } from '@/api/types'
import AgencyToggles from '@/components/AgencyToggles.vue'
import MapNoticeSheet from '@/components/MapNoticeSheet.vue'
import MapStationSheet from '@/components/MapStationSheet.vue'
import MapTrainSheet from '@/components/MapTrainSheet.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useLive, useNotices, useStations } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { agencyCode, agencyLabel, shortNumber } from '@/utils/agency'
import { clock, normalize } from '@/utils/format'
import { AGENCIES } from '@/utils/searchOptions'
import { region } from '@/utils/region'
import type { Trip } from '@/api/types'
import { alertMarks, colorNetwork, stationRank, trainLineColor } from '@/utils/mapLines'
import { loadMapStyle, mapPalette } from '@/utils/mapStyle'
import icons from 'virtual:material-symbols'

// Worker MapLibre jest modułem ES — Vite pakuje go osobno i podaje jego adres.
setWorkerUrl(maplibreWorker)

const route = useRoute()
const router = useRouter()
const live = useLive()
const stations = useStations()
const notices = useNotices()
const ui = useUi()
const theme = useTheme()
const { mdAndUp } = useDisplay()
const dark = computed(() => theme.global.name.value === 'dark')

const container = ref<HTMLElement | null>(null)
const selectedKey = ref<string | null>((route.query.kurs as string) || null)
const filter = ref<'all' | 'late' | 'est'>('all')
/** przewoźnicy na mapie (POLREGIO i PKP Intercity tylko w Wielkopolsce i do stacji KW za granicą) */
const agencies = ref<string[]>(AGENCIES.map((a) => a.code))
const allAgencies = computed(() => agencies.value.length === AGENCIES.length)
const query = ref('')
/** lista pociągów z wyszukiwarką (domyślnie schowana — mapa na cały ekran) */
const listOpen = ref(false)
const mapError = ref<string | null>(null)
const network = shallowRef<GeoJSON.FeatureCollection | null>(null)
const routeTrip = shallowRef<Trip | null>(null)
/** panel wybranego pociągu (MapTrainSheet): błąd wczytania, zwinięty do nagłówka, wysokość — mapa trzyma pociąg nad nim */
const tripError = ref<string | null>(null)
const panelCollapsed = ref(false)
const sheetHeight = ref(0)
const trainSheet = ref<InstanceType<typeof MapTrainSheet> | null>(null)
/** panel po dotknięciu stacji albo znaczka utrudnienia (pociąg ma własny panel — MapTrainSheet) */
const info = shallowRef<{ kind: 'station'; station: Station } | { kind: 'notice'; notice: Notice } | null>(null)
const marks = computed(() => alertMarks(notices.list, stations.all))
let map: MlMap | null = null

const keyOf = (t: LiveTrain) => t.key ?? `gps:${t.number}`

const visible = computed(() => {
  // tekst z wyszukiwarki zawęża tylko otwartą listę — po jej zamknięciu mapa pokazuje wszystkie pociągi
  const q = listOpen.value ? normalize(query.value) : ''
  return live.trains
    .filter((t) => filter.value === 'all' || (filter.value === 'late' ? (t.delay ?? 0) >= 2 : t.delay === null))
    .filter((t) => allAgencies.value || agencies.value.includes(agencyCode(t.agency)))
    .filter((t) => !q || t.number.includes(q) || [t.origin, t.destination, t.next?.name, t.prev?.name].some((s) => s && normalize(s).includes(q)))
    .sort((a, b) => Number(keyOf(b) === selectedKey.value) - Number(keyOf(a) === selectedKey.value) || (b.delay ?? 0) - (a.delay ?? 0) || a.number.localeCompare(b.number, 'pl', { numeric: true }))
})

function colors() {
  const c = theme.current.value.colors as Record<string, string>
  const p = mapPalette(theme.global.name.value === 'dark' ? 'dark' : 'light')
  return {
    primary: c.primary, ontime: p.ontime, delay: p.late, est: p.est, network: p.network,
    surface: c['surface-container-lowest'], outline: c.outline, text: c['on-surface'], halo: c.surface, error: c.error,
  }
}

const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

/** Trasa wybranego kursu podzielona w miejscu pociągu: odcinek przejechany i do przejechania. */
function routeGeoJson(): GeoJSON.FeatureCollection {
  const trip = routeTrip.value
  if (!trip) return empty
  const coords = (trip.shape.length ? trip.shape : trip.stops.filter((s) => s.station.lat !== null).map((s) => [s.station.lat!, s.station.lon!]))
    .map(([lat, lon]) => [lon, lat] as [number, number])
  const train = live.trains.find((t) => keyOf(t) === trip.key)
  const line = (part: string, c: [number, number][]): GeoJSON.Feature => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: c }, properties: { part } })
  if (!train || coords.length < 2) return { type: 'FeatureCollection', features: [line('ahead', coords)] }
  const here: [number, number] = [train.lon, train.lat]
  const dist = ([x, y]: [number, number]) => (x - here[0]) ** 2 + (y - here[1]) ** 2
  let at = 0
  coords.forEach((p, i) => { if (dist(p) < dist(coords[at])) at = i })
  return { type: 'FeatureCollection', features: [line('passed', [...coords.slice(0, at + 1), here]), line('ahead', [here, ...coords.slice(at + 1)])] }
}

function routeStopsGeoJson(): GeoJSON.FeatureCollection {
  const trip = routeTrip.value
  if (!trip) return empty
  return {
    type: 'FeatureCollection',
    features: trip.stops.filter((s) => s.station.lat !== null && !s.skipped).map((s, i, all) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.station.lon!, s.station.lat!] },
      properties: { name: s.station.name, terminal: i === 0 || i === all.length - 1 },
    })),
  }
}

function refreshRoute() {
  if (!map) return
  ;(map.getSource('kw-route') as GeoJSONSource | undefined)?.setData(routeGeoJson())
  ;(map.getSource('kw-route-stops') as GeoJSONSource | undefined)?.setData(routeStopsGeoJson())
  if (map.getLayer('kw-network')) map.setPaintProperty('kw-network', 'line-opacity', routeTrip.value ? 0.3 : 0.9)
  if (map.getLayer('kw-network-partner')) map.setPaintProperty('kw-network-partner', 'line-opacity', routeTrip.value ? 0.2 : 0.45)
  if (map.getLayer('kw-alert')) map.setPaintProperty('kw-alert', 'line-opacity', routeTrip.value ? 0.3 : 1)
  // trasa wybranego kursu w kolorze jego linii (jak kółko w pastylce), autobus i brak koloru — kolor akcji
  const trip = routeTrip.value
  const color = trip && !trip.isBus && trip.route?.color ? trip.route.color : colors().primary
  if (map.getLayer('kw-route')) map.setPaintProperty('kw-route', 'line-color', color)
  if (map.getLayer('kw-route-stops')) map.setPaintProperty('kw-route-stops', 'circle-stroke-color', color)
}

/**
 * Pociągi jako pastylki HTML: grafitowe tło (marka; w ciemnym motywie jasne), kółko w kolorze linii ze strzałką
 * w kierunku jazdy i numer; opóźnienie jako żółta plakietka w rogu. Mapa się nie obraca, więc obrót strzałki = kierunek względem północy.
 */
// marker: element pozycjonowany przez MapLibre (transform — bez animacji!), el: pastylka w środku (wygląd, powiększenie)
const markers = new Map<string, { marker: Marker; el: HTMLButtonElement }>()
const svg = (name: string, cls: string) => `<svg class="${cls}" viewBox="0 -960 960 960" aria-hidden="true"><path d="${icons[name] ?? ''}"/></svg>`
const stateLabel = (t: LiveTrain) => (t.delay === null ? 'bez danych na żywo' : t.delay >= 2 ? `opóźnienie ${t.delay} min` : 'planowo')
/** Jasne kolory linii (żółte, pomarańczowe) — ciemna strzałka. */
const onColor = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 170 ? '#1A1111' : '#FFFFFF'
}
/** Kolor kółka: linia KW ze schematu, PKM i inni przewoźnicy — z rozkładu (autobus zastępczy i brak koloru — neutralnie). */
function pillColor(t: LiveTrain) {
  const c = t.isBus ? null : trainLineColor(t, dark.value)
  if (!c) return { bg: 'rgb(var(--v-theme-inverse-surface))', fg: 'rgb(var(--v-theme-on-inverse-surface))' }
  return { bg: c, fg: c === t.route?.color && t.route.textColor ? t.route.textColor : onColor(c) }
}
/** strzałka kierunku: kreska z grotem (wcześniej wypełniona strzałka Material) */
const ARROW = '<svg class="arr" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 12V2.5M3 6.5L7 2.5L11 6.5"/></svg>'

function pill(key: string, bus: boolean): HTMLButtonElement {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = 'train-pill'
  el.innerHTML = `<span class="orbit"></span>${ARROW}${svg(bus ? 'directions_bus' : 'train', 'veh')}<span class="no"></span><span class="late"></span>`
  el.addEventListener('click', (e) => {
    e.stopPropagation()
    void select(key, true, 'train')
  })
  return el
}

function syncTrains() {
  if (!map) return
  const shown = new Set(visible.value.map(keyOf))
  for (const [key, m] of markers) {
    if (!shown.has(key)) {
      m.marker.remove()
      markers.delete(key)
    }
  }
  for (const t of live.trains) {
    const key = keyOf(t)
    if (!shown.has(key)) continue
    let m = markers.get(key)
    if (!m) {
      const el = pill(key, t.isBus)
      const holder = document.createElement('div')
      holder.className = 'train-marker'
      holder.appendChild(el)
      m = { el, marker: new Marker({ element: holder, anchor: 'center' }).setLngLat([t.lon, t.lat]).addTo(map) }
      markers.set(key, m)
    } else {
      m.marker.setLngLat([t.lon, t.lat])
    }
    const selected = key === selectedKey.value
    const late = t.delay !== null && t.delay >= 2
    // sam numer (bez nazwy kursu i drugiego numeru po „/”)
    const number = t.number.match(/^\d+/)?.[0] ?? t.number.split('/')[0]
    const color = pillColor(t)
    m.el.style.setProperty('--c', color.bg)
    m.el.style.setProperty('--on', color.fg)
    m.el.style.setProperty('--bearing', `${t.bearing ?? 0}deg`)
    m.el.classList.toggle('selected', selected)
    m.el.classList.toggle('dim', !!selectedKey.value && !selected)
    m.el.classList.toggle('still', t.bearing === null || t.dwelling)
    m.el.classList.toggle('bus', t.isBus)
    m.el.querySelector('.no')!.textContent = number
    m.el.querySelector('.late')!.textContent = late ? `+${t.delay}` : ''
    m.el.setAttribute('aria-label', `${agencyLabel(t.agency)} ${t.number}${t.destination ? ` do ${t.destination}` : ''}, ${stateLabel(t)}`)
    m.el.dataset.priority = selected ? '3' : late ? '2' : '1'
  }
  layoutPills()
}

/**
 * Jak etykiety na mapie: pastylka, która zasłoniłaby już ułożoną, staje się kółkiem z ikoną i trójkątem kierunku.
 * Kolejność: wybrany pociąg, opóźnione, reszta. Liczone przy każdym ruchu mapy (raz na klatkę).
 */
let layoutFrame = 0
function layoutPills() {
  if (!map || layoutFrame) return
  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = 0
    if (!map) return
    const placed: [number, number, number, number][] = []
    const items = [...markers.values()]
      .map((m) => ({ m, p: map!.project(m.marker.getLngLat()), priority: Number(m.el.dataset.priority ?? 1) }))
      .sort((a, b) => b.priority - a.priority)
    for (const { m, p } of items) {
      const width = (m.el.classList.contains('bus') ? 58 : 40) + 7.5 * (m.el.querySelector('.no')?.textContent?.length ?? 5)
      const box: [number, number, number, number] = [p.x - width / 2 - 2, p.y - 16, p.x + width / 2 + 6, p.y + 14]
      const hit = placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])
      m.el.classList.toggle('compact', hit)
      // kółka pod pełnymi pastylkami, wybrany pociąg na wierzchu
      m.marker.getElement().style.zIndex = hit ? '0' : m.el.dataset.priority ?? '1'
      if (!hit) placed.push(box)
    }
  })
}

/** Stacje z ważnością (rank, `stationRank`): węzły widać od początku, przystanki dopiero po przybliżeniu. */
function stationsGeoJson(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: stations.all.map((s) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] }, properties: { id: s.id, name: s.name, rank: stationRank(s) } })),
  }
}

const networkData = () => (network.value ? colorNetwork(network.value, stations.all, dark.value) : empty)

/** Odcinki i stacje z komunikatami o utrudnieniach (żółte kreski; poważne — w kolorze błędu). */
function alertsGeoJson(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: marks.value.flatMap((m) => [
      ...(m.segments.length ? [{ type: 'Feature' as const, geometry: { type: 'MultiLineString' as const, coordinates: m.segments }, properties: { id: m.notice.id, danger: m.notice.severity === 'danger' } }] : []),
      ...m.points.map((p) => ({ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: p }, properties: { id: m.notice.id, danger: m.notice.severity === 'danger' } })),
    ]),
  }
}

// stacja: rank ≥ 2 zawsze, rank 1 od przybliżenia 8, przystanki od 9,5
const STATION_FILTER: FilterSpecification =['any', ['>=', ['get', 'rank'], 2], ['all', ['==', ['get', 'rank'], 1], ['>=', ['zoom'], 8]], ['>=', ['zoom'], 9.5]]

function addOverlays() {
  if (!map || map.getSource('kw-network')) return
  const c = colors()
  const warn = dark.value ? '#F5B83D' : '#E6A100'
  map.addSource('kw-network', { type: 'geojson', data: networkData() })
  map.addSource('kw-alerts', { type: 'geojson', data: alertsGeoJson() })
  map.addSource('kw-route', { type: 'geojson', data: routeGeoJson() })
  map.addSource('kw-route-stops', { type: 'geojson', data: routeStopsGeoJson() })
  map.addSource('kw-stations', { type: 'geojson', data: stationsGeoJson() })
  // linie tylko POLREGIO / PKP Intercity (przycięte do Wielkopolski) — cieńsze i bledsze, pod siecią KW
  map.addLayer({ id: 'kw-network-partner', type: 'line', source: 'kw-network', filter: ['all', ['!', ['get', 'bus']], ['==', ['get', 'partner'], true]], layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': c.network, 'line-opacity': routeTrip.value ? 0.2 : 0.45, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.2, 11, 2, 14, 3] } })
  // sieć KW w kolorach linii (PKM na wierzchu)
  map.addLayer({ id: 'kw-network', type: 'line', source: 'kw-network', filter: ['all', ['!', ['get', 'bus']], ['!=', ['get', 'partner'], true]],
    layout: { 'line-cap': 'round', 'line-join': 'round', 'line-sort-key': ['get', 'rank'] },
    paint: { 'line-color': ['coalesce', ['get', 'color'], c.network], 'line-opacity': routeTrip.value ? 0.3 : 0.9, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2.5, 11, 4, 14, 6] } })
  // utrudnienia: przerywana kreska na linii (pod spodem jasna obwódka), stacje — żółty pierścień
  map.addLayer({ id: 'kw-alert-casing', type: 'line', source: 'kw-alerts', filter: ['!=', ['geometry-type'], 'Point'], layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': c.halo, 'line-opacity': 0.75, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 6, 12, 11] } })
  map.addLayer({ id: 'kw-alert', type: 'line', source: 'kw-alerts', filter: ['!=', ['geometry-type'], 'Point'], layout: { 'line-join': 'round' },
    paint: { 'line-color': ['case', ['get', 'danger'], c.error, warn], 'line-opacity': routeTrip.value ? 0.3 : 1, 'line-dasharray': [1.6, 1.2], 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 3, 12, 6] } })
  map.addLayer({ id: 'kw-alert-points', type: 'circle', source: 'kw-alerts', filter: ['==', ['geometry-type'], 'Point'],
    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 6, 12, 10], 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': ['case', ['get', 'danger'], c.error, warn], 'circle-stroke-width': 3 } })
  map.addLayer({ id: 'kw-route-casing', type: 'line', source: 'kw-route', layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': c.halo, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 7, 12, 11] } })
  map.addLayer({ id: 'kw-route', type: 'line', source: 'kw-route', layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': c.primary,
      'line-opacity': ['case', ['==', ['get', 'part'], 'passed'], 0.4, 1],
      'line-width': ['interpolate', ['linear'], ['zoom'], 6, 4, 12, 7],
    } })
  map.addLayer({ id: 'kw-route-stops', type: 'circle', source: 'kw-route-stops',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, ['case', ['get', 'terminal'], 4.5, 2.5], 12, ['case', ['get', 'terminal'], 7, 5]],
      'circle-color': c.surface, 'circle-stroke-color': c.primary, 'circle-stroke-width': ['case', ['get', 'terminal'], 3, 2],
    } })
  // stacje według ważności: węzły — biały środek z grafitową obwódką, przystanki — małe kropki
  map.addLayer({ id: 'kw-stations', type: 'circle', source: 'kw-stations', filter: STATION_FILTER, layout: { 'circle-sort-key': ['get', 'rank'] },
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'],
        6, ['match', ['get', 'rank'], 3, 6, 2, 4.5, 1, 3, 2],
        12, ['match', ['get', 'rank'], 3, 9, 2, 7, 1, 5.5, 4.5]],
      'circle-color': c.surface,
      'circle-stroke-color': ['case', ['>=', ['get', 'rank'], 2], c.text, c.outline],
      'circle-stroke-width': ['case', ['>=', ['get', 'rank'], 2], 2.5, 1.5],
    } })
  // wybrana stacja: pierścień w kolorze akcji
  map.addLayer({ id: 'kw-station-selected', type: 'circle', source: 'kw-stations', filter: ['==', ['get', 'id'], info.value?.kind === 'station' ? info.value.station.id : ''],
    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 9, 12, 14], 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': c.primary, 'circle-stroke-width': 3.5 } })
  // większe pole dotyku (niewidoczne)
  map.addLayer({ id: 'kw-stations-hit', type: 'circle', source: 'kw-stations', filter: STATION_FILTER, paint: { 'circle-radius': 14, 'circle-color': '#000', 'circle-opacity': 0 } })
  map.addLayer({ id: 'kw-station-labels-major', type: 'symbol', source: 'kw-stations', filter: ['>=', ['get', 'rank'], 2],
    layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'], 'text-size': ['case', ['==', ['get', 'rank'], 3], 14, 12.5], 'text-offset': [0.9, 0], 'text-anchor': 'left', 'text-optional': true, 'symbol-sort-key': ['-', 3, ['get', 'rank']] },
    paint: { 'text-color': c.text, 'text-halo-color': c.halo, 'text-halo-width': 2 } })
  map.addLayer({ id: 'kw-station-labels', type: 'symbol', source: 'kw-stations', minzoom: 8.5,
    filter: ['any', ['==', ['get', 'rank'], 1], ['>=', ['zoom'], 11]],
    layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': ['case', ['==', ['get', 'rank'], 1], 12, 11], 'text-offset': [0.8, 0], 'text-anchor': 'left', 'text-optional': true },
    paint: { 'text-color': c.text, 'text-halo-color': c.halo, 'text-halo-width': 1.5 } })
  map.addLayer({ id: 'kw-route-labels', type: 'symbol', source: 'kw-route-stops', minzoom: 8,
    layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-offset': [0.9, 0], 'text-anchor': 'left', 'text-optional': true },
    paint: { 'text-color': c.text, 'text-halo-color': c.halo, 'text-halo-width': 2 } })
  refreshRoute()
}

/** Znaczki ⚠ utrudnień (HTML jak pastylki): dotknięcie otwiera skrót komunikatu. */
const alertMarkers = new Map<number, Marker>()
function syncAlerts() {
  ;(map?.getSource('kw-alerts') as GeoJSONSource | undefined)?.setData(alertsGeoJson())
  if (!map) return
  const ids = new Set(marks.value.map((m) => m.notice.id))
  for (const [id, m] of alertMarkers) if (!ids.has(id)) { m.remove(); alertMarkers.delete(id) }
  for (const mark of marks.value) {
    let m = alertMarkers.get(mark.notice.id)
    if (!m) {
      const el = document.createElement('button')
      el.type = 'button'
      el.innerHTML = svg('warning-fill', 'ic')
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        const n = notices.list.find((x) => x.id === mark.notice.id)
        if (n) openInfo({ kind: 'notice', notice: n })
      })
      m = new Marker({ element: el, anchor: 'center' }).setLngLat(mark.at).addTo(map)
      alertMarkers.set(mark.notice.id, m)
    } else {
      m.setLngLat(mark.at)
    }
    const el = m.getElement()
    el.className = `alert-badge ${mark.notice.severity}`
    el.classList.toggle('selected', info.value?.kind === 'notice' && info.value.notice.id === mark.notice.id)
    el.setAttribute('aria-label', `Utrudnienie: ${mark.notice.title}`)
  }
}

/**
 * Panel stacji / utrudnienia: zamyka listę (na telefonie), stację przybliża nad panelem.
 * Wybrany pociąg zostaje: na komputerze jego panel jest dalej na dole, na telefonie chowa się pod panelem stacji i wraca po jego zamknięciu.
 */
let collapsedForInfo = false
function openInfo(next: NonNullable<typeof info.value>) {
  if (ui.sheet) ui.closeTrain()
  if (!mdAndUp.value) listOpen.value = false
  // na komputerze panel stacji jest nad panelem pociągu — ten zwija się do nagłówka, żeby stacja miała miejsce
  if (mdAndUp.value && selectedKey.value && !panelCollapsed.value) {
    panelCollapsed.value = true
    collapsedForInfo = true
  }
  info.value = next
  if (next.kind === 'station' && map) map.easeTo({ center: [next.station.lon, next.station.lat], zoom: Math.max(map.getZoom(), 11), padding: padding(), duration: 500 })
}
function closeInfo() {
  info.value = null
  if (collapsedForInfo && selectedKey.value) panelCollapsed.value = false
  collapsedForInfo = false
  // na telefonie wraca panel pociągu — mapa wraca do pociągu (po wysunięciu panelu, z jego wysokością)
  if (selectedKey.value && !mdAndUp.value) void nextTick(() => keepTrainInView())
}
watch(info, (v) => {
  if (map?.getLayer('kw-station-selected')) map.setFilter('kw-station-selected', ['==', ['get', 'id'], v?.kind === 'station' ? v.station.id : ''])
  syncAlerts()
})

/** Panel pociągu widoczny: kurs wczytany (albo błąd); na telefonie ustępuje panelowi stacji. */
const trainPanel = computed(() => !!selectedKey.value && !!(routeTrip.value || tripError.value) && (mdAndUp.value || !info.value))
/** Widoczna wysokość panelu pociągu — mierzona wprost (świeża także zaraz po wysunięciu). */
const trainSheetHeight = () => (trainPanel.value ? trainSheet.value?.visibleHeight() ?? sheetHeight.value : 0)

/** Marginesy na panel listy, panel pociągu (na środku u dołu) i panel stacji, zmniejszane proporcjonalnie w małych oknach. */
function padding() {
  const w = container.value?.clientWidth ?? 800
  const h = container.value?.clientHeight ?? 600
  const sheet = trainPanel.value ? trainSheetHeight() + 24 : 0
  const p = mdAndUp.value
    ? { left: listOpen.value ? 400 : 60, right: info.value ? 480 : 80, top: 72, bottom: Math.max(40, sheet) }
    : { left: 24, right: 72, top: 64, bottom: info.value ? 420 : sheet || (listOpen.value ? 360 : 40) }
  const kx = Math.min(1, (w * 0.7) / (p.left + p.right))
  const ky = Math.min(1, (h * 0.8) / (p.top + p.bottom))
  return { left: p.left * kx, right: p.right * kx, top: p.top * ky, bottom: p.bottom * ky }
}

function fitCoords(coords: [number, number][], maxZoom = 11) {
  if (!map || !coords.length) return
  const b = coords.reduce((acc, [x, y]) => [[Math.min(acc[0][0], x), Math.min(acc[0][1], y)], [Math.max(acc[1][0], x), Math.max(acc[1][1], y)]], [[Infinity, Infinity], [-Infinity, -Infinity]])
  map.fitBounds(b as LngLatBoundsLike, { padding: padding(), maxZoom, duration: 700 })
}

/** Widok na wszystkie jadące pociągi (sieć KW sięga daleko poza region, np. do Łodzi — na telefonie byłaby za mała); bez pociągów — sieć. */
function fitNetwork() {
  const trains = live.trains.map((t) => [t.lon, t.lat] as [number, number])
  const coords = trains.length ? trains : (network.value?.features ?? []).flatMap((f: GeoJSON.Feature) => (f.geometry as GeoJSON.LineString).coordinates as [number, number][])
  fitCoords(coords.length ? coords : stations.list.map((s) => [s.lon, s.lat]), 9)
}

const tripCoords = (trip: Trip) => (trip.shape.length ? trip.shape : trip.stops.filter((s) => s.station.lat !== null).map((s) => [s.station.lat!, s.station.lon!]))
  .map(([lat, lon]) => [lon, lat] as [number, number])

/**
 * Wybór kursu: trasa na mapie i panel pociągu na środku u dołu (zwinięty do nagłówka, gdy pasażer chce zobaczyć mapę).
 * `frame`: `train` — dotknięta pastylka: mapa tylko dosuwa pociąg nad panel (bez oddalania), `route` — z listy, tablicy stacji,
 * adresu: widok na całą trasę. Mapa rusza się raz — gdy panel już się wysuwa i znamy jego wysokość.
 */
async function select(key: string, openSheet = true, frame: 'train' | 'route' = 'route') {
  info.value = null
  collapsedForInfo = false
  if (ui.sheet) ui.closeTrain()
  if (selectedKey.value !== key) tripError.value = null
  selectedKey.value = key
  panelCollapsed.value = !openSheet
  if (!mdAndUp.value) listOpen.value = false
  if (!key.startsWith('gps:')) void router.replace({ query: { kurs: key } })
  await loadTrip(key, frame)
}

/** Kurs do panelu i trasy; z `frame` — ustaw widok mapy (przy wyborze), bez — ciche odświeżenie co 30 s. */
async function loadTrip(key: string, frame?: 'train' | 'route') {
  try {
    // pozycja GPS bez dopasowanego kursu — pociąg po numerze
    const trip = key.startsWith('gps:') ? await api.train(key.slice(4).split('/')[0]) : await api.trip(key)
    if (selectedKey.value !== key) return
    routeTrip.value = trip
    tripError.value = null
    refreshRoute()
    if (!frame) return
    await nextTick() // panel w DOM-ie — wysokość znana
    if (selectedKey.value !== key) return
    if (frame === 'train' && trainOnMap()) keepTrainInView(true)
    else fitCoords(tripCoords(trip))
  } catch (e) {
    if (selectedKey.value === key && (frame || !routeTrip.value)) tripError.value = (e as Error).message
  }
}
const tripTimer = window.setInterval(() => { if (selectedKey.value) void loadTrip(selectedKey.value) }, 30_000)

function fitTrip() {
  if (routeTrip.value) fitCoords(tripCoords(routeTrip.value))
}

const trainOnMap = () => live.trains.find((x) => keyOf(x) === selectedKey.value)

/**
 * Pociąg pod panelem albo poza widokiem — przesuwamy mapę (bez zmiany przybliżenia) tak, żeby był nad panelem.
 * `always` — przy wyborze z pastylki: też gdy jest za blisko krawędzi.
 */
function keepTrainInView(always = false) {
  const t = trainOnMap()
  if (!map || !t) return
  const w = container.value?.clientWidth ?? 0
  const h = container.value?.clientHeight ?? 0
  const free = h - trainSheetHeight() // wolna część mapy nad panelem
  const p = map.project([t.lon, t.lat])
  const margin = 56
  const hidden = p.y > free - margin || p.y < margin || p.x < margin || p.x > w - margin
  if (!hidden && !always) return
  if (!hidden && p.y < free * 0.8) return
  // pociąg na środku wolnej części (w poziomie zostaje, jeśli jest w widoku)
  const x = p.x < margin || p.x > w - margin ? w / 2 : p.x
  map.easeTo({ center: map.unproject([w / 2 + (p.x - x), h / 2 + (p.y - Math.max(margin, free / 2))]), duration: 450 })
}
// panel się rozwinął (z nagłówka do pełnej wysokości) — pociąg nie może zostać pod nim
watch(sheetHeight, (now, before) => { if (before > 0 && now > before + 24) keepTrainInView() })

function clearSelection() {
  selectedKey.value = null
  routeTrip.value = null
  tripError.value = null
  panelCollapsed.value = false
  refreshRoute()
  if (route.query.kurs) void router.replace({ query: {} })
}

function zoom(delta: 1 | -1) {
  if (delta > 0) map?.zoomIn()
  else map?.zoomOut()
}

function locate() {
  if (!navigator.geolocation) return ui.notify('Przeglądarka nie udostępnia lokalizacji.')
  navigator.geolocation.getCurrentPosition(
    (p) => map?.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 11 }),
    () => ui.notify('Nie udało się ustalić lokalizacji.'),
    { timeout: 10_000, maximumAge: 300_000 },
  )
}

watch([() => live.trains, filter, agencies, query, listOpen, selectedKey, dark], syncTrains)
watch(marks, syncAlerts)
// pierwsze pozycje przyszły po wczytaniu mapy — dopasuj widok raz, jeśli pasażer jeszcze nie ruszał mapy
let userMoved = false
let fittedTrains = false
watch(() => live.trains.length, (n) => {
  if (!map?.loaded() || fittedTrains || userMoved || selectedKey.value || !n) return
  fittedTrains = true
  fitNetwork()
})
// pociąg jedzie dalej — przesuwamy granicę odcinka przejechanego
watch(() => live.trains, () => { if (routeTrip.value) (map?.getSource('kw-route') as GeoJSONSource | undefined)?.setData(routeGeoJson()) })
watch(() => stations.all, () => {
  ;(map?.getSource('kw-stations') as GeoJSONSource | undefined)?.setData(stationsGeoJson())
  // kolory linii dopasowane po stacjach na końcach kształtów
  ;(map?.getSource('kw-network') as GeoJSONSource | undefined)?.setData(networkData())
})
// „Pokaż na mapie” w ogólnym panelu pociągu otwartym na mapie (np. z komunikatu): kurs w panelu mapy, na telefonie zwiniętym
ui.mapFocus = null
watch(() => ui.mapFocus, (key) => {
  if (!key) return
  ui.mapFocus = null
  void select(key, mdAndUp.value)
}, { flush: 'post' })
watch(() => theme.global.name.value, async (name) => {
  if (!map) return
  try {
    map.setStyle(await loadMapStyle(name === 'dark' ? 'dark' : 'light'), { diff: false })
  } catch (e) {
    mapError.value = (e as Error).message
  }
})

onMounted(async () => {
  live.start()
  void stations.load()
  try {
    const [style, net] = await Promise.all([loadMapStyle(theme.global.name.value === 'dark' ? 'dark' : 'light'), api.network()])
    network.value = net
    const m = new MlMap({
      container: container.value!,
      style,
      center: region.mapCenter,
      zoom: 7,
      minZoom: 5,
      maxZoom: 17,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true },
    })
    map = m
    m.touchZoomRotate.disableRotation()
    m.on('style.load', addOverlays)
    m.on('move', layoutPills)
    m.on('movestart', (e) => { if (e.originalEvent) userMoved = true })
    // dotknięcie stacji otwiera jej panel; dotknięcie mapy poza pociągiem i stacją zamyka panel stacji (tylko),
    // panel pociągu zwija do nagłówka, a zwinięty — kończy pokazywanie kursu
    m.on('click', (e) => {
      // dotknięcie pastylki / znaczka ⚠ dociera też tutaj — obsługuje je sam znacznik
      if ((e.originalEvent.target as HTMLElement | null)?.closest?.('.train-marker, .alert-badge')) return
      const id = m.getLayer('kw-stations-hit') ? m.queryRenderedFeatures(e.point, { layers: ['kw-stations-hit'] })[0]?.properties?.id : undefined
      const station = id ? stations.byId.get(String(id)) : undefined
      if (station) return openInfo({ kind: 'station', station })
      if (info.value) return closeInfo()
      if (selectedKey.value) {
        if (panelCollapsed.value) clearSelection()
        else panelCollapsed.value = true
      }
    })
    m.on('mouseenter', 'kw-stations-hit', () => { m.getCanvas().style.cursor = 'pointer' })
    m.on('mouseleave', 'kw-stations-hit', () => { m.getCanvas().style.cursor = '' })
    m.once('load', () => {
      // informacja o autorach mapy zwinięta do ikonki ⓘ (MapLibre rozwija ją na starcie)
      container.value?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
      syncTrains()
      syncAlerts()
      if (selectedKey.value) void select(selectedKey.value, mdAndUp.value)
      else {
        fittedTrains = live.trains.length > 0
        fitNetwork()
      }
    })
  } catch (e) {
    mapError.value = (e as Error).message || 'Nie udało się wczytać mapy.'
  }
})
onBeforeUnmount(() => {
  window.clearInterval(tripTimer)
  markers.clear()
  alertMarkers.clear()
  cancelAnimationFrame(layoutFrame)
  map?.remove()
  map = null
})

const whereText = (t: LiveTrain) => {
  if (!t.prev) return t.gpsProvider ? `Pozycja GPS · ${t.gpsProvider}` : ''
  if (t.dwelling || !t.next || t.prev.seq === t.next.seq) return `Na stacji ${t.prev.name}`
  return `${t.prev.name} → ${t.next.name}`
}
const filters = [
  { value: 'all', label: 'Wszystkie', icon: 'train' },
  { value: 'late', label: 'Opóźnione', icon: 'schedule' },
  { value: 'est', label: 'Bez danych na żywo', icon: 'cloud_off' },
] as const
function resetFilters() {
  filter.value = 'all'
  agencies.value = AGENCIES.map((a) => a.code)
}
</script>

<template>
  <div class="map-screen" :style="{ '--train-sheet': trainPanel && mdAndUp ? `${sheetHeight + 16}px` : '0px' }">
    <div ref="container" class="map" role="region" :aria-label="`Mapa pociągów ${region.inName}`" />
    <v-alert v-if="mapError" color="error-container" icon="error" class="map-error">{{ mapError }}</v-alert>

    <div class="fabs top">
      <v-btn icon="search" :color="listOpen ? 'primary-container' : 'surface-container-high'" size="48" elevation="3" :aria-pressed="listOpen" aria-label="Szukaj pociągu" @click="listOpen = !listOpen" />
      <v-menu location="start top" :close-on-content-click="false">
        <template #activator="{ props }">
          <v-btn v-bind="props" :color="filter === 'all' && allAgencies ? 'surface-container-high' : 'primary-container'" size="48" elevation="3" icon aria-label="Filtruj pociągi">
            <v-badge :model-value="filter !== 'all' || !allAgencies" dot color="primary"><v-icon icon="filter_list" /></v-badge>
          </v-btn>
        </template>
        <v-card class="map-filter" elevation="4">
          <h3 class="mf-h">Pokaż</h3>
          <div class="mf-pills" role="group" aria-label="Pokaż pociągi">
            <button v-for="f in filters" :key="f.value" type="button" class="mf-pill" :aria-pressed="filter === f.value" @click="filter = f.value">
              <v-icon :icon="f.icon" size="18" />{{ f.label }}
            </button>
          </div>
          <h3 class="mf-h">Przewoźnicy</h3>
          <AgencyToggles v-model="agencies" />
          <v-btn v-if="filter !== 'all' || !allAgencies" variant="text" prepend-icon="restart_alt" class="mt-2" @click="resetFilters">Pokaż wszystko</v-btn>
          <v-divider v-if="region.features.scheme" class="my-3" />
          <router-link v-if="region.features.scheme" :to="{ name: 'scheme' }" class="mf-link"><v-icon icon="route" size="20" /><span>Schemat połączeń KW</span><v-icon icon="chevron_right" size="20" class="ml-auto" /></router-link>
        </v-card>
      </v-menu>
    </div>
    <!-- na telefonie nad zwiniętym panelem pociągu; przy panelu stacji i rozwiniętym pociągu schowane -->
    <div
      v-show="mdAndUp || (!info && (!selectedKey || panelCollapsed))"
      class="fabs bottom"
      :class="{ raised: listOpen && !mdAndUp }"
      :style="!mdAndUp && trainPanel ? { bottom: `${sheetHeight + 16}px` } : undefined"
    >
      <template v-if="mdAndUp">
        <v-btn icon="add" color="surface-container-high" size="44" elevation="3" aria-label="Przybliż" @click="zoom(1)" />
        <v-btn icon="remove" color="surface-container-high" size="44" elevation="3" aria-label="Oddal" @click="zoom(-1)" />
      </template>
      <v-btn icon="fit_screen" color="surface-container-high" size="48" elevation="3" aria-label="Pokaż wszystkie pociągi" @click="fitNetwork" />
      <v-btn icon="my_location" color="surface-container-high" size="48" elevation="3" aria-label="Moja lokalizacja" @click="locate" />
    </div>

    <aside v-if="listOpen" class="panel" aria-label="Pociągi w ruchu">
      <div class="panel-head">
        <v-text-field v-model="query" placeholder="Numer pociągu albo stacja" prepend-inner-icon="search" variant="solo-filled" flat density="compact" hide-details clearable autofocus />
        <v-btn icon="close" variant="text" aria-label="Zamknij listę" @click="listOpen = false" />
      </div>
      <v-list class="list" bg-color="transparent" lines="two" density="comfortable">
        <v-list-item
          v-for="t in visible"
          :key="keyOf(t)"
          :active="keyOf(t) === selectedKey"
          color="primary"
          @click="select(keyOf(t))"
        >
          <template #prepend>
            <span class="lead" :style="{ background: pillColor(t).bg, color: pillColor(t).fg }"><v-icon :icon="t.isBus ? 'directions_bus' : 'train'" size="20" /></span>
          </template>
          <v-list-item-title class="text-title-small">
            {{ agencyLabel(t.agency) }} {{ shortNumber(t.number) }} <span v-if="t.destination" class="muted font-weight-regular">→ {{ t.destination }}</span>
          </v-list-item-title>
          <v-list-item-subtitle class="text-body-small">
            {{ whereText(t) }}<template v-if="t.next?.expected && !t.dwelling"> · {{ clock(t.next.expected) }}</template>
          </v-list-item-subtitle>
          <template #append>
            <StatusTag :delay="t.delay" :source="t.delaySource" :estimated="t.source === 'est'" />
          </template>
        </v-list-item>
        <v-list-item v-if="!visible.length" :title="live.data ? 'Żaden pociąg nie pasuje do wyszukiwania' : 'Wczytywanie pozycji…'" />
      </v-list>
    </aside>

    <Transition name="sheet">
      <MapTrainSheet
        v-if="trainPanel"
        ref="trainSheet"
        :trip="routeTrip"
        :error="tripError"
        :collapsed="panelCollapsed"
        :pending="!!routeTrip && routeTrip.key !== selectedKey && !selectedKey?.startsWith('gps:')"
        :class="{ 'beside-list': listOpen && mdAndUp }"
        @close="clearSelection"
        @collapse="panelCollapsed = $event"
        @fit="fitTrip"
        @retry="loadTrip(selectedKey!, 'route')"
        @leg="select"
        @height="sheetHeight = $event"
      />
    </Transition>
    <Transition name="pop" mode="out-in">
      <MapStationSheet v-if="info?.kind === 'station'" :station="info.station" :dark="dark" @close="closeInfo" @train="select" />
      <MapNoticeSheet v-else-if="info?.kind === 'notice'" :notice="info.notice" :dark="dark" @close="closeInfo" />
    </Transition>
  </div>
</template>

<style scoped>
/* filtr mapy: pigułki „Pokaż” i przełączniki przewoźników */
.map-filter { width: min(340px, calc(100vw - 32px)); padding: 16px; }
.mf-h { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .6px; color: rgb(var(--v-theme-on-surface-variant)); margin: 4px 0 10px; }
.mf-h + .mf-pills { margin-bottom: 18px; }
.mf-pills { display: flex; flex-wrap: wrap; gap: 8px; }
.mf-pill {
  display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px 0 10px; border: 1px solid rgb(var(--v-theme-outline-variant)); border-radius: 999px;
  background: transparent; color: rgb(var(--v-theme-on-surface)); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer;
}
.mf-pill:hover { background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 6%, transparent); }
.mf-pill:focus-visible { outline: 3px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
.mf-pill[aria-pressed='true'] { border-color: transparent; background: rgb(var(--v-theme-inverse-surface)); color: rgb(var(--v-theme-on-inverse-surface)); }
.map-screen { position: relative; height: calc(100dvh - 64px); overflow: hidden; background: rgb(var(--v-theme-surface-container-low)); }
.map { position: absolute; inset: 0; }
.map-error { position: absolute; z-index: 3; top: 72px; left: 50%; transform: translateX(-50%); }
.mf-link {
  display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 6px; border-radius: var(--kw-r-m);
  color: rgb(var(--v-theme-on-surface)); text-decoration: none; font-weight: 700;
}
.mf-link:hover { background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 6%, transparent); }
.mf-link:focus-visible { outline: 3px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
/* panel stacji / utrudnienia (MapStationSheet, MapNoticeSheet): na komputerze karta po prawej, na telefonie od dołu */
/* (komputer) nad panelem pociągu, który zostaje na dole (--train-sheet = jego wysokość) */
.map-sheet {
  position: absolute; z-index: 4; top: 16px; right: 80px; width: 380px; max-height: calc(100% - 32px - var(--train-sheet, 0px)); overflow: auto; box-sizing: border-box; padding: 16px;
  border-radius: var(--kw-r-l); background: rgb(var(--v-theme-surface)); box-shadow: 0 2px 6px rgb(0 0 0 / .2), 0 8px 24px rgb(0 0 0 / .15);
  transition: translate .3s cubic-bezier(.2, 0, 0, 1), opacity .2s;
}
/* panel stacji / utrudnienia: na komputerze wjeżdża lekko z góry, na telefonie wysuwa się od dołu */
.map-sheet.pop-enter-from, .map-sheet.pop-leave-to { opacity: 0; translate: 0 -12px; }
.map-sheet.pop-leave-active { transition-duration: .15s; }
/* przyciski w rogach jak w aplikacjach z mapą na żywo */
.fabs { position: absolute; z-index: 2; right: 16px; display: grid; gap: 12px; justify-items: end; }
.fabs.top { top: 16px; }
.fabs.bottom { bottom: 24px; transition: bottom .25s cubic-bezier(.2, 0, 0, 1); }
.panel {
  position: absolute; z-index: 3; left: 16px; top: 16px; bottom: 16px; width: 360px; display: flex; flex-direction: column;
  border-radius: var(--kw-r-l); background: rgb(var(--v-theme-surface)); box-shadow: 0 2px 6px rgb(0 0 0 / .2), 0 8px 24px rgb(0 0 0 / .15);
}
.panel-head { display: flex; align-items: center; gap: 4px; padding: 12px 8px 8px 12px; }
.panel-head :deep(.v-field) { border-radius: 999px; background: rgb(var(--v-theme-surface-container)); }
.list { flex: 1; min-height: 0; overflow: auto; }
.lead { display: grid; place-items: center; width: 36px; height: 36px; margin-right: 12px; border-radius: 50%; }
:deep(.maplibregl-ctrl-attrib) { font-size: 11px; background: color-mix(in srgb, rgb(var(--v-theme-surface)) 85%, transparent) !important; color: rgb(var(--v-theme-on-surface-variant)); }
:deep(.maplibregl-ctrl-attrib a) { color: inherit; }

/* pastylki pociągów (znaczniki HTML MapLibre, tworzone w syncTrains): kolor linii, kierunek, ikona, numer */
.map :deep(.train-pill) {
  position: relative; display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 10px 0 3px; border: 0; border-radius: 13px; cursor: pointer;
  background: rgb(var(--v-theme-inverse-surface)); color: rgb(var(--v-theme-on-inverse-surface));
  font: 800 12px/1 var(--kw-font); font-variant-numeric: tabular-nums; white-space: nowrap;
  box-shadow: 0 0 0 1.5px rgb(var(--v-theme-surface)), 0 1px 4px rgb(0 0 0 / .35); transition: opacity .15s, transform .15s;
}
.map :deep(.train-pill svg) { width: 14px; height: 14px; fill: currentColor; flex: none; }
/* kółko linii: strzałka kierunku (albo ikona pojazdu, gdy stoi) na kolorze linii */
.map :deep(.train-pill .arr), .map :deep(.train-pill.still .veh) {
  width: 20px; height: 20px; padding: 3px; border-radius: 50%; background: var(--c); fill: var(--on); box-sizing: border-box;
}
.map :deep(.train-pill .arr) { padding: 3.5px; transform: rotate(var(--bearing)); }
.map :deep(.train-pill .arr path) { fill: none; stroke: var(--on); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.map :deep(.train-pill.still .arr) { display: none; }
/* ikona pojazdu w pastylce tylko dla autobusu zastępczego (i w kółku stojącego pojazdu) */
.map :deep(.train-pill .veh) { display: none; }
.map :deep(.train-pill.bus .veh), .map :deep(.train-pill.still .veh) { display: block; }
/* opóźnienie: żółta plakietka w rogu */
.map :deep(.train-pill .late) {
  position: absolute; top: -9px; right: -8px; height: 16px; padding: 0 5px; border-radius: 8px; font-size: 10px; line-height: 16px;
  background: #F5B83D; color: #2E1A00; box-shadow: 0 0 0 1.5px rgb(var(--v-theme-surface));
}
.map :deep(.train-pill .late:empty) { display: none; }
/* kierunek przy kółku: trójkąt na obwodzie (tylko w trybie compact) */
.map :deep(.train-pill .orbit) { display: none; position: absolute; inset: -1px; transform: rotate(var(--bearing)); pointer-events: none; }
.map :deep(.train-pill .orbit::before) {
  content: ''; position: absolute; left: 50%; top: -7px; margin-left: -5px;
  border: 5px solid transparent; border-top: 0; border-bottom: 6px solid var(--c);
}
.map :deep(.train-pill:hover) { transform: scale(1.08); }
.map :deep(.train-pill:focus-visible) { outline: 3px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
.map :deep(.train-pill.selected) { transform: scale(1.15); box-shadow: 0 0 0 2px rgb(var(--v-theme-surface)), 0 0 0 4.5px rgb(var(--v-theme-primary)), 0 2px 8px rgb(0 0 0 / .4); }
.map :deep(.train-pill.dim) { opacity: .35; }
.map :deep(.train-marker:hover), .map :deep(.train-marker:focus-within) { z-index: 10 !important; }
/* zasłonięta przez inną (layoutPills): kółko z ikoną i trójkątem kierunku, numer po najechaniu */
.map :deep(.train-pill.compact) { width: 22px; height: 22px; padding: 0; justify-content: center; border-radius: 50%; background: var(--c); color: var(--on); }
.map :deep(.train-pill.compact .veh) { display: block; width: 14px; height: 14px; padding: 0; background: none; fill: currentColor; }
.map :deep(.train-pill.compact .arr), .map :deep(.train-pill.compact .no), .map :deep(.train-pill.compact .late) { display: none; }
.map :deep(.train-pill.compact .orbit) { display: block; }
.map :deep(.train-pill.compact.still .orbit) { display: none; }
.map :deep(.train-pill.compact:hover), .map :deep(.train-pill.compact:focus-visible) {
  width: auto; height: 26px; padding: 0 10px 0 3px; border-radius: 13px; background: rgb(var(--v-theme-inverse-surface)); color: rgb(var(--v-theme-on-inverse-surface));
}
.map :deep(.train-pill.compact:hover .no), .map :deep(.train-pill.compact:hover .arr) { display: inline; }
.map :deep(.train-pill.compact:hover .veh) { display: none; }
.map :deep(.train-pill.compact:hover .orbit) { display: none; }

/* znaczek utrudnienia na linii / stacji (syncAlerts) */
.map :deep(.alert-badge) {
  display: grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 50%; cursor: pointer;
  background: #F5B83D; color: #2E1A00; box-shadow: 0 0 0 2px rgb(var(--v-theme-surface)), 0 2px 5px rgb(0 0 0 / .3); transition: transform .15s;
}
.map :deep(.alert-badge.danger) { background: rgb(var(--v-theme-error)); color: rgb(var(--v-theme-on-error)); }
.map :deep(.alert-badge svg) { width: 16px; height: 16px; fill: currentColor; }
.map :deep(.alert-badge:hover) { transform: scale(1.1); }
.map :deep(.alert-badge:focus-visible) { outline: 3px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
.map :deep(.alert-badge.selected) { transform: scale(1.25); box-shadow: 0 0 0 2.5px rgb(var(--v-theme-surface)), 0 0 0 5px rgb(var(--v-theme-primary)), 0 3px 8px rgb(0 0 0 / .35); }

@media (max-width: 839px) {
  .map-screen { height: calc(100dvh - 64px - 80px - env(safe-area-inset-bottom, 0px)); }
  .map-sheet { top: auto; right: 0; bottom: 0; left: 0; width: auto; max-height: 70%; border-radius: var(--kw-r-xl) var(--kw-r-xl) 0 0; transition: translate .34s cubic-bezier(.2, 0, 0, 1); }
  .map-sheet.pop-enter-from, .map-sheet.pop-leave-to { opacity: 1; translate: 0 100%; }
  .map-sheet.pop-leave-active { transition-duration: .22s; }
  .fabs.top { top: 12px; right: 12px; }
  .fabs.bottom { right: 12px; bottom: 16px; }
  .fabs.bottom.raised { bottom: calc(65% + 12px); }
  .panel { left: 0; right: 0; top: auto; bottom: 0; width: auto; height: 65%; border-radius: var(--kw-r-xl) var(--kw-r-xl) 0 0; }
}
</style>
