import { describe, expect, it } from 'vitest'
import type { Connection } from '@/api/types'
import { daysLabel, optionsSummary, routeId, upcoming, windowError, windowLabel } from './routes'
import { DEFAULT_OPTIONS } from './searchOptions'

const conn = (departure: string, expected: string | null = null) =>
  ({ departure, arrival: departure, legs: [{ expectedDeparture: expected }] }) as unknown as Connection

describe('routes', () => {
  it('ta sama trasa w obu kierunkach', () => {
    expect(routeId('A', 'B')).toBe(routeId('B', 'A'))
  })

  it('opisuje dni i okienka', () => {
    expect(daysLabel([1, 2, 3, 4, 5])).toBe('pn–pt')
    expect(daysLabel([7, 1, 2, 3, 4, 5, 6])).toBe('codziennie')
    expect(daysLabel([6, 7])).toBe('sb, nd')
    expect(daysLabel([1, 3, 5])).toBe('pn, śr, pt')
    expect(windowLabel({ days: [1, 2, 3, 4, 5], start: '06:30', end: '08:00' })).toBe('pn–pt 6:30–8:00')
  })

  it('sprawdza okienko jak serwer', () => {
    expect(windowError({ days: [1], start: '06:30', end: '08:00' })).toBeNull()
    expect(windowError({ days: [], start: '06:30', end: '08:00' })).toMatch(/dzień/)
    expect(windowError({ days: [1], start: '08:00', end: '08:00' })).toMatch(/później/)
    expect(windowError({ days: [1], start: '06:00', end: '12:30' })).toMatch(/6 godzin/)
  })

  it('najbliższe połączenia: opóźniony zostaje do faktycznego odjazdu', () => {
    const now = new Date('2026-10-14T07:10:00+02:00').getTime()
    const list = [
      conn('2026-10-14T07:00:00+02:00'),
      conn('2026-10-14T07:05:00+02:00', '2026-10-14T07:15:00+02:00'),
      conn('2026-10-14T07:30:00+02:00'),
      conn('2026-10-14T07:45:00+02:00'),
      conn('2026-10-14T08:00:00+02:00'),
    ]
    expect(upcoming(list, now).map((c) => c.departure.slice(11, 16))).toEqual(['07:05', '07:30', '07:45'])
  })

  it('opisuje opcje trasy', () => {
    expect(optionsSummary(DEFAULT_OPTIONS)).toBe('')
    expect(optionsSummary({ maxTransfers: 0, minTransfer: 10, agencies: ['KW', 'PR'] })).toBe('bez przesiadek · tylko KW, POLREGIO')
    expect(optionsSummary({ maxTransfers: 1, minTransfer: 10, agencies: ['KW', 'PR', 'IC'] })).toBe('maks. 1 przesiadka · przesiadka min. 10 min')
  })
})
