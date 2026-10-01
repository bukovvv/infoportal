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
import { loadMapStyle } from '@/utils/mapStyle'

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
const routeLine = shallowRef<GeoJSON.Feature | null>(null)
let map: MlMap | null = null

const keyOf = (t: LiveTrain) => t.key ?? `gps:${t.number}`
const stateOf = (t: LiveTrain) => (t.source === 'est' && t.delay === null ? 'est' : (t.delay ?? 0) >= 2 ? 'delay' : t.source === 'est' ? 'est' : 'ontime')

const visible = computed(() => {
  const q = normalize(query.value)
  return live.trains
    .filter((t) => filter.value === 'all' || (filter.value === 'late' ? (t.delay ?? 0) >= 2 : t.source === 'est'))
    .filter((t) => !q || t.number.includes(q) || [t.origin, t.destination, t.next?.name, t.prev?.name].some((s) => s && normalize(s).includes(q)))
    .sort((a, b) => Number(keyOf(b) === selectedKey.value) - Number(keyOf(a) === selectedKey.value) || (b.delay ?? 0) - (a.delay ?? 0) || a.number.localeCompare(b.number, 'pl', { numeric: true }))
})
const stats = computed(() => ({
  all: live.trains.length,
  late: live.trains.filter((t) => (t.delay ?? 0) >= 2).length,
  gps: live.trains.filter((t) => t.source === 'gps').length,
}))

function colors() {
  const c = theme.current.value.colors as Record<string, string>
  return { primary: c.primary, delay: c.warning, est: c.info, surface: c['surface-container-lowest'], outline: c.outline, text: c['on-surface'], halo: c.surface }
}

function trainsGeoJson(): GeoJSON.FeatureCollection {
  const ids = new Set(visible.value.map(keyOf))
  return {
    type: 'FeatureCollection',
    features: live.trains.filter((t) => ids.has(keyOf(t))).map((t) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [t.lon, t.lat] },
      properties: { key: keyOf(t), number: t.number.split('/')[0], state: stateOf(t), selected: keyOf(t) === selectedKey.value, bus: t.isBus },
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
  const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
  map.addSource('kw-network', { type: 'geojson', data: network.value ?? empty })
  map.addSource('kw-route', { type: 'geojson', data: routeLine.value ?? empty })
  map.addSource('kw-stations', { type: 'geojson', data: stationsGeoJson() })
  map.addSource('kw-trains', { type: 'geojson', data: trainsGeoJson() })
  map.addLayer({ id: 'kw-network', type: 'line', source: 'kw-network', filter: ['!', ['get', 'bus']], layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-opacity': 0.5, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.5, 11, 3, 14, 5] } })
  map.addLayer({ id: 'kw-route-casing', type: 'line', source: 'kw-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': c.halo, 'line-width': 9 } })
  map.addLayer({ id: 'kw-route', type: 'line', source: 'kw-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': c.primary, 'line-width': 5 } })
  map.addLayer({ id: 'kw-stations', type: 'circle', source: 'kw-stations', minzoom: 8,
    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, ['case', ['get', 'major'], 3.5, 2], 13, 5], 'circle-color': c.surface, 'circle-stroke-color': c.outline, 'circle-stroke-width': 1.5 } })
  map.addLayer({ id: 'kw-station-labels', type: 'symbol', source: 'kw-stations', minzoom: 8,
    filter: ['any', ['get', 'major'], ['>=', ['zoom'], 10.5]],
    layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': ['case', ['get', 'major'], 12, 11], 'text-offset': [0.8, 0], 'text-anchor': 'left', 'text-optional': true },
    paint: { 'text-color': c.text, 'text-halo-color': c.halo, 'text-halo-width': 1.5 } })
  const stateColor = ['match', ['get', 'state'], 'delay', c.delay, 'est', c.est, c.primary] as unknown as string
  map.addLayer({ id: 'kw-trains-halo', type: 'circle', source: 'kw-trains', filter: ['get', 'selected'], paint: { 'circle-radius': 18, 'circle-color': c.primary, 'circle-opacity': 0.18 } })
  map.addLayer({ id: 'kw-trains', type: 'circle', source: 'kw-trains',
    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 5, 12, 8], 'circle-color': stateColor, 'circle-stroke-color': c.surface, 'circle-stroke-width': 2.5 } })
  map.addLayer({ id: 'kw-train-labels', type: 'symbol', source: 'kw-trains',
    filter: ['any', ['get', 'selected'], ['>=', ['zoom'], 10]],
    layout: { 'text-field': ['get', 'number'], 'text-font': ['Noto Sans Bold'], 'text-size': 11, 'text-offset': [0, -1.5], 'text-allow-overlap': false },
    paint: { 'text-color': c.text, 'text-halo-color': c.halo, 'text-halo-width': 2 } })
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

async function select(key: string, fromList = false) {
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
    routeLine.value = { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }
    ;(map?.getSource('kw-route') as GeoJSONSource | undefined)?.setData(routeLine.value)
    if (fromList && train && mdAndUp.value) map?.flyTo({ center: [train.lon, train.lat], zoom: Math.max(map.getZoom(), 10), padding: padding() })
    else fitCoords(coords)
  } catch (e) {
    ui.notify((e as Error).message)
  }
}

function clearSelection() {
  selectedKey.value = null
  routeLine.value = null
  ;(map?.getSource('kw-route') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [] })
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
const filters = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'late', label: 'Opóźnione' },
  { value: 'est', label: 'Bez GPS' },
] as const
</script>

<template>
  <div class="map-screen">
    <div ref="container" class="map" role="region" aria-label="Mapa pociągów Kolei Wielkopolskich" />
    <v-alert v-if="mapError" color="error-container" icon="error" class="map-error" rounded="lg">{{ mapError }}</v-alert>

    <div class="legend" aria-hidden="true">
      <span><i class="lg" />Planowo</span><span><i class="lg d" />Opóźniony</span><span><i class="lg e" />Pozycja z rozkładu</span>
    </div>
    <div class="controls">
      <v-btn icon="add" color="surface-container-high" rounded="lg" size="40" elevation="2" aria-label="Przybliż" @click="zoom(1)" />
      <v-btn icon="remove" color="surface-container-high" rounded="lg" size="40" elevation="2" aria-label="Oddal" @click="zoom(-1)" />
      <v-btn icon="fit_screen" color="surface-container-high" rounded="lg" size="40" elevation="2" aria-label="Pokaż całą sieć" @click="fitNetwork" />
      <v-btn icon="my_location" color="surface-container-high" rounded="lg" size="40" elevation="2" aria-label="Moja lokalizacja" @click="locate" />
    </div>

    <aside class="panel" :class="{ expanded }" aria-label="Pociągi w ruchu">
      <button v-if="!mdAndUp" class="handle" type="button" :aria-expanded="expanded" aria-label="Rozwiń listę pociągów" @click="expanded = !expanded" />
      <div class="panel-head">
        <div class="stats" aria-live="polite">
          <div><strong class="tnum">{{ stats.all }}</strong><span class="text-label-medium muted">w ruchu</span></div>
          <div><strong class="tnum">{{ stats.late }}</strong><span class="text-label-medium muted">opóźnione</span></div>
          <div><strong class="tnum">{{ stats.gps }}</strong><span class="text-label-medium muted">z GPS</span></div>
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
          @click="select(keyOf(t), true)"
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
  border-radius: 16px; background: rgb(var(--v-theme-surface-container-low)); box-shadow: 0 1px 2px rgb(0 0 0 / .3), 0 2px 6px 2px rgb(0 0 0 / .15);
}
.panel-head { display: grid; gap: 12px; padding: 12px 16px; }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.stats div { display: grid; padding: 8px 12px; border-radius: 12px; background: rgb(var(--v-theme-surface-container-lowest)); }
.stats strong { font-size: 22px; line-height: 28px; font-weight: 400; }
.list { flex: 1; min-height: 0; overflow: auto; }
.lead { display: grid; place-items: center; width: 40px; height: 40px; margin-right: 12px; border-radius: 50%; background: rgb(var(--v-theme-primary-container)); color: rgb(var(--v-theme-on-primary-container)); }
.lead.delay { background: rgb(var(--v-theme-warning-container)); color: rgb(var(--v-theme-on-warning-container)); }
.lead.est { background: rgb(var(--v-theme-info-container)); color: rgb(var(--v-theme-on-info-container)); }
.controls { position: absolute; z-index: 2; right: 16px; bottom: 32px; display: grid; gap: 12px; }
.legend { position: absolute; z-index: 2; right: 16px; top: 16px; display: flex; flex-wrap: wrap; gap: 12px; padding: 6px 12px; border-radius: 8px; background: rgb(var(--v-theme-surface-container-high)); font-size: 12px; font-weight: 500; box-shadow: 0 1px 2px rgb(0 0 0 / .3); }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.lg { width: 10px; height: 10px; border-radius: 50%; background: rgb(var(--v-theme-primary)); }
.lg.d { background: rgb(var(--v-theme-warning)); }
.lg.e { background: rgb(var(--v-theme-info)); }
:deep(.chip-on) { background: rgb(var(--v-theme-secondary-container)); color: rgb(var(--v-theme-on-secondary-container)); border-color: transparent; }
:deep(.maplibregl-ctrl-attrib) { font-size: 11px; }
.handle { display: grid; place-items: center; width: 100%; height: 24px; border: 0; background: none; cursor: pointer; }
.handle::before { content: ''; width: 32px; height: 4px; border-radius: 2px; background: color-mix(in srgb, rgb(var(--v-theme-on-surface-variant)) 40%, transparent); }
@media (max-width: 839px) {
  .map-screen { height: calc(100dvh - 64px - 80px - env(safe-area-inset-bottom, 0px)); }
  .panel { left: 0; right: 0; top: auto; bottom: 0; width: auto; height: 132px; border-radius: 28px 28px 0 0; transition: height .3s cubic-bezier(.2, 0, 0, 1); }
  .panel.expanded { height: 72%; }
  .panel-head { padding-top: 0; }
  .controls { bottom: 148px; }
  .legend { left: 16px; right: auto; }
  .stats strong { font-size: 18px; }
}
</style>
