import { describe, expect, it } from 'vitest'
import { addDays, dayChip, fullDate, short } from './util'

describe('v2/util', () => {
  it('liczy dni i podpisuje chipy dnia', () => {
    expect(addDays('2026-11-28', 1)).toBe('2026-11-29')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(dayChip('2026-11-28', '2026-11-28')).toBe('Dziś')
    expect(dayChip('2026-11-29', '2026-11-28')).toBe('Jutro')
    expect(dayChip('2026-11-30', '2026-11-28')).toBe('pon. 30.11')
    expect(fullDate('2026-11-28')).toBe('sobota, 28 listopada')
  })
  it('skraca nazwy stacji jak na tablicy', () => {
    expect(short('Poznań Główny')).toBe('Poznań Gł.')
    expect(short('Ostrów Wielkopolski')).toBe('Ostrów Wlkp.')
    expect(short('Gniezno')).toBe('Gniezno')
  })
})

describe('minutesBetween', async () => {
  const { minutesBetween } = await import('./util')
  it('liczy minuty jak na zegarze, bez sekund', () => {
    expect(minutesBetween('2026-11-28T18:07:30+01:00', '2026-11-28T18:21:00+01:00')).toBe(14)
    expect(minutesBetween('2026-11-28T23:58:00+01:00', '2026-11-29T00:03:00+01:00')).toBe(5)
  })
})
