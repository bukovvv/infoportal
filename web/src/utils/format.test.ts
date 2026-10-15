import { describe, expect, it } from 'vitest'
import { ago, delayLabel, duration, normalize, plural, relative, splitNumbers, warsawNow } from './format'

describe('format', () => {
  it('rozbija numery pociągów jak serwer', () => {
    expect(splitNumbers('77610/1')).toEqual(['77610', '77611'])
    expect(splitNumbers('17206/7')).toEqual(['17206', '17207'])
    expect(splitNumbers('77345')).toEqual(['77345'])
    expect(splitNumbers('')).toEqual([])
    expect(splitNumbers('77684/5 Rzepicha')).toEqual(['77684', '77685'])
    expect(splitNumbers('77375 Sokół')).toEqual(['77375'])
  })

  it('odmienia liczebniki po polsku', () => {
    expect(plural(1, 'kurs', 'kursy', 'kursów')).toBe('kurs')
    expect(plural(3, 'kurs', 'kursy', 'kursów')).toBe('kursy')
    expect(plural(5, 'kurs', 'kursy', 'kursów')).toBe('kursów')
    expect(plural(12, 'kurs', 'kursy', 'kursów')).toBe('kursów')
    expect(plural(22, 'kurs', 'kursy', 'kursów')).toBe('kursy')
  })

  it('formatuje czas trwania i odliczanie', () => {
    expect(duration(45)).toBe('45 min')
    expect(duration(120)).toBe('2 godz.')
    expect(duration(122)).toBe('2 godz. 2 min')
    expect(relative(0)).toBe('teraz')
    expect(relative(7.4)).toBe('za 7 min')
  })

  it('podaje czas, który upłynął', () => {
    const now = new Date('2026-10-04T12:00:00Z').getTime()
    expect(ago('2026-10-04T11:59:40Z', now)).toBe('przed chwilą')
    expect(ago('2026-10-04T11:55:00Z', now)).toBe('5 min temu')
    expect(ago('2026-10-04T09:00:00Z', now)).toBe('3 godz. temu')
    expect(ago('2026-10-03T10:00:00Z', now)).toBe('wczoraj')
    expect(ago('2026-10-02T11:00:00Z', now)).toBe('2 dni temu')
    expect(ago('2026-10-02T13:47:00Z', now)).toBe('2 dni temu')
    expect(ago('2026-09-30T12:00:00Z', now)).toBe('4 dni temu')
    expect(ago(null, now)).toBe('–')
  })

  it('podaje datę i godzinę w strefie Europe/Warsaw', () => {
    expect(warsawNow(new Date('2026-10-01T22:30:00Z'))).toEqual({ date: '2026-10-02', time: '00:30' })
    expect(warsawNow(new Date('2026-07-01T10:05:00Z'))).toEqual({ date: '2026-07-01', time: '12:05' })
  })

  it('normalizuje polskie znaki do wyszukiwania', () => {
    expect(normalize('Łódź Kaliska')).toBe('lodz kaliska')
    expect(normalize('  Środa Wlkp. ')).toBe('sroda wlkp.')
  })

  it('opisuje opóźnienie', () => {
    expect(delayLabel(null)).toBeNull()
    expect(delayLabel(0)).toBe('planowo')
    expect(delayLabel(6)).toBe('+6 min')
  })
})
