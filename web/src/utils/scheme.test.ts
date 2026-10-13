import { describe, expect, it } from 'vitest'
import { GAP, LEGEND, LINES, NODES, PKM_LINES, REGION, edgeOffsets, linePoints, linesAt, roundedPath, stationMarkers } from './scheme'

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

  it('obrys Wielkopolski jest zamkniętą ścieżką', () => {
    expect(REGION).toMatch(/^M[-\d. L]+Z$/)
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
    expect(LINES.find((l) => l.id === 'wolsztyn')!.stations.at(-1)).toBe('Powodowo')
  })

  it('linie mają stały tor na prostych ciągach odcinków — bez uskoków przy rozejściu się wiązki', () => {
    const offsets = edgeOffsets(LINES)
    expect(offsets.get('jarocin|sroda')!.size).toBe(5)
    // linia biegnąca najdalej leży na osi i nie zmienia toru
    for (const key of ['poz|wsch', 'b_gol1|wsch', 'b_gol1|b_mog', 'b_mog|wrzesnia']) expect(offsets.get(key)!.get('kutno'), key).toBe(0)
    expect(offsets.get('poz|wsch')!.get('mogilno')).toBe(offsets.get('b_gol1|b_mog')!.get('mogilno'))
    expect(offsets.get('lubon|poz')!.get('rawicz')).toBe(0)
    expect(offsets.get('jarocin|sroda')!.get('kalisz')).toBe(offsets.get('jarocin|pleszew')!.get('kalisz'))
    for (const l of LINES) {
      const pts = linePoints(l, offsets)
      // brak skoków w poprzek na odcinkach współliniowych: kolejne punkty nie powtarzają się w jednym miejscu
      expect(pts.every((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) > 1), l.id).toBe(true)
    }
    for (const line of ALL) {
      const d = roundedPath(linePoints(line, edgeOffsets(line.badge ? PKM_LINES : LINES)))
      expect(d, line.id).not.toMatch(/NaN|Infinity/)
    }
  })

  it('znaczniki stacji i linie przez stację', () => {
    const markers = stationMarkers(LINES, edgeOffsets(LINES))
    const wsch = markers.find((m) => m.id === 'wsch')!
    expect(wsch.width).toBe(3)
    expect(wsch.span).toBe(2 * GAP)
    expect(markers.find((m) => m.id === 'leka')!.terminal).toBe(true)
    expect(markers.find((m) => m.id === 'b_kob')).toBeUndefined()
    expect(linesAt('Września', LINES).map((l) => l.id).sort()).toEqual(['gniezno-krotoszyn', 'kutno'])
  })
})
