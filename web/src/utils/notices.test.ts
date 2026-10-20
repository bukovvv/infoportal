import { describe, expect, it } from 'vitest'
import type { Notice } from '@/api/types'
import { aboutStation, aboutTrip, bodyBlocks, detectStations, detectTrains, plainBody, scopeText } from './notices'

const notice = (over: Partial<Notice> = {}): Notice => ({
  id: 1, title: 'T', body: 'B', line: 'Cała sieć KW', severity: 'info', trains: [], stations: [], lines: [],
  startsAt: null, endsAt: null, active: true, createdAt: '', updatedAt: '', ...over,
})

describe('treść komunikatu', () => {
  it('dzieli na akapity i listy', () => {
    const body = 'W dniach 20–23 października zmiany.\nDruga linia wstępu.\n\n- KW 77600 wcześniej o 3 min\n- KW 77601 później o 5 min\n  (od Strzałkowa)\n\nDziękujemy.'
    expect(bodyBlocks(body)).toEqual([
      { kind: 'p', text: 'W dniach 20–23 października zmiany.\nDruga linia wstępu.' },
      { kind: 'ul', items: ['KW 77600 wcześniej o 3 min', 'KW 77601 później o 5 min (od Strzałkowa)'] },
      { kind: 'p', text: 'Dziękujemy.' },
    ])
  })

  it('lista zaraz po akapicie bez pustej linii', () => {
    expect(bodyBlocks('Zmiany:\n• 77600\n• 77602')).toEqual([{ kind: 'p', text: 'Zmiany:' }, { kind: 'ul', items: ['77600', '77602'] }])
    expect(plainBody('Zmiany:\n- 77600')).toBe('Zmiany:\n77600')
  })
})

describe('wykrywanie w treści', () => {
  it('numery pociągów bez dat, godzin i lat', () => {
    expect(detectTrains('W dniach 20.10.2026–23.10.2026 pociąg 77600 (Konin 05:12) i 3410 oraz KW 77600, rok 2026, 77610/1')).toEqual(['77600', '3410', '77610', '77611'])
  })

  it('stacje ze skrótami, dłuższa nazwa wygrywa', () => {
    const stations = [{ id: '1', name: 'Konin' }, { id: '2', name: 'Konin Zachód' }, { id: '3', name: 'Poznań Główny' }, { id: '4', name: 'Kostrzyn Wielkopolski' }, { id: '5', name: 'Września' }]
    expect(detectStations('relacji Konin Zachód – Poznań Gł., przez Kostrzyn Wlkp.', stations).map((s) => s.id)).toEqual(['2', '3', '4'])
    expect(detectStations('Konin – Września', stations).map((s) => s.id).sort()).toEqual(['1', '5'])
  })
})

describe('do czego pasuje komunikat', () => {
  const konin = { id: 'k', name: 'Konin' }
  it('stacja wprost albo przez linię', () => {
    expect(aboutStation(notice({ stations: ['k'] }), konin)).toBe(true)
    expect(aboutStation(notice({ lines: ['kutno'] }), konin)).toBe(true)
    expect(aboutStation(notice({ lines: ['pila'] }), konin)).toBe(false)
  })

  it('kurs: numer, postój na stacji albo przejazd linią', () => {
    const stops = [{ id: 'p', name: 'Poznań Główny' }, { id: 'w', name: 'Września' }]
    expect(aboutTrip(notice({ trains: ['77600'] }), ['77600'], stops)).toBe(true)
    expect(aboutTrip(notice({ stations: ['w'] }), ['1'], stops)).toBe(true)
    expect(aboutTrip(notice({ lines: ['kutno'] }), ['1'], stops)).toBe(true)
    // linia Gniezno – Krotoszyn ma tylko Wrześnię wspólną z tym kursem
    expect(aboutTrip(notice({ lines: ['gniezno-krotoszyn'] }), ['1'], stops)).toBe(false)
  })

  it('opis zakresu', () => {
    expect(scopeText(['kutno', 'pkm2'], ['Konin'])).toBe('Poznań – Kutno, PKM2 Nowy Tomyśl – Poznań Gł. – Września, Konin')
    expect(scopeText([], [])).toBe('')
  })
})
