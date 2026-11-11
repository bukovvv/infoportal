import { describe, expect, it } from 'vitest'
import type { Notice, Station } from '@/api/types'
import { alertMarks, colorNetwork, lineBetween, stationRank, trainLineColor } from './mapLines'

const st = (name: string, lon: number, lat: number, daily = 10): Station => ({ id: name, name, lon, lat, daily, lines: [], kw: true })
const notice = (o: Partial<Notice>): Notice => ({
  id: 1, title: 'T', body: '', line: '', severity: 'warning', trains: [], stations: [], lines: [], startsAt: null, endsAt: null, active: true, createdAt: '', updatedAt: '', ...o,
})

describe('kolory linii na mapie', () => {
  it('linia po stacjach na końcach', () => {
    expect(lineBetween('Poznań Główny', 'Wolsztyn')?.id).toBe('wolsztyn')
    expect(lineBetween('Leszno', 'Poznań Główny')?.id).toBe('rawicz')
    // początek i koniec linii mają pierwszeństwo (pospieszny do Łodzi)
    expect(lineBetween('Poznań Główny', 'Łódź Kaliska')?.id).toBe('lodz')
    // Poznań – Ostrów: linia, której kurs pokrywa największą część — nie pospieszna do Łodzi
    expect(lineBetween('Poznań Główny', 'Ostrów Wielkopolski')?.id).not.toBe('lodz')
    expect(lineBetween('Poznań Główny', 'Poznań Główny')).toBeUndefined()
  })

  it('pociąg: PKM i przewoźnicy z kolorem z rozkładu, regionalny KW z kolorem linii', () => {
    const base = { agency: 'KW', isBus: false, origin: 'Poznań Główny', destination: 'Wolsztyn' }
    expect(trainLineColor({ ...base, route: { short: 'KW', color: '#E6000A' } }, false)).toBe('#0B5A86')
    expect(trainLineColor({ ...base, route: { short: 'PKM3', color: '#3F9236' } }, false)).toBe('#3F9236')
    expect(trainLineColor({ ...base, agency: 'PR', route: { short: 'REG', color: '#E50000' } }, false)).toBe('#E50000')
    expect(trainLineColor({ ...base, destination: 'Gdzieś', route: { short: 'KW', color: '#E6000A' } }, false)).toBe('#E6000A')
    // Września – Krotoszyn przez Poznań (następna stacja nie leży na linii Gniezno – Krotoszyn) — kolor z rozkładu
    expect(trainLineColor({ ...base, origin: 'Września', destination: 'Krotoszyn', next: { name: 'Poznań Główny' }, route: { short: 'KW', color: '#E6000A' } }, false)).toBe('#E6000A')
    expect(trainLineColor({ ...base, origin: 'Września', destination: 'Krotoszyn', next: { name: 'Miłosław' }, route: { short: 'KW', color: '#E6000A' } }, false)).toBe('#9BCB6A')
    // Leszno – Ostrów: grafit, w ciemnym motywie jasny
    expect(trainLineColor({ ...base, origin: 'Leszno', destination: 'Ostrów Wielkopolski', route: { short: 'KW', color: '#E6000A' } }, true)).toBe('#E6E6E6')
  })

  it('sieć: kolor po stacjach na końcach kształtu, kolejność rysowania', () => {
    const stations = [st('Poznań Główny', 16.91, 52.40), st('Wolsztyn', 16.12, 52.12), st('Grodzisk Wielkopolski', 16.36, 52.23), st('Gdzieś', 15.5, 52.9)]
    const line = (route: string, color: string, to: [number, number], partner = false): GeoJSON.Feature => ({
      type: 'Feature', properties: { route, color, bus: false, partner }, geometry: { type: 'LineString', coordinates: [[16.911, 52.401], [16.5, 52.3], to] },
    })
    const out = colorNetwork({
      type: 'FeatureCollection',
      features: [
        line('KW', '#E6000A', [16.121, 52.119]), // Poznań – Wolsztyn
        line('PKM3', '#3F9236', [16.361, 52.231]), // na linii PKM3 — kolor z rozkładu
        line('PKM3', '#3F9236', [16.121, 52.119]), // PKM3 przedłużona do Wolsztyna — kolor linii
        line('KW', '#E6000A', [15.5, 52.9]), // kurs przelotowy bez linii — pod spodem
        line('REG', '#E50000', [16.121, 52.119], true),
      ],
    }, stations, false).features.map((f) => f.properties)
    expect(out.map((p) => p?.color)).toEqual(['#0B5A86', '#3F9236', '#0B5A86', '#E6000A', '#E50000'])
    expect(out.map((p) => p?.rank)).toEqual([2, 2, 2, 1, 0])
  })

  it('ważność stacji', () => {
    expect(stationRank({ name: 'Poznań Główny', daily: 586 })).toBe(3)
    expect(stationRank({ name: 'Wolsztyn', daily: 30 })).toBe(2)
    expect(stationRank({ name: 'Szamotuły', daily: 84 })).toBe(1)
    expect(stationRank({ name: 'Kiekrz', daily: 40 })).toBe(0)
  })
})

describe('utrudnienia na mapie', () => {
  const stations = ['Poznań Wschód', 'Poznań Karolin', 'Czerwonak', 'Owińska', 'Kórnik'].map((n, i) => st(n, 17 + i * 0.01, 52.4 + i * 0.01))

  it('stacje obok siebie na linii — odcinek, pozostałe — punkty, informacje pomijane', () => {
    const [m] = alertMarks([notice({ stations: ['Poznań Karolin', 'Czerwonak', 'Owińska', 'Kórnik'] })], stations)
    expect(m.segments).toHaveLength(1)
    expect(m.segments[0]).toHaveLength(3)
    expect(m.points).toHaveLength(1)
    expect(alertMarks([notice({ severity: 'info', stations: ['Kórnik'] })], stations)).toEqual([])
  })

  it('komunikat tylko o pociągach nie ma miejsca na mapie', () => {
    expect(alertMarks([notice({ trains: ['77600'] })], stations)).toEqual([])
  })

  it('cała linia z komunikatu', () => {
    const [m] = alertMarks([notice({ lines: ['golancz'] })], stations)
    expect(m.segments[0].length).toBeGreaterThanOrEqual(3)
  })
})
