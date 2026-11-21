import { describe, expect, it } from 'vitest'
import type { Notice } from '@/api/types'
import { aboutConnection, aboutStation, aboutTrip, bodyBlocks, noticeTrainInput, parseNoticeTrain, plainBody, scopeText } from './notices'

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

  it('połączenie: odcinki KW; POLREGIO i PKP Intercity tylko z numerem', () => {
    const leg = (agency: string, number: string) => ({ agency, number, from: { id: 'p', name: 'Poznań Główny' }, to: { id: 'k', name: 'Konin' }, stops: [{ id: 'w', name: 'Września' }] })
    const c = (legs: ReturnType<typeof leg>[]) => ({ legs } as unknown as Parameters<typeof aboutConnection>[1])
    expect(aboutConnection(notice({ stations: ['w'] }), c([leg('KW', '77600')]))).toBe(true)
    expect(aboutConnection(notice({ trains: ['77601'] }), c([leg('KW', '77600/1')]))).toBe(true)
    expect(aboutConnection(notice({ stations: ['w'] }), c([leg('IC', '1710')]))).toBe(false)
    // pociągi partnerów — tylko z numerem i przewoźnikiem
    expect(aboutConnection(notice({ trains: ['IC 1710'] }), c([leg('IC', '1710')]))).toBe(true)
    expect(aboutConnection(notice({ trains: ['1710'] }), c([leg('IC', '1710')]))).toBe(false)
    expect(aboutConnection(notice({ trains: ['PR 77600'] }), c([leg('KW', '77600')]))).toBe(false)
  })

  it('pociągi z przewoźnikiem w panelu', () => {
    expect(noticeTrainInput('85724')).toBe('85724')
    expect(noticeTrainInput(' pr85724 ')).toBe('PR 85724')
    expect(noticeTrainInput('IC 1804')).toBe('IC 1804')
    expect(noticeTrainInput('KW 77600')).toBe('77600')
    expect(noticeTrainInput('x1')).toBeNull()
    expect(parseNoticeTrain('PR 85724')).toEqual({ agency: 'PR', number: '85724' })
    expect(parseNoticeTrain('77600')).toEqual({ agency: 'KW', number: '77600' })
  })

  it('opis zakresu', () => {
    expect(scopeText(['kutno', 'pkm2'], ['Konin'])).toBe('Poznań – Kutno, PKM2 Nowy Tomyśl – Poznań Gł. – Września, Konin')
    expect(scopeText([], [])).toBe('')
  })
})
