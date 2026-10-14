<script setup lang="ts">
import 'maplibre-gl/dist/maplibre-gl.css'
import { type GeoJSONSource, type LngLatBoundsLike, Map as MlMap, Marker, setWorkerUrl } from 'maplibre-gl'
import maplibreWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay, useTheme } from 'vuetify'
import { api } from '@/api/client'
import type { LiveTrain } from '@/api/types'
import MapSwitch from '@/components/MapSwitch.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useLive, useStations } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { clock, normalize } from '@/utils/format'
import type { Trip } from '@/api/types'
import { loadMapStyle, mapPalette } from '@/utils/mapStyle'
import icons from 'virtual:material-symbols'

// Worker MapLibre jest modułem ES — Vite pakuje go osobno i podaje jego adres.
setWorkerUrl(maplibreWorker)

const route = useRoute()
const router = useRouter()
const live = useLive()
const stations = useStations()
const ui = useUi()
const theme = useTheme()
const { mdAndUp } = useDisplay()

const container = ref<HTMLElement | null>(null)
const selectedKey = ref<string | null>((route.query.kurs as string) || null)
const filter = ref<'all' | 'late' | 'est'>('all')
const query = ref('')
/** lista pociągów z wyszukiwarką (domyślnie schowana — mapa na cały ekran) */
const listOpen = ref(false)
const mapError = ref<string | null>(null)
const network = shallowRef<GeoJSON.FeatureCollection | null>(null)
const routeTrip = shallowRef<Trip | null>(null)
let map: MlMap | null = null

const keyOf = (t: LiveTrain) => t.key ?? `gps:${t.number}`

const visible = computed(() => {
  const q = normalize(query.value)
  return live.trains
    .filter((t) => filter.value === 'all' || (filter.value === 'late' ? (t.delay ?? 0) >= 2 : t.delay === null))
    .filter((t) => !q || t.number.includes(q) || [t.origin, t.destination, t.next?.name, t.prev?.name].some((s) => s && normalize(s).includes(q)))
    .sort((a, b) => Number(keyOf(b) === selectedKey.value) - Number(keyOf(a) === selectedKey.value) || (b.delay ?? 0) - (a.delay ?? 0) || a.number.localeCompare(b.number, 'pl', { numeric: true }))
})

function colors() {
  const c = theme.current.value.colors as Record<string, string>
  const p = mapPalette(theme.global.name.value === 'dark' ? 'dark' : 'light')
  return {
    primary: c.primary, ontime: p.ontime, delay: p.late, est: p.est, network: p.network,
    surface: c['surface-container-lowest'], outline: c.outline, text: c['on-surface'], halo: c.surface,
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
  if (map.getLayer('kw-network')) map.setPaintProperty('kw-network', 'line-opacity', routeTrip.value ? 0.35 : 0.9)
}

/**
 * Pociągi jako pastylki HTML w kolorze linii (jak plakietka linii): strzałka w kierunku jazdy, ikona pociągu/autobusu
 * i numer; opóźnienie jako żółta plakietka w rogu. Mapa się nie obraca, więc obrót strzałki = kierunek względem północy.
 */
// marker: element pozycjonowany przez MapLibre (transform — bez animacji!), el: pastylka w środku (wygląd, powiększenie)
const markers = new Map<string, { marker: Marker; el: HTMLButtonElement }>()
const svg = (name: string, cls: string) => `<svg class="${cls}" viewBox="0 -960 960 960" aria-hidden="true"><path d="${icons[name] ?? ''}"/></svg>`
const stateLabel = (t: LiveTrain) => (t.delay === null ? 'bez danych na żywo' : t.delay >= 2 ? `opóźnienie ${t.delay} min` : 'planowo')
/** Kolory plakietki linii z rozkładu (autobus zastępczy i brak koloru — neutralnie). */
const pillColor = (t: LiveTrain) => (t.isBus || !t.route?.color
  ? { bg: 'rgb(var(--v-theme-inverse-surface))', fg: 'rgb(var(--v-theme-on-inverse-surface))' }
  : { bg: t.route.color, fg: t.route.textColor ?? '#FFFFFF' })

function pill(key: string, bus: boolean): HTMLButtonElement {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = 'train-pill'
  el.innerHTML = `<span class="orbit"></span>${svg('arrow_upward', 'arr')}${svg(bus ? 'directions_bus' : 'train', 'veh')}<span class="no"></span><span class="late"></span>`
  el.addEventListener('click', (e) => {
    e.stopPropagation()
    void select(key)
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
    m.el.querySelector('.no')!.textContent = number
    m.el.querySelector('.late')!.textContent = late ? `+${t.delay}` : ''
    m.el.setAttribute('aria-label', `KW ${t.number}${t.destination ? ` do ${t.destination}` : ''}, ${stateLabel(t)}`)
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
      const width = 48 + 7.5 * (m.el.querySelector('.no')?.textContent?.length ?? 5)
      const box: [number, number, number, number] = [p.x - width / 2 - 2, p.y - 16, p.x + width / 2 + 6, p.y + 14]
      const hit = placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])
      m.el.classList.toggle('compact', hit)
      // kółka pod pełnymi pastylkami, wybrany pociąg na wierzchu
      m.marker.getElement().style.zIndex = hit ? '0' : m.el.dataset.priority ?? '1'
      if (!hit) placed.push(box)
    }
  })
}

function stationsGeoJson(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: stations.list.map((s) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] }, properties: { id: s.id, name: s.name, major: s.daily >= 60 } })),
  }
}

function addOverlays() {
  if (!map || map.getSource('kw-network')) return
  const c = colors()
  map.addSource('kw-network', { type: 'geojson', data: network.value ?? empty })
  map.addSource('kw-route', { type: 'geojson', data: routeGeoJson() })
  map.addSource('kw-route-stops', { type: 'geojson', data: routeStopsGeoJson() })
  map.addSource('kw-stations', { type: 'geojson', data: stationsGeoJson() })
  map.addLayer({ id: 'kw-network', type: 'line', source: 'kw-network', filter: ['!', ['get', 'bus']], layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': c.network, 'line-opacity': routeTrip.value ? 0.35 : 0.9, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2, 11, 3.5, 14, 5] } })
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
  map.addLayer({ id: 'kw-stations', type: 'circle', source: 'kw-stations', minzoom: 8,
    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, ['case', ['get', 'major'], 3.5, 2], 13, 5], 'circle-color': c.surface, 'circle-stroke-color': c.outline, 'circle-stroke-width': 1.5 } })
  map.addLayer({ id: 'kw-station-labels', type: 'symbol', source: 'kw-stations', minzoom: 8,
    filter: ['any', ['get', 'major'], ['>=', ['zoom'], 10.5]],
    layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': ['case', ['get', 'major'], 12, 11], 'text-offset': [0.8, 0], 'text-anchor': 'left', 'text-optional': true },
    paint: { 'text-color': c.text, 'text-halo-color': c.halo, 'text-halo-width': 1.5 } })
  map.addLayer({ id: 'kw-route-labels', type: 'symbol', source: 'kw-route-stops', minzoom: 8,
    layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-offset': [0.9, 0], 'text-anchor': 'left', 'text-optional': true },
    paint: { 'text-color': c.text, 'text-halo-color': c.halo, 'text-halo-width': 2 } })
}

/** Marginesy na panel listy i arkusz pociągu, zmniejszane proporcjonalnie w małych oknach. */
function padding() {
  const p = mdAndUp.value
    ? { left: listOpen.value ? 400 : 60, right: ui.sheet?.docked ? 460 : 80, top: 72, bottom: 40 }
    : { left: 24, right: 72, top: 64, bottom: listOpen.value ? 360 : 40 }
  const w = container.value?.clientWidth ?? 800
  const h = container.value?.clientHeight ?? 600
  const kx = Math.min(1, (w * 0.7) / (p.left + p.right))
  const ky = Math.min(1, (h * 0.7) / (p.top + p.bottom))
  return { left: p.left * kx, right: p.right * kx, top: p.top * ky, bottom: p.bottom * ky }
}

function fitCoords(coords: [number, number][], maxZoom = 11) {
  if (!map || !coords.length) return
  const b = coords.reduce((acc, [x, y]) => [[Math.min(acc[0][0], x), Math.min(acc[0][1], y)], [Math.max(acc[1][0], x), Math.max(acc[1][1], y)]], [[Infinity, Infinity], [-Infinity, -Infinity]])
  map.fitBounds(b as LngLatBoundsLike, { padding: padding(), maxZoom, duration: 600 })
}

function fitNetwork() {
  const coords = (network.value?.features ?? []).flatMap((f: GeoJSON.Feature) => (f.geometry as GeoJSON.LineString).coordinates as [number, number][])
  fitCoords(coords.length ? coords : stations.list.map((s) => [s.lon, s.lat]), 9)
}

async function select(key: string) {
  selectedKey.value = key
  if (!mdAndUp.value) listOpen.value = false
  const train = live.trains.find((t) => keyOf(t) === key)
  if (key.startsWith('gps:')) {
    ui.openTrain({ number: key.slice(4).split('/')[0] }, true)
    if (train) map?.flyTo({ center: [train.lon, train.lat], zoom: Math.max(map.getZoom(), 11) })
    return
  }
  ui.openTrain({ key }, true)
  void router.replace({ query: { kurs: key } })
  try {
    const trip = await api.trip(key)
    if (selectedKey.value !== key) return
    const coords = (trip.shape.length ? trip.shape : trip.stops.filter((s) => s.station.lat !== null).map((s) => [s.station.lat!, s.station.lon!])).map(([lat, lon]) => [lon, lat] as [number, number])
    routeTrip.value = trip
    refreshRoute()
    fitCoords(coords)
  } catch (e) {
    ui.notify((e as Error).message)
  }
}

function clearSelection() {
  selectedKey.value = null
  routeTrip.value = null
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

watch([() => live.trains, filter, query, selectedKey], syncTrains)
// pociąg jedzie dalej — przesuwamy granicę odcinka przejechanego
watch(() => live.trains, () => { if (routeTrip.value) (map?.getSource('kw-route') as GeoJSONSource | undefined)?.setData(routeGeoJson()) })
watch(() => stations.list, () => (map?.getSource('kw-stations') as GeoJSONSource | undefined)?.setData(stationsGeoJson()))
watch(() => ui.sheet, (sheet) => { if (!sheet && selectedKey.value) clearSelection() })
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
      center: [17.2, 52.3],
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
    m.once('load', () => {
      // informacja o autorach mapy zwinięta do ikonki ⓘ (MapLibre rozwija ją na starcie)
      container.value?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
      syncTrains()
      if (selectedKey.value) void select(selectedKey.value)
      else fitNetwork()
    })
  } catch (e) {
    mapError.value = (e as Error).message || 'Nie udało się wczytać mapy.'
  }
})
onBeforeUnmount(() => {
  if (ui.sheet?.docked) ui.closeTrain()
  markers.clear()
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
  { value: 'all', label: 'Wszystkie pociągi' },
  { value: 'late', label: 'Tylko opóźnione' },
  { value: 'est', label: 'Bez danych na żywo' },
] as const
</script>

<template>
  <div class="map-screen">
    <div ref="container" class="map" role="region" aria-label="Mapa pociągów Kolei Wielkopolskich" />
    <v-alert v-if="mapError" color="error-container" icon="error" class="map-error">{{ mapError }}</v-alert>

    <div class="switch"><MapSwitch /></div>

    <div class="fabs top">
      <v-btn icon="search" :color="listOpen ? 'primary-container' : 'surface-container-high'" size="48" elevation="3" :aria-pressed="listOpen" aria-label="Szukaj pociągu" @click="listOpen = !listOpen" />
      <v-menu location="start top">
        <template #activator="{ props }">
          <v-btn v-bind="props" :color="filter === 'all' ? 'surface-container-high' : 'primary-container'" size="48" elevation="3" icon aria-label="Filtruj pociągi">
            <v-badge :model-value="filter !== 'all'" dot color="primary"><v-icon icon="filter_list" /></v-badge>
          </v-btn>
        </template>
        <v-list density="compact" nav>
          <v-list-subheader>Pokaż</v-list-subheader>
          <v-list-item v-for="f in filters" :key="f.value" :title="f.label" :active="filter === f.value" :prepend-icon="filter === f.value ? 'check' : undefined" @click="filter = f.value" />
        </v-list>
      </v-menu>
    </div>
    <div class="fabs bottom" :class="{ raised: listOpen && !mdAndUp }">
      <template v-if="mdAndUp">
        <v-btn icon="add" color="surface-container-high" size="44" elevation="3" aria-label="Przybliż" @click="zoom(1)" />
        <v-btn icon="remove" color="surface-container-high" size="44" elevation="3" aria-label="Oddal" @click="zoom(-1)" />
      </template>
      <v-btn icon="fit_screen" color="surface-container-high" size="48" elevation="3" aria-label="Pokaż całą sieć" @click="fitNetwork" />
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
            KW {{ t.number }} <span v-if="t.destination" class="muted font-weight-regular">→ {{ t.destination }}</span>
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
  </div>
</template>

<style scoped>
.map-screen { position: relative; height: calc(100dvh - 64px); overflow: hidden; background: rgb(var(--v-theme-surface-container-low)); }
.map { position: absolute; inset: 0; }
.map-error { position: absolute; z-index: 3; top: 72px; left: 50%; transform: translateX(-50%); }
.switch { position: absolute; z-index: 2; top: 16px; left: 50%; transform: translateX(-50%); }
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
  position: relative; display: inline-flex; align-items: center; gap: 3px; height: 24px; padding: 0 8px 0 5px; border: 0; border-radius: 12px; cursor: pointer;
  background: var(--c); color: var(--on); font: 800 12px/1 var(--kw-font); font-variant-numeric: tabular-nums; white-space: nowrap;
  box-shadow: 0 0 0 1.5px rgb(var(--v-theme-surface)), 0 1px 4px rgb(0 0 0 / .35); transition: opacity .15s, transform .15s;
}
.map :deep(.train-pill svg) { width: 14px; height: 14px; fill: currentColor; flex: none; }
.map :deep(.train-pill .arr) { transform: rotate(var(--bearing)); }
.map :deep(.train-pill.still .arr) { display: none; }
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
.map :deep(.train-pill.compact) { width: 22px; height: 22px; padding: 0; justify-content: center; border-radius: 50%; }
.map :deep(.train-pill.compact .arr), .map :deep(.train-pill.compact .no), .map :deep(.train-pill.compact .late) { display: none; }
.map :deep(.train-pill.compact .orbit) { display: block; }
.map :deep(.train-pill.compact.still .orbit) { display: none; }
.map :deep(.train-pill.compact:hover), .map :deep(.train-pill.compact:focus-visible) { width: auto; padding: 0 8px 0 5px; border-radius: 12px; }
.map :deep(.train-pill.compact:hover .no), .map :deep(.train-pill.compact:hover .arr) { display: inline; }
.map :deep(.train-pill.compact:hover .orbit) { display: none; }

@media (max-width: 839px) {
  .map-screen { height: calc(100dvh - 64px - 80px - env(safe-area-inset-bottom, 0px)); }
  .switch { top: 12px; }
  .fabs.top { top: 12px; right: 12px; }
  .fabs.bottom { right: 12px; bottom: 16px; }
  .fabs.bottom.raised { bottom: calc(65% + 12px); }
  .panel { left: 0; right: 0; top: auto; bottom: 0; width: auto; height: 65%; border-radius: var(--kw-r-xl) var(--kw-r-xl) 0 0; }
}
</style>
