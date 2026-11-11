import { describe, expect, it } from 'vitest'
import type { LiveTrain, TripStop } from '@/api/types'
import { departureAfterDwell, stopTime, tripPlan } from './tripPlan'

const at = (hm: string) => `2026-10-31T${hm}:00+01:00`
const stop = (seq: number, arr: string | null, dep: string | null, delay = 0, o: Partial<TripStop> = {}): TripStop => ({
  seq, station: { id: `s${seq}`, name: `Stacja ${seq}`, lat: 52, lon: 17 },
  arrival: arr && at(arr), departure: dep && at(dep),
  expectedArrival: arr && new Date(new Date(at(arr)).getTime() + delay * 60_000).toISOString(),
  expectedDeparture: dep && new Date(new Date(at(dep)).getTime() + delay * 60_000).toISOString(),
  arrivalDelay: arr ? delay : null, departureDelay: dep ? delay : null,
  platform: null, track: null, skipped: false, requestOnly: false, ...o,
})
const stops = [stop(1, null, '22:22'), stop(2, '22:40', '22:41'), stop(3, '22:51', '22:52'), stop(4, '23:00', null)]
const realtime = { source: 'rt' as const, delay: 0, cancelled: false }
const now = (hm: string) => new Date(at(hm)).getTime()
const position = (prev: number, dwelling = false) => ({ prev: { seq: prev, name: '' }, dwelling }) as LiveTrain

describe('plan kursu na mapie', () => {
  it('z godzin: przed odjazdem, w drodze, na stacji, po przyjeździe', () => {
    expect(tripPlan({ stops, position: null, realtime }, now('22:00'))).toMatchObject({ phase: 'before', next: 0, passed: 0 })
    expect(tripPlan({ stops, position: null, realtime }, now('22:30'))).toMatchObject({ phase: 'moving', prev: 0, next: 1, passed: 1 })
    expect(tripPlan({ stops, position: null, realtime }, now('22:40'))).toMatchObject({ phase: 'dwelling', prev: 1, next: 1, passed: 1 })
    expect(tripPlan({ stops, position: null, realtime }, now('23:10'))).toMatchObject({ phase: 'done', next: null, passed: 4 })
  })

  it('pozycja na żywo ma pierwszeństwo przed godzinami', () => {
    expect(tripPlan({ stops, position: position(3), realtime }, now('22:00'))).toMatchObject({ phase: 'moving', prev: 2, next: 3, passed: 3 })
    expect(tripPlan({ stops, position: position(2, true), realtime }, now('22:00'))).toMatchObject({ phase: 'dwelling', prev: 1, next: 1 })
    expect(tripPlan({ stops, position: position(4), realtime }, now('22:00')).phase).toBe('done')
  })

  it('następna stacja pomija przejazd bez postoju, odwołany kurs bez pozycji', () => {
    const skip = [stops[0], { ...stops[1], skipped: true }, stops[2], stops[3]]
    expect(tripPlan({ stops: skip, position: position(1), realtime }, 0).next).toBe(2)
    expect(tripPlan({ stops, position: null, realtime: { ...realtime, cancelled: true } }, now('22:30')).phase).toBe('unknown')
  })

  it('godziny: przyjazd (na pierwszej stacji odjazd), oczekiwana od 2 min opóźnienia, odjazd po dłuższym postoju', () => {
    expect(stopTime(stops[0], true)).toEqual({ plan: at('22:22'), expected: null, best: at('22:22') })
    const late = stop(3, '22:51', '22:52', 17)
    expect(stopTime(late, false)?.expected).toBe(late.expectedArrival)
    expect(stopTime(stop(3, '22:51', '22:52', 1), false)?.expected).toBeNull()
    expect(departureAfterDwell(stops[1])).toBeNull()
    expect(departureAfterDwell(stop(5, '23:40', '23:55'))?.plan).toBe(at('23:55'))
  })
})
