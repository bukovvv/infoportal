import { describe, expect, it } from 'vitest'
import { GAP, LEGEND, LINES, NODES, PKM_LINES, edgeLoads, linePoints, linesAt, roundedPath, stationMarkers } from './scheme'

const ALL = [...LINES, ...PKM_LINES]

describe('schemat połączeń', () => {
  it('przebiegi składają się z istniejących węzłów, a stacje na schemacie są w kolejności z listy stacji', () => {
    for (const line of ALL) {
      expect(line.path.every((id) => NODES[id]), line.id).toBe(true)
      const onScheme = line.path.map((id) => NODES[id].name).filter((n): n is string => !!n)
      const positions = onScheme.map((n) => line.stations.indexOf(n))
      expect(positions.every((p) => p >= 0), `${line.id}: ${onScheme.join(', ')}`).toBe(true)
      expect([...positions].sort((a, b) => a - b), line.id).toEqual(positions)
      expect(line.stations[0], line.id).toBe(onScheme[0])
      expect(line.stations.at(-1), line.id).toBe(onScheme.at(-1))
      expect(new Set(line.stations).size, line.id).toBe(line.stations.length)
    }
  })

  it('legenda zawiera każdą linię dokładnie raz', () => {
    expect(new Set(LEGEND.map((l) => l.id))).toEqual(new Set(LINES.map((l) => l.id)))
    expect(LEGEND).toHaveLength(LINES.length)
    expect(new Set(ALL.map((l) => l.id)).size).toBe(ALL.length)
  })

  it('odzwierciedla obecną sieć KW', () => {
    const names = new Set(LINES.flatMap((l) => l.stations))
    expect(names.has('Milicz')).toBe(false)
    expect(names.has('Wyrzysk Osiek')).toBe(false)
    expect(LINES.find((l) => l.id === 'leka')!.stations.at(-1)).toBe('Łęka Opatowska')
    expect(LINES.find((l) => l.id === 'pila-krzyz')!.stations).toEqual(expect.arrayContaining(['Krzyż', 'Piła Główna']))
    expect(LINES.find((l) => l.id === 'glogow')!.stations).toEqual(expect.arrayContaining(['Leszno', 'Głogów']))
  })

  it('rozsuwa linie na wspólnych odcinkach symetrycznie wokół osi', () => {
    const loads = edgeLoads(LINES)
    expect(loads.get('jarocin|sroda')).toHaveLength(5)
    const [a, b] = ['poz', 'sroda'].map((id) => NODES[id])
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    const offsets = loads.get('poz|sroda')!.map((id) => {
      const p = linePoints(LINES.find((l) => l.id === id)!, loads)[0]
      return ((p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x)) / len
    })
    expect(offsets.map((o) => Math.round(Math.abs(o)))).toEqual([2 * GAP, GAP, 0, GAP, 2 * GAP])
    for (const line of ALL) {
      const d = roundedPath(linePoints(line, edgeLoads(line.badge ? PKM_LINES : LINES)))
      expect(d, line.id).not.toMatch(/NaN|Infinity/)
    }
  })

  it('znaczniki stacji i linie przez stację', () => {
    const markers = stationMarkers(LINES, edgeLoads(LINES))
    expect(markers.find((m) => m.id === 'wsch')!.width).toBe(3)
    expect(markers.find((m) => m.id === 'leka')!.terminal).toBe(true)
    expect(markers.find((m) => m.id === 'b_kob')).toBeUndefined()
    expect(linesAt('Września', LINES).map((l) => l.id).sort()).toEqual(['gniezno-krotoszyn', 'kutno'])
  })
})
