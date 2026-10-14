import { describe, expect, it } from 'vitest'
import { KURS90, stationByKurs90 } from './kurs90'

describe('kody KURS\'90', () => {
  it('znajduje stację po kodzie', () => {
    expect(stationByKurs90('159')).toBe('30601') // Poznań Główny
    expect(stationByKurs90(' 100 ')).toBe('42606') // Leszno
    expect(stationByKurs90('999999')).toBeUndefined()
  })

  it('każdy kod wskazuje jedną stację', () => {
    const codes = Object.values(KURS90)
    expect(new Set(codes).size).toBe(codes.length)
  })
})
