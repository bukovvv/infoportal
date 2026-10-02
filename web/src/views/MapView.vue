<script setup lang="ts">
import 'maplibre-gl/dist/maplibre-gl.css'
import { type GeoJSONSource, type LngLatBoundsLike, Map as MlMap, setWorkerUrl } from 'maplibre-gl'
import maplibreWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay, useTheme } from 'vuetify'
import { api } from '@/api/client'
import type { LiveTrain } from '@/api/types'
import StatusTag from '@/components/StatusTag.vue'
import { useLive, useStations } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { clock, normalize } from '@/utils/format'
import type { Trip } from '@/api/types'
import { loadMapStyle, mapPalette } from '@/utils/mapStyle'

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
const expanded = ref(false)
const mapError = ref<string | null>(null)
const network = shallowRef<GeoJSON.FeatureCollection | null>(null)
const routeTrip = shallowRef<Trip | null>(null)
let map: MlMap | null = null

const keyOf = (t: LiveTrain) => t.key ?? `gps:${t.number}`
// kolor: opóźnienie znane (PLK lub GPS) → planowo/opóźniony; brak danych na żywo → tylko rozkład
const stateOf = (t: LiveTrain) => (t.delay === null ? 'est' : t.delay >= 2 ? 'delay' : 'ontime')

const visible = computed(() => {
  const q = normalize(query.value)
  return live.trains
    .filter((t) => filter.value === 'all' || (filter.value === 'late' ? (t.delay ?? 0) >= 2 : t.delay === null))
    .filter((t) => !q || t.number.includes(q) || [t.origin, t.destination, t.next?.name, t.prev?.name].some((s) => s && normalize(s).includes(q)))
    .sort((a, b) => Number(keyOf(b) === selectedKey.value) - Number(keyOf(a) === selectedKey.value) || (b.delay ?? 0) - (a.delay ?? 0) || a.number.localeCompare(b.number, 'pl', { numeric: true }))
})
const stats = computed(() => ({
  all: live.trains.length,
  late: live.trains.filter((t) => (t.delay ?? 0) >= 2).length,
  live: live.trains.filter((t) => t.delay !== null).length,
}))

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

function trainsGeoJson(): GeoJSON.FeatureCollection {
  const ids = new Set(visible.value.map(keyOf))
  return {
    type: 'FeatureCollection',
    features: live.trains.filter((t) => ids.has(keyOf(t))).map((t) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [t.lon, t.lat] },
      properties: { key: keyOf(t), number: t.number.split('/')[0], state: stateOf(t), selected: keyOf(t) === selectedKey.value, dim: !!selectedKey.value && keyOf(t) !== selectedKey.value, bus: t.isBus },
    })),
  }
}

function stationsGeoJson(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: stations.list.map((s) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] }, properties: { id: s.id, name: s.name, major: s.daily >= 60 } })),
  }
}

function addOverlays() {
  if (!map || map.getSource('kw-trains')) return
  const c = colors()
  map.addSource('kw-network', { type: 'geojson', data: network.value ?? empty })
  map.addSource('kw-route', { type: 'geojson', data: routeGeoJson() })
  map.addSource('kw-route-stops', { type: 'geojson', data: routeStopsGeoJson() })
  map.addSource('kw-stations', { type: 'geojson', data: stationsGeoJson() })
  map.addSource('kw-trains', { type: 'geojson', data: trainsGeoJson() })
  map.addLayer({ id: 'kw-network', type: 'line', source: 'kw-network', filter: ['!', ['get', 'bus']], layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': c.network, 'line-opacity': routeTrip.value ? 0.35 : 0.9, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.5, 11, 3, 14, 5] } })
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
  const stateColor = ['match', ['get', 'state'], 'delay', c.delay, 'est', c.est, c.ontime] as unknown as string
  const dimmed = ['case', ['get', 'dim'], 0.35, 1] as unknown as number
  map.addLayer({ id: 'kw-trains-halo', type: 'circle', source: 'kw-trains', filter: ['get', 'selected'], paint: { 'circle-radius': 18, 'circle-color': c.primary, 'circle-opacity': 0.18 } })
  map.addLayer({ id: 'kw-trains', type: 'circle', source: 'kw-trains',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, ['case', ['get', 'selected'], 7, 5], 12, ['case', ['get', 'selected'], 10, 8]],
      'circle-color': stateColor, 'circle-stroke-color': c.surface, 'circle-stroke-width': 2.5, 'circle-opacity': dimmed, 'circle-stroke-opacity': dimmed,
    } })
  map.addLayer({ id: 'kw-train-labels', type: 'symbol', source: 'kw-trains',
    filter: ['any', ['get', 'selected'], ['>=', ['zoom'], 10]],
    layout: { 'text-field': ['get', 'number'], 'text-font': ['Noto Sans Bold'], 'text-size': 11, 'text-offset': [0, -1.5], 'text-allow-overlap': false },
    paint: { 'text-color': c.text, 'text-halo-color': c.halo, 'text-halo-width': 2, 'text-opacity': dimmed } })
}

/** Marginesy na panel listy i arkusz pociągu, zmniejszane proporcjonalnie w małych oknach. */
function padding() {
  const p = mdAndUp.value
    ? { left: 400, right: ui.sheet?.docked ? 460 : 60, top: 60, bottom: 40 }
    : { left: 24, right: 24, top: 56, bottom: expanded.value ? 300 : 150 }
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
  if (!mdAndUp.value) expanded.value = false
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

watch([() => live.trains, filter, query, selectedKey], () => {
  ;(map?.getSource('kw-trains') as GeoJSONSource | undefined)?.setData(trainsGeoJson())
})
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
    m.on('click', 'kw-trains', (e) => {
      const key = e.features?.[0]?.properties?.key
      if (key) void select(String(key))
    })
    m.on('mouseenter', 'kw-trains', () => { m.getCanvas().style.cursor = 'pointer' })
    m.on('mouseleave', 'kw-trains', () => { m.getCanvas().style.cursor = '' })
    m.once('load', () => {
      if (selectedKey.value) void select(selectedKey.value)
      else fitNetwork()
    })
  } catch (e) {
    mapError.value = (e as Error).message || 'Nie udało się wczytać mapy.'
  }
})
onBeforeUnmount(() => {
  if (ui.sheet?.docked) ui.closeTrain()
  map?.remove()
  map = null
})

const whereText = (t: LiveTrain) => {
  if (!t.prev) return t.gpsProvider ? `Pozycja GPS · ${t.gpsProvider}` : ''
  if (t.dwelling || !t.next || t.prev.seq === t.next.seq) return `Na stacji ${t.prev.name}`
  return `${t.prev.name} → ${t.next.name}`
}
const legend = computed(() => mapPalette(theme.global.name.value === 'dark' ? 'dark' : 'light'))
const filters = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'late', label: 'Opóźnione' },
  { value: 'est', label: 'Tylko rozkład' },
] as const
</script>

<template>
  <div class="map-screen">
    <div ref="container" class="map" role="region" aria-label="Mapa pociągów Kolei Wielkopolskich" />
    <v-alert v-if="mapError" color="error-container" icon="error" class="map-error">{{ mapError }}</v-alert>

    <div class="legend" aria-hidden="true">
      <span><i class="lg" />Planowo</span><span><i class="lg d" />Opóźniony</span><span><i class="lg e" />Bez danych na żywo</span>
    </div>
    <div class="controls">
      <v-btn icon="add" color="surface-container-high" size="40" elevation="2" aria-label="Przybliż" @click="zoom(1)" />
      <v-btn icon="remove" color="surface-container-high" size="40" elevation="2" aria-label="Oddal" @click="zoom(-1)" />
      <v-btn icon="fit_screen" color="surface-container-high" size="40" elevation="2" aria-label="Pokaż całą sieć" @click="fitNetwork" />
      <v-btn icon="my_location" color="surface-container-high" size="40" elevation="2" aria-label="Moja lokalizacja" @click="locate" />
    </div>

    <aside class="panel" :class="{ expanded }" aria-label="Pociągi w ruchu">
      <button v-if="!mdAndUp" class="handle" type="button" :aria-expanded="expanded" aria-label="Rozwiń listę pociągów" @click="expanded = !expanded" />
      <div class="panel-head">
        <div class="stats" aria-live="polite">
          <div><strong class="tnum">{{ stats.all }}</strong><span class="text-label-medium muted">w ruchu</span></div>
          <div><strong class="tnum">{{ stats.late }}</strong><span class="text-label-medium muted">opóźnione</span></div>
          <div><strong class="tnum">{{ stats.live }}</strong><span class="text-label-medium muted">z danymi PLK</span></div>
        </div>
        <template v-if="mdAndUp || expanded">
          <v-text-field v-model="query" label="Numer pociągu lub stacja" prepend-inner-icon="search" density="compact" hide-details clearable />
          <v-chip-group v-model="filter" mandatory selected-class="chip-on">
            <v-chip v-for="f in filters" :key="f.value" :value="f.value" variant="outlined" size="small" filter>{{ f.label }}</v-chip>
          </v-chip-group>
        </template>
      </div>
      <v-list v-if="mdAndUp || expanded" class="list" bg-color="transparent" lines="two" density="comfortable">
        <v-list-item
          v-for="t in visible"
          :key="keyOf(t)"
          :active="keyOf(t) === selectedKey"
          color="secondary"
          @click="select(keyOf(t))"
        >
          <template #prepend>
            <span class="lead" :class="stateOf(t)"><v-icon :icon="t.isBus ? 'directions_bus' : 'train'" /></span>
          </template>
          <v-list-item-title class="text-title-small">
            KW {{ t.number }} <span v-if="t.destination" class="muted font-weight-regular">→ {{ t.destination }}</span>
          </v-list-item-title>
          <v-list-item-subtitle class="text-body-small">
            {{ whereText(t) }}<template v-if="t.speed"> · {{ t.speed }} km/h</template><template v-if="t.next?.expected && !t.dwelling"> · {{ clock(t.next.expected) }}</template>
          </v-list-item-subtitle>
          <template #append>
            <StatusTag :delay="t.delay" :source="t.delaySource" :estimated="t.source === 'est'" />
          </template>
        </v-list-item>
        <v-list-item v-if="!visible.length" :title="live.data ? 'Żaden pociąg nie pasuje do filtrów' : 'Wczytywanie pozycji…'" />
      </v-list>
    </aside>
  </div>
</template>

<style scoped>
.map-screen { position: relative; height: calc(100dvh - 64px); overflow: hidden; background: rgb(var(--v-theme-surface-container-low)); }
.map { position: absolute; inset: 0; }
.map-error { position: absolute; z-index: 3; top: 16px; left: 50%; transform: translateX(-50%); }
.panel {
  position: absolute; z-index: 2; left: 16px; top: 16px; bottom: 16px; width: 360px; display: flex; flex-direction: column;
  border-radius: var(--kw-r-l); background: rgb(var(--v-theme-surface-container-low)); box-shadow: 0 1px 2px rgb(0 0 0 / .3), 0 2px 6px 2px rgb(0 0 0 / .15);
}
.panel-head { display: grid; gap: 12px; padding: 12px 16px; }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.stats div { display: grid; padding: 8px 12px; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-surface-container-lowest)); }
.stats strong { font-size: 22px; line-height: 28px; font-weight: 400; }
.list { flex: 1; min-height: 0; overflow: auto; }
.lead { display: grid; place-items: center; width: 40px; height: 40px; margin-right: 12px; border-radius: 50%; background: rgb(var(--v-theme-success-container)); color: rgb(var(--v-theme-on-success-container)); }
.lead.delay { background: rgb(var(--v-theme-warning-container)); color: rgb(var(--v-theme-on-warning-container)); }
.lead.est { background: rgb(var(--v-theme-info-container)); color: rgb(var(--v-theme-on-info-container)); }
.controls { position: absolute; z-index: 2; right: 16px; bottom: 32px; display: grid; gap: 12px; }
.legend { position: absolute; z-index: 2; right: 16px; top: 16px; display: flex; flex-wrap: wrap; gap: 12px; padding: 6px 14px; border-radius: 999px; background: rgb(var(--v-theme-surface-container-high)); font-size: 12px; font-weight: 500; box-shadow: 0 1px 2px rgb(0 0 0 / .3); }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.lg { width: 10px; height: 10px; border-radius: 50%; background: v-bind('legend.ontime'); }
.lg.d { background: v-bind('legend.late'); }
.lg.e { background: v-bind('legend.est'); }
:deep(.chip-on) { background: rgb(var(--v-theme-secondary-container)); color: rgb(var(--v-theme-on-secondary-container)); border-color: transparent; }
:deep(.maplibregl-ctrl-attrib) { font-size: 11px; }
.handle { display: grid; place-items: center; width: 100%; height: 24px; border: 0; background: none; cursor: pointer; }
.handle::before { content: ''; width: 32px; height: 4px; border-radius: 2px; background: color-mix(in srgb, rgb(var(--v-theme-on-surface-variant)) 40%, transparent); }
@media (max-width: 839px) {
  .map-screen { height: calc(100dvh - 64px - 80px - env(safe-area-inset-bottom, 0px)); }
  .panel { left: 0; right: 0; top: auto; bottom: 0; width: auto; height: 132px; border-radius: var(--kw-r-xl) var(--kw-r-xl) 0 0; transition: height .3s cubic-bezier(.2, 0, 0, 1); }
  .panel.expanded { height: 72%; }
  .panel-head { padding-top: 0; }
  .controls { bottom: 148px; }
  .legend { left: 16px; right: auto; }
  .stats strong { font-size: 18px; }
}
</style>
