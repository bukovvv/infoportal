// Opcje wyszukiwarki połączeń: przesiadki (ile, minimalny czas) i przewoźnicy. Zapamiętywane w przeglądarce (kw_search_options, w Małopolsce osobno).
import { region } from './region'

export interface SearchOptions {
  /** 0 — tylko bezpośrednie */
  maxTransfers: 0 | 1 | 2
  /** minimalny czas na przesiadkę w minutach */
  minTransfer: number
  /** kody przewoźników: KW (KML), PR, IC */
  agencies: string[]
}

export const AGENCIES = [
  { code: region.agency, label: region.agencyName },
  { code: 'PR', label: 'POLREGIO' },
  { code: 'IC', label: 'PKP Intercity' },
] as const

export const MIN_TRANSFERS = [3, 5, 10, 15] as const

export const DEFAULT_OPTIONS: SearchOptions = { maxTransfers: 2, minTransfer: 3, agencies: AGENCIES.map((a) => a.code) }

const allAgencies = (o: SearchOptions) => AGENCIES.every((a) => o.agencies.includes(a.code))

/** Liczba opcji innych niż domyślne. */
export function changedCount(o: SearchOptions) {
  return Number(o.maxTransfers !== 2) + Number(o.minTransfer !== DEFAULT_OPTIONS.minTransfer) + Number(!allAgencies(o))
}

/** Napis na chipie: „Opcje”, „Bez przesiadek” (gdy to jedyna zmiana) albo „Opcje · 2”. */
export function optionsLabel(o: SearchOptions) {
  const n = changedCount(o)
  if (!n) return 'Opcje'
  if (n === 1 && o.maxTransfers === 0) return 'Bez przesiadek'
  return `Opcje · ${n}`
}

/** Poprawia wartości z zapisu albo adresu (nieznane — domyślne). */
export function sanitize(o: Partial<SearchOptions> | null | undefined): SearchOptions {
  const max = Number(o?.maxTransfers)
  const min = Number(o?.minTransfer)
  const agencies = Array.isArray(o?.agencies) ? AGENCIES.map((a) => a.code).filter((c) => o.agencies!.includes(c)) : []
  return {
    maxTransfers: max === 0 || max === 1 ? max : 2,
    minTransfer: (MIN_TRANSFERS as readonly number[]).includes(min) ? min : DEFAULT_OPTIONS.minTransfer,
    agencies: agencies.length ? agencies : [...DEFAULT_OPTIONS.agencies],
  }
}

type Query = Record<string, unknown>

/** Opcje z adresu (przes, minp, przew; dawne bezp=1) albo null, gdy adres ich nie podaje. */
export function optionsFromQuery(query: Query): SearchOptions | null {
  const has = ['przes', 'minp', 'przew', 'bezp'].some((k) => typeof query[k] === 'string')
  if (!has) return null
  return sanitize({
    maxTransfers: (query.bezp === '1' ? 0 : query.przes !== undefined ? Number(query.przes) : 2) as SearchOptions['maxTransfers'],
    minTransfer: query.minp !== undefined ? Number(query.minp) : undefined,
    agencies: typeof query.przew === 'string' ? query.przew.toUpperCase().split(',') : undefined,
  })
}

/** Parametry adresu dla opcji innych niż domyślne. */
export function optionsToQuery(o: SearchOptions): Record<string, string> {
  return {
    ...(o.maxTransfers !== 2 ? { przes: String(o.maxTransfers) } : {}),
    ...(o.minTransfer !== DEFAULT_OPTIONS.minTransfer ? { minp: String(o.minTransfer) } : {}),
    ...(!allAgencies(o) ? { przew: o.agencies.join(',') } : {}),
  }
}

/** Parametry zapytania /connections. */
export function optionsToApi(o: SearchOptions) {
  return {
    transfers: o.maxTransfers !== 2 ? o.maxTransfers : undefined,
    minTransfer: o.minTransfer !== DEFAULT_OPTIONS.minTransfer ? o.minTransfer : undefined,
    agencies: !allAgencies(o) ? o.agencies.join(',') : undefined,
  }
}
