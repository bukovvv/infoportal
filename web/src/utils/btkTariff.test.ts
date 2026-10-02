import { describe, expect, it } from 'vitest'
import { ALL_STATIONS, FARES, btkStation, commuteTicket, farePrice, formatPrice, railZoneOf, ztmOptions } from './btkTariff'

describe('taryfa Bus-Tramwaj-Kolej', () => {
  it('ceny ulgowe wynikają z ceny normalnej (49% i 51%)', () => {
    for (const row of FARES) {
      for (const [ztm, [normal, u49, u51]] of Object.entries(row.prices)) {
        const where = `${row.rail}${row.extra ? ` + ${row.extra}` : ''} / ZTM ${ztm}`
        expect(u49, where).toBe(Math.round(normal * 0.51))
        expect(u51, where).toBe(Math.round(normal * 0.49))
      }
    }
  })

  it('podaje cenę dla kombinacji stref', () => {
    expect(farePrice('C', 'A+C', 'normal')).toBe(37900)
    expect(farePrice('F', 'A+B', 'u51', 'gniezno')).toBe(26852)
    expect(farePrice('D', 'A', 'normal', 'czempin')).toBe(46100)
    expect(farePrice('D', 'A+C', 'normal')).toBeNull()
    expect(farePrice('A', 'A', 'normal')).toBeNull()
    expect(formatPrice(27600)).toMatch(/^276,00\s?zł$/)
  })

  it('oferuje tylko istniejące strefy ZTM', () => {
    expect(ztmOptions('B')).toEqual(['A', 'A+B', 'A+B+C'])
    expect(ztmOptions('C')).toEqual(['A', 'A+B', 'A+C', 'A+B+C'])
    expect(ztmOptions('G')).toEqual(['A', 'A+B'])
    expect(ztmOptions('A')).toEqual([])
  })

  it('rozpoznaje strefę stacji niezależnie od polskich znaków', () => {
    expect(railZoneOf('Swarzędz')).toBe('B')
    expect(railZoneOf('slupca')).toBe('G')
    expect(railZoneOf('Kiekrz')).toBe('A')
    expect(railZoneOf('Poznań Garbary')).toBe('A')
    expect(railZoneOf('Poznań Nowa Stacja')).toBe('A')
    expect(railZoneOf('Leszno')).toBeNull()
  })

  it('dopasowuje nazwy z rozkładu do taryfy (skróty, „koło”, aliasy)', () => {
    expect(btkStation('Luboń koło Poznania')).toEqual({ name: 'Luboń k/Poznania', zone: 'B' })
    expect(railZoneOf('Kostrzyn Wielkopolski')).toBe('C')
    expect(railZoneOf('Oborniki Wielkopolskie Miasto')).toBe('D')
    expect(railZoneOf('Środa Wielkopolska')).toBe('D')
    expect(railZoneOf('Strykowo Poznańskie')).toBe('C')
    expect(railZoneOf('Ptaszkowo')).toBe('D')
    expect(railZoneOf('Radlin Wielkopolski')).toBe('G')
    expect(btkStation('')).toBeNull()
  })

  it('wybiera bilet dojazdowy według najdalszej stacji', () => {
    expect(commuteTicket(['Poznań Główny', 'Gniezno'])).toEqual({ zone: 'F', station: 'Gniezno', price: 44100 })
    expect(commuteTicket(['Swarzędz', 'Kostrzyn Wielkopolski'])).toEqual({ zone: 'C', station: 'Kostrzyn Wlkp.', price: 34800 })
    expect(commuteTicket(['Poznań Główny', 'Poznań Garbary'])).toBeNull()
    expect(commuteTicket(['Poznań Główny', 'Leszno'])).toBeNull()
    expect(commuteTicket([])).toBeNull()
  })

  it('każda stacja jest tylko w jednej strefie', () => {
    const names = ALL_STATIONS.map((s) => s.name)
    expect(new Set(names).size).toBe(names.length)
  })
})
