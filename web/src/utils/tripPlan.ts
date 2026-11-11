// Mapa: plan kursu w panelu pociągu — gdzie jest pociąg, które stacje są za nim, co dalej i o której.
import type { Trip, TripStop } from '@/api/types'

export interface TripPlan {
  /** before — jeszcze nie odjechał, moving — między stacjami, dwelling — stoi na stacji, done — dojechał, unknown — odwołany / bez danych */
  phase: 'before' | 'moving' | 'dwelling' | 'done' | 'unknown'
  /** ostatnia stacja za pociągiem (w drodze) albo ta, na której stoi */
  prev: number | null
  /** najbliższa stacja z postojem przed pociągiem (na stacji — ta sama, przed odjazdem — pierwsza) */
  next: number | null
  /** ile stacji jest już za pociągiem (stacja, na której stoi, się nie liczy) */
  passed: number
}

const ms = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : NaN)
const arrivalAt = (s: TripStop) => ms(s.expectedArrival ?? s.arrival ?? s.expectedDeparture ?? s.departure)
const departureAt = (s: TripStop) => ms(s.expectedDeparture ?? s.departure ?? s.expectedArrival ?? s.arrival)

/** Pierwsza stacja z postojem od `from` (przejazd bez zatrzymania pomijamy). */
function stopFrom(stops: TripStop[], from: number) {
  for (let i = from; i < stops.length; i++) if (!stops[i].skipped) return i
  return null
}

/** Gdzie jest pociąg: z pozycji na żywo, a bez niej — z godzin oczekiwanych (jak oś kursu na stronie pociągu). */
export function tripPlan(trip: Pick<Trip, 'stops' | 'position' | 'realtime'>, now: number): TripPlan {
  const stops = trip.stops
  const last = stops.length - 1
  const pos = trip.position
  let at: { prev: number; moving: boolean } | null = null
  if (pos?.prev) {
    const prev = stops.findIndex((s) => s.seq === pos.prev!.seq)
    if (prev >= 0) at = { prev, moving: !pos.dwelling && prev < last }
  }
  if (!at) {
    if (trip.realtime.cancelled || !stops.length) return { phase: 'unknown', prev: null, next: null, passed: 0 }
    if (now < departureAt(stops[0]) - 60_000) return { phase: 'before', prev: null, next: 0, passed: 0 }
    if (now > arrivalAt(stops[last]) + 60_000) return { phase: 'done', prev: last, next: null, passed: stops.length }
    for (let i = 0; i <= last && !at; i++) {
      if (now <= departureAt(stops[i]) || i === last) at = { prev: i, moving: false }
      else if (now < arrivalAt(stops[i + 1])) at = { prev: i, moving: true }
    }
  }
  const { prev, moving } = at!
  if (!moving && prev === last) return { phase: 'done', prev, next: null, passed: stops.length }
  return moving
    ? { phase: 'moving', prev, next: stopFrom(stops, prev + 1), passed: prev + 1 }
    : { phase: 'dwelling', prev, next: prev, passed: prev }
}

export interface StopTime {
  /** godzina z rozkładu */
  plan: string
  /** oczekiwana, gdy różni się od rozkładu o 2 min i więcej (jak w wyszukiwarce) */
  expected: string | null
  /** ta, której pasażer może się spodziewać */
  best: string
}

/** Przyjazd na stację (pierwsza stacja — odjazd). */
export function stopTime(s: TripStop, first: boolean): StopTime | null {
  const plan = first ? s.departure ?? s.arrival : s.arrival ?? s.departure
  if (!plan) return null
  const delay = first ? s.departureDelay : s.arrivalDelay
  const exp = first ? s.expectedDeparture : s.expectedArrival
  const expected = delay !== null && delay >= 2 && exp ? exp : null
  return { plan, expected, best: expected ?? plan }
}

/** Odjazd po dłuższym postoju (od 2 min) — pokazywany pod przyjazdem. */
export function departureAfterDwell(s: TripStop): StopTime | null {
  if (!s.arrival || !s.departure) return null
  if (new Date(s.departure).getTime() - new Date(s.arrival).getTime() < 120_000) return null
  const expected = s.departureDelay !== null && s.departureDelay >= 2 && s.expectedDeparture ? s.expectedDeparture : null
  return { plan: s.departure, expected, best: expected ?? s.departure }
}
