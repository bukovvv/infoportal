<script setup lang="ts">
// Schemat połączeń KW: interaktywny odpowiednik mapy linii z oferty przewoźnika (przesuwanie, przybliżanie, linie i stacje do wybrania).
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay, useTheme } from 'vuetify'
import MapSwitch from '@/components/MapSwitch.vue'
import { useStations } from '@/stores/data'
import { plural } from '@/utils/format'
import {
  GAP, LEGEND, LINES, NODES, PKM_LINES, REGION, edgeLoads, linePoints, linesAt, roundedPath, stationMarkers,
  type SchemeLine, type StationMarker,
} from '@/utils/scheme'

const route = useRoute()
const router = useRouter()
const stations = useStations()
const theme = useTheme()
const { mdAndUp } = useDisplay()

const ALL = [...LINES, ...PKM_LINES]
const PKM_SORTED = [...PKM_LINES].sort((a, b) => (a.badge ?? '').localeCompare(b.badge ?? ''))
const queryLine = ALL.find((l) => l.id === route.query.linia)
const queryNode = typeof route.query.stacja === 'string' && NODES[route.query.stacja]?.name ? route.query.stacja : null

const mode = ref<'lines' | 'pkm'>(queryLine?.badge ? 'pkm' : 'lines')
const selectedLine = ref<string | null>(queryLine?.id ?? null)
const selectedNode = ref<string | null>(queryNode)
const hoverLine = ref<string | null>(null)
const expanded = ref(false)

const active = computed(() => (mode.value === 'pkm' ? PKM_LINES : LINES))
const line = computed(() => ALL.find((l) => l.id === selectedLine.value) ?? null)
const node = computed(() => (selectedNode.value ? NODES[selectedNode.value] : null))

function setMode(value: 'lines' | 'pkm') {
  if (value === mode.value) return
  mode.value = value
  selectedLine.value = null
  hoverLine.value = null
}
function selectLine(l: SchemeLine, zoom = false) {
  if (!!l.badge !== (mode.value === 'pkm')) setMode(l.badge ? 'pkm' : 'lines')
  selectedLine.value = l.id
  selectedNode.value = null
  hoverLine.value = null
  if (zoom) fitLine(l)
}
function selectNode(id: string) {
  selectedNode.value = id
  selectedLine.value = null
}
function clearSelection() {
  selectedLine.value = null
  selectedNode.value = null
}
watch([selectedLine, selectedNode], ([l, s]) => {
  void router.replace({ query: { ...(l ? { linia: l } : {}), ...(s ? { stacja: s } : {}) } })
})

// --- geometria (stała — liczona raz) ---
const baseLoads = edgeLoads(LINES)
const pkmLoads = edgeLoads(PKM_LINES)
const baseGeo = LINES.map((l) => ({ line: l, d: roundedPath(linePoints(l, baseLoads)) }))
// tło widoku PKM: sieć jako pojedyncze osie (bez rozsuwania linii na wspólnych odcinkach)
const ghostGeo = LINES.map((l) => ({ id: l.id, d: roundedPath(l.path.map((id) => NODES[id])) }))
const pkmGeo = PKM_LINES.map((l) => ({ line: l, d: roundedPath(linePoints(l, pkmLoads)) }))
const baseMarkers = stationMarkers(LINES, baseLoads)
const pkmMarkers = stationMarkers(PKM_LINES, pkmLoads)

const geo = computed(() => (mode.value === 'pkm' ? pkmGeo : baseGeo))
const markers = computed(() => (mode.value === 'pkm' ? pkmMarkers : baseMarkers))

const dark = computed(() => theme.global.name.value === 'dark')
const colorOf = (l: SchemeLine) => (dark.value && l.dark) || l.color

/** Linie wyróżnione: wskazana lub wybrana albo przechodzące przez wybraną stację. */
const focus = computed<Set<string> | null>(() => {
  const id = hoverLine.value ?? selectedLine.value
  if (id) return new Set([id])
  if (node.value?.name) return new Set(linesAt(node.value.name, active.value).map((l) => l.id))
  return null
})
const focusNodes = computed<Set<string> | null>(() => {
  if (!focus.value) return null
  const names = new Set(active.value.filter((l) => focus.value!.has(l.id)).flatMap((l) => l.stations))
  return new Set(Object.keys(NODES).filter((id) => names.has(NODES[id].name ?? '')))
})
const dimLine = (l: SchemeLine) => !!focus.value && !focus.value.has(l.id)
const dimNode = (id: string) => !!focusNodes.value && !focusNodes.value.has(id)

// --- znaczniki i podpisy ---
const R = 4.5
const HUB = 12
const markerHalf = (m: StationMarker) => (m.id === 'poz' ? HUB : m.width > 1 ? ((m.width - 1) * GAP) / 2 + R + 1 : m.terminal ? 7 : R)

function labelOf(m: StationMarker) {
  const n = NODES[m.id]
  const lines = (n.label ?? n.name ?? '').split('\n')
  const fs = m.id === 'poz' ? 16 : n.major ? 14 : 12
  const lh = fs + 1
  const o = markerHalf(m) + 5
  const at = n.at ?? 'r'
  const diag = o * 0.75
  const dx = at.includes('l') ? -(at.length > 1 ? diag : o) : at.includes('r') ? (at.length > 1 ? diag : o) : 0
  const anchor = dx < 0 ? 'end' : dx > 0 ? 'start' : 'middle'
  let top: number // linia bazowa pierwszego wiersza
  if (at === 'l' || at === 'r') top = n.y - ((lines.length - 1) * lh) / 2 + fs * 0.35
  else if (at.startsWith('t')) top = n.y - (at.length > 1 ? diag : o) - (lines.length - 1) * lh
  else top = n.y + (at.length > 1 ? diag : o) + fs * 0.75
  return { x: n.x + dx, top, lh, fs, anchor, lines, major: !!n.major, home: m.id === 'poz' }
}
const labels = computed(() => markers.value.map((m) => ({ id: m.id, ...labelOf(m) })))
const pillLength = (m: StationMarker) => (m.width - 1) * GAP + 2 * R

// --- przesuwanie i przybliżanie ---
const svgEl = ref<SVGSVGElement | null>(null)
const view = reactive({ x: 0, y: 0, k: 1 })
const BOUNDS = { x: 10, y: 92, w: 1010, h: 790 }
let fitK = 1
// po przesunięciu lub przybliżeniu zmiana rozmiaru okna (np. pasek adresu w telefonie) nie przywraca widoku całości
let touched = false

function padding() {
  return mdAndUp.value ? { l: 392, r: 24, t: 72, b: 24 } : { l: 8, r: 8, t: 64, b: 160 }
}
/** Ustawia widok na prostokąt schematu; bez argumentu — cały schemat. */
function fit(b = BOUNDS) {
  const el = svgEl.value
  if (!el) return
  const { width, height } = el.getBoundingClientRect()
  const p = padding()
  const w = Math.max(80, width - p.l - p.r)
  const h = Math.max(80, height - p.t - p.b)
  fitK = Math.min(w / BOUNDS.w, h / BOUNDS.h)
  const k = Math.min(w / b.w, h / b.h, fitK * 3)
  touched = b !== BOUNDS
  view.k = k
  view.x = p.l + (w - b.w * k) / 2 - b.x * k
  view.y = p.t + (h - b.h * k) / 2 - b.y * k
}
/** Przybliża do przebiegu linii (z zapasem na podpisy). */
function fitLine(l: SchemeLine) {
  const pts = l.path.map((id) => NODES[id])
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const mx = 90
  const my = 50
  fit({ x: Math.min(...xs) - mx, y: Math.min(...ys) - my, w: Math.max(...xs) - Math.min(...xs) + 2 * mx, h: Math.max(...ys) - Math.min(...ys) + 2 * my })
}
function zoomAt(px: number, py: number, factor: number) {
  const k = Math.min(Math.max(view.k * factor, fitK * 0.8), Math.max(3, fitK * 8))
  touched = true
  const r = k / view.k
  view.x = px - (px - view.x) * r
  view.y = py - (py - view.y) * r
  view.k = k
}
function zoomButton(factor: number) {
  const rect = svgEl.value?.getBoundingClientRect()
  if (!rect) return
  const p = padding()
  zoomAt(p.l + (rect.width - p.l - p.r) / 2, p.t + (rect.height - p.t - p.b) / 2, factor)
}
function onWheel(e: WheelEvent) {
  const rect = svgEl.value!.getBoundingClientRect()
  zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0018)))
}

const pointers = new Map<number, { x: number; y: number }>()
let moved = 0
let dragged = false
function onPointerDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pointers.size === 1) { moved = 0; dragged = false }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}
function onPointerMove(e: PointerEvent) {
  const prev = pointers.get(e.pointerId)
  if (!prev) return
  const cur = { x: e.clientX, y: e.clientY }
  if (pointers.size === 1) {
    touched = true
    view.x += cur.x - prev.x
    view.y += cur.y - prev.y
    moved += Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y)
  } else {
    const other = [...pointers].find(([id]) => id !== e.pointerId)![1]
    const rect = svgEl.value!.getBoundingClientRect()
    const d0 = Math.hypot(prev.x - other.x, prev.y - other.y) || 1
    const d1 = Math.hypot(cur.x - other.x, cur.y - other.y) || 1
    view.x += (cur.x - prev.x) / 2
    view.y += (cur.y - prev.y) / 2
    zoomAt((cur.x + other.x) / 2 - rect.left, (cur.y + other.y) / 2 - rect.top, d1 / d0)
    moved += 10
  }
  pointers.set(e.pointerId, cur)
  if (moved > 6) dragged = true
}
function onPointerUp(e: PointerEvent) {
  pointers.delete(e.pointerId)
  if (pointers.size) return
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
}
// kliknięcie po przeciągnięciu nie zmienia wyboru
const tap = (fn: () => void) => () => { if (!dragged) fn() }
const onBackground = tap(clearSelection)
const hover = (e: PointerEvent, id: string | null) => { if (e.pointerType === 'mouse') hoverLine.value = id }

let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  void stations.load()
  if (line.value) fitLine(line.value)
  else fit()
  resizeObserver = new ResizeObserver(() => { if (!touched) fit() })
  if (svgEl.value) resizeObserver.observe(svgEl.value)
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
})

// --- panel ---
const idByName = computed(() => new Map(stations.list.map((s) => [s.name, s.id])))
const schemeNames = new Set(Object.values(NODES).flatMap((n) => n.name ?? []))
const stationCount = (l: SchemeLine) => `${l.stations.length} ${plural(l.stations.length, 'stacja', 'stacje', 'stacji')}`
const listed = computed(() => (mode.value === 'pkm' ? PKM_SORTED : LEGEND))
const nodeLines = computed(() => (node.value?.name ? linesAt(node.value.name, LEGEND) : []))
const nodePkm = computed(() => (node.value?.name ? linesAt(node.value.name, PKM_SORTED) : []))
const nodeId = computed(() => (node.value?.name ? idByName.value.get(node.value.name) : undefined))
</script>

<template>
  <div class="scheme-screen">
    <svg
      ref="svgEl"
      class="canvas"
      role="img"
      aria-label="Schemat połączeń Kolei Wielkopolskich"
      @pointerdown="onPointerDown"
      @wheel.prevent="onWheel"
      @click="onBackground"
    >
      <g :transform="`translate(${view.x} ${view.y}) scale(${view.k})`">
        <path class="region" :d="REGION" />
        <!-- w widoku PKM pozostałe linie jako tło -->
        <g v-if="mode === 'pkm'" class="ghost">
          <path v-for="g in ghostGeo" :key="g.id" :d="g.d" />
        </g>
        <g class="lines">
          <path
            v-for="g in geo"
            :key="g.line.id"
            :d="g.d"
            :stroke="colorOf(g.line)"
            :class="{ dim: dimLine(g.line) }"
          />
        </g>
        <g class="hits" :style="{ strokeWidth: Math.max(16, 24 / view.k) }">
          <path
            v-for="g in geo"
            :key="g.line.id"
            :d="g.d"
            @pointerenter="hover($event, g.line.id)"
            @pointerleave="hover($event, null)"
            @click.stop="tap(() => selectLine(g.line))()"
          />
        </g>
        <g class="stations">
          <g
            v-for="m in markers"
            :key="m.id"
            class="station"
            :class="{ dim: dimNode(m.id), on: selectedNode === m.id }"
            :transform="`translate(${m.x} ${m.y})`"
            role="button"
            tabindex="0"
            :aria-label="NODES[m.id].name"
            @click.stop="tap(() => selectNode(m.id))()"
            @keydown.enter="selectNode(m.id)"
          >
            <circle class="hit" :r="Math.max(14, 20 / view.k)" />
            <circle v-if="selectedNode === m.id" class="ring" :r="markerHalf(m) + 6" />
            <circle v-if="m.id === 'poz'" class="mark end" :r="HUB" />
            <rect
              v-else-if="m.width > 1"
              class="mark"
              :x="-pillLength(m) / 2"
              :y="-R"
              :width="pillLength(m)"
              :height="2 * R"
              :rx="R"
              :transform="`rotate(${m.angle})`"
            />
            <circle v-else class="mark" :class="{ end: m.terminal }" :r="m.terminal ? 6.5 : R" />
          </g>
        </g>
        <g class="labels" aria-hidden="true">
          <text
            v-for="t in labels"
            :key="t.id"
            :x="t.x"
            :y="t.top"
            :text-anchor="t.anchor"
            :font-size="t.fs"
            :class="{ major: t.major, home: t.home, dim: dimNode(t.id) }"
          >
            <tspan v-for="(row, i) in t.lines" :key="i" :x="t.x" :dy="i ? t.lh : 0">{{ row }}</tspan>
          </text>
        </g>
      </g>
    </svg>

    <div class="switch"><MapSwitch /></div>
    <div class="controls" :class="{ raised: !!node && !expanded }">
      <v-btn icon="add" color="surface-container-high" size="40" elevation="2" aria-label="Przybliż" @click="zoomButton(1.4)" />
      <v-btn icon="remove" color="surface-container-high" size="40" elevation="2" aria-label="Oddal" @click="zoomButton(1 / 1.4)" />
      <v-btn icon="fit_screen" color="surface-container-high" size="40" elevation="2" aria-label="Pokaż cały schemat" @click="fit()" />
    </div>

    <aside class="panel" :class="{ expanded, station: !!node }" aria-label="Linie i stacje">
      <button v-if="!mdAndUp" class="handle" type="button" :aria-expanded="expanded" aria-label="Rozwiń panel" @click="expanded = !expanded" />
      <div class="panel-head">
        <v-btn-toggle :model-value="mode" mandatory variant="outlined" divided density="comfortable" class="modes" aria-label="Rodzaj linii" @update:model-value="setMode">
          <v-btn value="lines" :prepend-icon="mode === 'lines' ? 'check' : undefined">Linie KW</v-btn>
          <v-btn value="pkm" :prepend-icon="mode === 'pkm' ? 'check' : undefined">PKM</v-btn>
        </v-btn-toggle>
      </div>

      <div class="panel-body">
        <!-- wybrana stacja -->
        <template v-if="node">
          <div class="detail-head">
            <v-btn icon="arrow_back" variant="text" size="40" aria-label="Wróć do listy linii" @click="clearSelection" />
            <div class="min-w-0">
              <h2 :class="mdAndUp ? 'text-title-large' : 'text-title-medium'">{{ node.name }}</h2>
              <p class="text-body-medium muted">{{ nodeLines.length }} {{ plural(nodeLines.length, 'linia', 'linie', 'linii') }} KW</p>
            </div>
          </div>
          <div class="actions">
            <v-btn variant="flat" color="primary" prepend-icon="departure_board" :to="nodeId ? `/odjazdy/${nodeId}` : undefined" :disabled="!nodeId">Odjazdy</v-btn>
            <v-btn variant="outlined" prepend-icon="trip_origin" :to="nodeId ? { name: 'start', query: { z: nodeId }, hash: '#szukaj' } : undefined" :disabled="!nodeId">Stąd</v-btn>
            <v-btn variant="outlined" prepend-icon="location_on" :to="nodeId ? { name: 'start', query: { do: nodeId }, hash: '#szukaj' } : undefined" :disabled="!nodeId">Dotąd</v-btn>
          </div>
          <v-list bg-color="transparent" density="comfortable" class="line-list">
            <v-list-subheader>Linie</v-list-subheader>
            <v-list-item v-for="l in nodeLines" :key="l.id" :title="l.name" @click="selectLine(l, true)">
              <template #prepend><span class="swatch" :style="{ background: colorOf(l) }" /></template>
              <template #append><v-icon icon="chevron_right" /></template>
            </v-list-item>
            <template v-if="nodePkm.length">
              <v-list-subheader>Poznańska Kolej Metropolitalna</v-list-subheader>
              <v-list-item v-for="l in nodePkm" :key="l.id" :title="l.name" @click="selectLine(l, true)">
                <template #prepend><span class="badge" :style="{ background: l.color }">{{ l.badge }}</span></template>
                <template #append><v-icon icon="chevron_right" /></template>
              </v-list-item>
            </template>
          </v-list>
        </template>

        <!-- wybrana linia -->
        <template v-else-if="line">
          <div class="detail-head">
            <v-btn icon="arrow_back" variant="text" size="40" aria-label="Wróć do listy linii" @click="clearSelection" />
            <div class="min-w-0">
              <h2 :class="mdAndUp ? 'text-title-large' : 'text-title-medium'">
                <span v-if="line.badge" class="badge mr-1" :style="{ background: line.color }">{{ line.badge }}</span>{{ line.name }}
              </h2>
              <p class="text-body-medium muted">{{ stationCount(line) }}</p>
            </div>
          </div>
          <p v-if="line.note" class="text-body-medium note">{{ line.note }}</p>
          <ol class="stops" :style="{ '--c': colorOf(line) }">
            <li v-for="(s, i) in line.stations" :key="s" :class="{ key: schemeNames.has(s), end: i === 0 || i === line.stations.length - 1 }">
              <router-link v-if="idByName.get(s)" :to="`/odjazdy/${idByName.get(s)}`" :title="`Odjazdy: ${s}`">{{ s }}</router-link>
              <span v-else>{{ s }}</span>
            </li>
          </ol>
        </template>

        <!-- lista linii -->
        <template v-else>
          <p class="text-body-medium muted hint">
            {{ mode === 'pkm' ? 'Linie Poznańskiej Kolei Metropolitalnej obsługiwane przez KW.' : 'Wybierz linię albo stację, aby zobaczyć przebieg i odjazdy.' }}
          </p>
          <v-list bg-color="transparent" density="comfortable" class="line-list">
            <v-list-item
              v-for="l in listed"
              :key="l.id"
              :title="l.name"
              :subtitle="stationCount(l)"
              @click="selectLine(l, true)"
              @mouseenter="hoverLine = l.id"
              @mouseleave="hoverLine = null"
            >
              <template #prepend>
                <span v-if="l.badge" class="badge" :style="{ background: l.color }">{{ l.badge }}</span>
                <span v-else class="swatch" :style="{ background: colorOf(l) }" />
              </template>
            </v-list-item>
          </v-list>
          <p class="text-body-small muted foot">Schemat poglądowy — nie zachowuje odległości. Przebiegi i stacje według rozkładu KW.</p>
        </template>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.scheme-screen { position: relative; height: calc(100dvh - 64px); overflow: hidden; background: rgb(var(--v-theme-surface-container-lowest)); }
.canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; user-select: none; cursor: grab; }
.canvas:active { cursor: grabbing; }

.region { fill: rgb(var(--v-theme-surface-container)); stroke: rgb(var(--v-theme-outline-variant)); stroke-width: 2; stroke-linejoin: round; }
.lines path, .ghost path { fill: none; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; transition: opacity .15s; }
.ghost path { stroke: rgb(var(--v-theme-outline-variant)); stroke-width: 4; }
.lines path.dim { opacity: .14; }
.hits path { fill: none; stroke: transparent; stroke-linecap: round; cursor: pointer; }

.station { cursor: pointer; outline: none; transition: opacity .15s; }
.station .hit { fill: transparent; }
.station .mark { fill: rgb(var(--v-theme-surface-container-lowest)); stroke: rgb(var(--v-theme-on-surface)); stroke-width: 2; }
.station .mark.end { stroke-width: 3; }
.station .ring { fill: none; stroke: rgb(var(--v-theme-primary)); stroke-width: 3; }
.station:focus-visible .mark { stroke: rgb(var(--v-theme-primary)); stroke-width: 3.5; }
.station.dim { opacity: .3; }

.labels text { fill: rgb(var(--v-theme-on-surface)); font-weight: 600; paint-order: stroke; stroke: rgb(var(--v-theme-surface-container-lowest)); stroke-width: 3px; stroke-linejoin: round; pointer-events: none; transition: opacity .15s; }
.labels text.major { font-weight: 800; }
.labels text.home { fill: rgb(var(--v-theme-primary)); font-weight: 900; }
.labels text.dim { opacity: .3; }

.switch { position: absolute; z-index: 2; top: 16px; left: 50%; transform: translateX(-50%); }
.controls { position: absolute; z-index: 2; right: 16px; bottom: 32px; display: grid; gap: 12px; }

.panel {
  position: absolute; z-index: 2; left: 16px; top: 16px; bottom: 16px; width: 360px; display: flex; flex-direction: column;
  border-radius: var(--kw-r-l); background: rgb(var(--v-theme-surface-container-low)); box-shadow: 0 1px 2px rgb(0 0 0 / .3), 0 2px 6px 2px rgb(0 0 0 / .15);
}
.panel-head { padding: 12px 16px 4px; }
.modes { width: 100%; }
.modes .v-btn { flex: 1; }
.panel-body { flex: 1; min-height: 0; overflow: auto; padding: 4px 8px 16px; }
.hint { padding: 8px 8px 0; }
.foot { padding: 8px; }
.note { margin: 0 8px 8px; padding: 10px 12px; border-radius: var(--kw-r-s); background: rgb(var(--v-theme-surface-container-high)); }
.line-list :deep(.v-list-item-title) { white-space: normal; }
.swatch { flex: none; width: 28px; height: 6px; margin-right: 16px; border-radius: 3px; }
.badge {
  display: inline-grid; place-items: center; flex: none; min-width: 48px; height: 22px; margin-right: 12px; padding: 0 6px;
  border-radius: 11px; color: #fff; font-size: 12px; font-weight: 800; letter-spacing: .3px; vertical-align: 2px;
}
.detail-head { display: flex; align-items: flex-start; gap: 4px; padding: 4px 0 8px; }
.detail-head h2 { overflow-wrap: anywhere; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 8px 8px; }

.stops { list-style: none; margin: 4px 8px 0; padding: 0; }
.stops li { position: relative; display: flex; align-items: center; min-height: 34px; padding-left: 28px; }
.stops li::before { content: ''; position: absolute; left: 7px; top: 0; bottom: 0; width: 6px; background: var(--c); }
.stops li:first-child::before { top: 50%; }
.stops li:last-child::before { bottom: 50%; }
.stops li::after {
  content: ''; position: absolute; left: 5px; top: 50%; width: 10px; height: 10px; margin-top: -5px; border-radius: 50%;
  background: rgb(var(--v-theme-surface-container-low)); border: 2px solid rgb(var(--v-theme-on-surface));
}
.stops li.end::after { left: 3px; width: 14px; height: 14px; margin-top: -7px; border-width: 3px; }
.stops li.key a, .stops li.key span, .stops li.end a, .stops li.end span { font-weight: 800; }
.stops a { color: rgb(var(--v-theme-on-surface)); text-decoration: none; }
.stops a:hover { text-decoration: underline; color: rgb(var(--v-theme-primary)); }

.handle { display: grid; place-items: center; width: 100%; height: 24px; border: 0; background: none; cursor: pointer; flex: none; }
.handle::before { content: ''; width: 32px; height: 4px; border-radius: 2px; background: color-mix(in srgb, rgb(var(--v-theme-on-surface-variant)) 40%, transparent); }

@media (max-width: 839px) {
  .scheme-screen { height: calc(100dvh - 64px - 80px - env(safe-area-inset-bottom, 0px)); }
  .panel { left: 0; right: 0; top: auto; bottom: 0; width: auto; height: 148px; border-radius: var(--kw-r-xl) var(--kw-r-xl) 0 0; transition: height .3s cubic-bezier(.2, 0, 0, 1); }
  .panel.expanded { height: 72%; }
  .panel-head { padding-top: 0; }
  .panel.station:not(.expanded) { height: 212px; }
  .controls { bottom: 164px; transition: bottom .3s cubic-bezier(.2, 0, 0, 1); }
  .controls.raised { bottom: 228px; }
  .panel-head { padding-bottom: 0; }
  .panel-body { padding-top: 0; }
}
</style>
