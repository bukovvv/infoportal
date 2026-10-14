import { describe, expect, it } from 'vitest'
import type { Connection, Leg } from '@/api/types'
import { connectionIcs } from './ics'

const leg = (o: Partial<Leg>): Leg => ({
  key: 'T1@20261014', number: '77790/1', route: null, isBus: false, headsign: 'Leszno',
  from: { id: '28472', name: 'Swarzędz' }, to: { id: '1', name: 'Poznań Wschód' },
  departure: '2026-10-14T15:54:00+02:00', arrival: '2026-10-14T16:01:00+02:00',
  expectedDeparture: null, expectedArrival: null, departureDelay: null, arrivalDelay: null,
  platform: '2', track: '1', arrivalPlatform: '3', stopsBetween: 1, ...o,
})

const connection: Connection = {
  departure: '2026-10-14T15:54:00+02:00', arrival: '2026-10-14T17:25:00+02:00', durationMinutes: 91, transfers: 1, waits: [7],
  via: [{ id: '1', name: 'Poznań Wschód' }],
  legs: [leg({}), leg({ key: 'T2@20261014', number: '77610/1', from: { id: '1', name: 'Poznań Wschód' }, to: { id: '31302', name: 'Wągrowiec' }, departure: '2026-10-14T16:08:00+02:00', arrival: '2026-10-14T17:25:00+02:00', platform: '1' })],
}

describe('plik kalendarza', () => {
  const ics = connectionIcs(connection, 'https://example.test/?z=28472', new Date('2026-10-14T12:00:00Z'))
  const unfolded = ics.replace(/\r\n /g, '')

  it('ma wydarzenie z czasem UTC i przypomnieniem', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(unfolded).toContain('DTSTART:20261014T135400Z')
    expect(unfolded).toContain('DTEND:20261014T152500Z')
    expect(unfolded).toContain('TRIGGER:-PT15M')
    expect(unfolded).toContain('SUMMARY:Pociąg Swarzędz → Wągrowiec')
  })

  it('opisuje odcinki i przesiadkę, ze znakami specjalnymi w tekście', () => {
    expect(unfolded).toContain('LOCATION:Swarzędz\\, peron 2')
    expect(unfolded).toContain('pociąg KW 77790/1\\, peron 2\\nPrzesiadka w Poznań Wschód: 7 min')
  })

  it('zawija długie linie do 75 bajtów', () => {
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
  })
})
