// Mapa: kolory linii KW (z rozkładu wszystkie regionalne mają ten sam czerwony — bierzemy kolory ze schematu połączeń),
// ważność stacji i odcinki / stacje z komunikatami o utrudnieniach. W Małopolsce linie KML mają w rozkładzie własne kolory
// (SKA1, K5P…), a schematu nie ma — kształty i pastylki zostają w kolorach z rozkładu.
import type { Notice, Station } from '@/api/types'
import { LINES, NODES, PKM_LINES, type SchemeLine } from './scheme'
import { noticeLines } from './notices'
import { isDefaultRegion } from './region'

const ALL_LINES = [...LINES, ...PKM_LINES]

/**
 * Linia ze schematu dla kursu między dwiema stacjami: najpierw ta, która zaczyna się i kończy na nich,
 * potem ta, której kurs pokrywa największą część (Poznań – Ostrów to raczej Odolanów niż pospieszny do Łodzi).
 */
export function linesBetween(a: string | null | undefined, b: string | null | undefined, lines: SchemeLine[] = LINES): SchemeLine[] {
  if (!a || !b || a === b) return []
  const scored: [SchemeLine, number][] = []
  for (const l of lines) {
    const i = l.stations.indexOf(a)
    const j = l.stations.indexOf(b)
    if (i < 0 || j < 0) continue
    const ends = new Set([l.stations[0], l.stations[l.stations.length - 1]])
    scored.push([l, ends.has(a) && ends.has(b) ? 2 : Math.abs(i - j) / (l.stations.length - 1)])
  }
  return scored.sort((x, y) => y[1] - x[1]).map(([l]) => l)
}
export const lineBetween = (a: string | null | undefined, b: string | null | undefined, lines: SchemeLine[] = LINES) => linesBetween(a, b, lines)[0]

export const lineColor = (l: SchemeLine, dark: boolean) => (dark && l.dark ? l.dark : l.color)

/** PKM i linie innych przewoźników mają w rozkładzie własne kolory — zostają. */
const ownColor = (short: string | null | undefined) => !!short && !/^KW\b/.test(short)

type TrainLike = {
  agency?: string | null; isBus: boolean; route: { short: string; color: string | null } | null; origin: string | null; destination: string | null
  prev?: { name: string } | null; next?: { name: string } | null
}

/**
 * Kolor linii pociągu KW (kółko w pastylce): linia schematu po stacjach początkowej i końcowej, na której leżą też
 * stacja poprzednia i następna (kurs Września – Krotoszyn przez Poznań to nie linia Gniezno – Krotoszyn); brak dopasowania — kolor z rozkładu.
 */
export function trainLineColor(t: TrainLike, dark: boolean): string | null {
  if (t.isBus || (t.agency && t.agency !== 'KW') || ownColor(t.route?.short)) return t.route?.color ?? null
  const on = (l: SchemeLine, s?: { name: string } | null) => !s || l.stations.includes(s.name)
  const l = linesBetween(t.origin, t.destination).find((x) => on(x, t.prev) && on(x, t.next))
  return l ? lineColor(l, dark) : t.route?.color ?? null
}

type Pt = [number, number]
const km = ([lon1, lat1]: Pt, [lon2, lat2]: Pt) => Math.hypot((lon2 - lon1) * 68, (lat2 - lat1) * 111)

/** Odległość punktu od łamanej (km, przybliżenie płaskie — wystarcza w skali województwa). */
function distToLine(p: Pt, coords: Pt[]): number {
  let best = Infinity
  for (let i = 1; i < coords.length; i++) {
    const [ax, ay] = [(coords[i - 1][0] - p[0]) * 68, (coords[i - 1][1] - p[1]) * 111]
    const [bx, by] = [(coords[i][0] - p[0]) * 68, (coords[i][1] - p[1]) * 111]
    const [dx, dy] = [bx - ax, by - ay]
    const t = dx || dy ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy))) : 0
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy))
  }
  return best
}

/** Kształt biegnie linią: co najmniej 80% jej stacji między końcami kształtu leży przy nim. */
function follows(coords: Pt[], l: SchemeLine, a: string, b: string, byName: Map<string, Station>): boolean {
  const [i, j] = [l.stations.indexOf(a), l.stations.indexOf(b)].sort((x, y) => x - y)
  const between = l.stations.slice(i, j + 1).flatMap((name) => { const s = byName.get(name); return s ? [s] : [] })
  if (!between.length) return false
  return between.filter((s) => distToLine([s.lon, s.lat], coords) < 1).length >= 0.8 * between.length
}

function nearest(p: Pt, stations: Station[], maxKm = 1.5): Station | undefined {
  let best: Station | undefined
  let bestD = maxKm
  for (const s of stations) {
    const d = km(p, [s.lon, s.lat])
    if (d < bestD) {
      best = s
      bestD = d
    }
  }
  return best
}

/**
 * Sieć na mapie w kolorach linii: kształt KW dostaje kolor linii schematu po stacjach na jego końcach. Kursy PKM bywają
 * w rozkładzie przedłużone daleko poza linię (np. PKM2 Zbąszynek – Kutno) — kolor PKM tylko, gdy oba końce leżą na tej linii PKM.
 * Pole `rank`: dopasowane kształty (2) rysowane nad niedopasowanymi kursami przelotowymi (1), żeby nie zasłaniały kolorów linii.
 */
export function colorNetwork(fc: GeoJSON.FeatureCollection, stations: Station[], dark: boolean): GeoJSON.FeatureCollection {
  const kw = stations.filter((s) => s.kw !== false)
  const byName = new Map(kw.map((s) => [s.name, s]))
  return {
    type: 'FeatureCollection',
    features: fc.features.map((f) => {
      const p = { ...(f.properties ?? {}) } as Record<string, unknown>
      p.rank = 0
      if (!isDefaultRegion) {
        // POLREGIO w Małopolsce jeździ na liniach systemu z numerami K2, K3, K7… — na mapie jak linie KML, nie jak cienki partner
        if (p.partner && /^K\d/.test(String(p.route ?? ''))) p.partner = false
        p.rank = p.partner || p.bus ? 0 : 2
      } else if (!p.partner && !p.bus && f.geometry.type === 'LineString') {
        const c = f.geometry.coordinates as Pt[]
        const [a, b] = [nearest(c[0], kw)?.name, nearest(c[c.length - 1], kw)?.name]
        const pkm = PKM_LINES.find((l) => l.badge === p.route)
        if (pkm && a && b && pkm.stations.includes(a) && pkm.stations.includes(b) && follows(c, pkm, a, b, byName)) {
          p.rank = 2
        } else {
          const l = a && b ? linesBetween(a, b).find((x) => follows(c, x, a, b, byName)) : undefined
          if (l) p.color = lineColor(l, dark)
          p.rank = l ? 2 : 1
        }
      }
      return { ...f, properties: p }
    }),
  }
}

const NODE_NAMES = new Set(Object.values(NODES).flatMap((n) => (n.name ? [n.name] : [])))
const MAJOR_NAMES = new Set(Object.values(NODES).flatMap((n) => (n.name && n.major ? [n.name] : [])))

/** Ważność stacji na mapie: 3 — główny węzeł (Poznań Gł.), 2 — węzeł ze schematu, 1 — stacja podpisana na schemacie albo ruchliwa, 0 — przystanek. */
export function stationRank(s: Pick<Station, 'name' | 'daily'>): number {
  if (s.daily >= 400) return 3
  // bez schematu (Małopolska): węzły według liczby kursów (Tarnów, Trzebinia, Bochnia, Kraków Płaszów…)
  if (!isDefaultRegion) return s.daily >= 110 ? 2 : s.daily >= 60 ? 1 : 0
  if (MAJOR_NAMES.has(s.name)) return 2
  if (NODE_NAMES.has(s.name) || s.daily >= 80) return 1
  return 0
}

export interface AlertMark {
  notice: Notice
  /** odcinki linii (współrzędne stacji po kolei) */
  segments: Pt[][]
  /** stacje bez odcinka */
  points: Pt[]
  /** miejsce znaczka ⚠ */
  at: Pt
}

/**
 * Komunikaty o utrudnieniach na mapie: wybrana linia — cała, wybrane stacje jednej linii — odcinek od pierwszej do ostatniej
 * (np. komunikat o stacjach Poznań Wsch. – Wągrowiec), pozostałe — pojedyncze stacje. Komunikat tylko o pociągach nie ma miejsca na mapie.
 */
export function alertMarks(notices: Notice[], stations: Station[]): AlertMark[] {
  const byName = new Map(stations.filter((s) => s.kw !== false).map((s) => [s.name, s]))
  const byId = new Map(stations.map((s) => [s.id, s]))
  const pt = (s: Station): Pt => [s.lon, s.lat]
  const marks: AlertMark[] = []
  for (const n of notices) {
    if (n.severity === 'info') continue
    const segments: Pt[][] = []
    for (const l of noticeLines(n)) {
      const coords = l.stations.flatMap((name) => { const s = byName.get(name); return s ? [pt(s)] : [] })
      if (coords.length >= 2) segments.push(coords)
    }
    const chosen = new Set(n.stations.flatMap((id) => { const s = byId.get(id); return s ? [s.name] : [] }))
    const covered = new Set<string>()
    const pairs = new Set<string>()
    for (const l of ALL_LINES) {
      // dwie wybrane stacje jednej linii (np. „Poznań Wschód – Wągrowiec”) = odcinek między nimi, ze stacjami po drodze
      const at = l.stations.flatMap((name, i) => (chosen.has(name) ? [i] : []))
      if (at.length < 2) continue
      const run = l.stations.slice(at[0], at[at.length - 1] + 1)
      at.forEach((i) => covered.add(l.stations[i]))
      // ten sam odcinek na dwóch liniach (np. PKM1 i Poznań – Rawicz) — raz
      const key = [run[0], run[run.length - 1]].sort().join('|')
      if (pairs.has(key)) continue
      pairs.add(key)
      const coords = run.flatMap((name) => { const s = byName.get(name); return s ? [pt(s)] : [] })
      if (coords.length >= 2) segments.push(coords)
    }
    const points = [...chosen].filter((name) => !covered.has(name)).flatMap((name) => { const s = byName.get(name) ?? stations.find((x) => x.name === name); return s ? [pt(s)] : [] })
    if (!segments.length && !points.length) continue
    const longest = [...segments].sort((a, b) => b.length - a.length)[0]
    const at = longest ? longest[Math.floor((longest.length - 1) / 2)] : points[0]
    marks.push({ notice: n, segments, points, at })
  }
  return marks
}
