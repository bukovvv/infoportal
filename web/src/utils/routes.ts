// Obserwowane trasy (para stacji A–B, oba kierunki): pomocnicze funkcje bez stanu (testy w routes.test.ts).
import type { Connection } from '@/api/types'
import { AGENCIES, DEFAULT_OPTIONS, type SearchOptions } from './searchOptions'

export type RouteDir = 'ab' | 'ba'

/** Okienko powiadomień: dni tygodnia 1–7 (pn–nd) i godziny odjazdu GG:MM. */
export interface RouteWindow { days: number[]; start: string; end: string }

export const DAY_NAMES = ['pn', 'wt', 'śr', 'cz', 'pt', 'sb', 'nd'] as const

/** Domyślne okienka: rano tam, po południu z powrotem, w dni robocze. */
export const DEFAULT_WINDOWS: Record<RouteDir, RouteWindow> = {
  ab: { days: [1, 2, 3, 4, 5], start: '06:30', end: '08:00' },
  ba: { days: [1, 2, 3, 4, 5], start: '15:00', end: '17:00' },
}

/** Ta sama trasa niezależnie od kolejności stacji. */
export const routeId = (a: string, b: string) => [a, b].sort().join('~')

/** „pn–pt”, „codziennie”, „sb–nd”, „pn, śr, pt”. */
export function daysLabel(days: number[]) {
  const d = [...new Set(days)].filter((x) => x >= 1 && x <= 7).sort((x, y) => x - y)
  if (d.length === 7) return 'codziennie'
  if (d.length >= 3 && d[d.length - 1] - d[0] === d.length - 1) return `${DAY_NAMES[d[0] - 1]}–${DAY_NAMES[d[d.length - 1] - 1]}`
  return d.map((x) => DAY_NAMES[x - 1]).join(', ')
}

/** „pn–pt 6:30–8:00” */
export const windowLabel = (w: RouteWindow) => `${daysLabel(w.days)} ${w.start.replace(/^0/, '')}–${w.end.replace(/^0/, '')}`

/** Błąd okienka do pokazania pod formularzem albo null (zasady jak na serwerze: koniec po początku, najwyżej 6 h). */
export function windowError(w: RouteWindow) {
  if (!w.days.length) return 'Wybierz co najmniej jeden dzień.'
  const min = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  const span = min(w.end) - min(w.start)
  if (span <= 0) return 'Koniec musi być później niż początek.'
  if (span > 360) return 'Okienko może trwać najwyżej 6 godzin.'
  return null
}

/** Odjazd z opóźnieniem (gdy znane). */
export const expectedDeparture = (c: Connection) => c.legs[0].expectedDeparture ?? c.departure

/**
 * Najbliższe połączenia: zapytanie sięga kilkanaście minut wstecz, żeby opóźniony pociąg nie znikał
 * po planowej godzinie — zostają te, które (z opóźnieniem) jeszcze nie odjechały.
 */
export function upcoming(list: Connection[], now: number, count = 3) {
  return list
    .filter((c) => new Date(expectedDeparture(c)).getTime() >= now - 30_000)
    .sort((a, b) => expectedDeparture(a).localeCompare(expectedDeparture(b)))
    .slice(0, count)
}

const SHORT_AGENCY: Record<string, string> = { KW: 'KW', KML: 'KML', PR: 'POLREGIO', IC: 'PKP Intercity' }

/** Opcje inne niż domyślne w kilku słowach: „bez przesiadek · tylko KW, POLREGIO”; domyślne — pusty napis. */
export function optionsSummary(o: SearchOptions) {
  const parts: string[] = []
  if (o.maxTransfers === 0) parts.push('bez przesiadek')
  else if (o.maxTransfers === 1) parts.push('maks. 1 przesiadka')
  if (o.maxTransfers > 0 && o.minTransfer !== DEFAULT_OPTIONS.minTransfer) parts.push(`przesiadka min. ${o.minTransfer} min`)
  if (o.agencies.length < AGENCIES.length) parts.push(`tylko ${o.agencies.map((a) => SHORT_AGENCY[a] ?? a).join(', ')}`)
  return parts.join(' · ')
}
