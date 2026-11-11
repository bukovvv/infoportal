// Przewoźnicy: przewoźnik regionu (KW, KML) oraz partnerzy POLREGIO i PKP Intercity (obcięci do województwa).
import { region } from './region'

const NAMES: Record<string, string> = { KW: 'Koleje Wielkopolskie', KML: 'Koleje Małopolskie', PR: 'POLREGIO', IC: 'PKP Intercity' }

/** Kurs innego przewoźnika niż przewoźnik regionu (brak pola w starszych zapisanych podróżach = przewoźnik regionu). */
export const isPartner = (agency?: string | null) => !!agency && agency !== region.agency

/** PKP Intercity — bilety przewoźnika regionu i POLREGIO nie obowiązują. */
export const isIntercity = (agency?: string | null) => agency === 'IC'

/** Skrót przed numerem pociągu: „KW 77600”, „KML 30121”, „PR 85724”. */
export const agencyCode = (agency?: string | null) => agency || region.agency

export const agencyName = (agency?: string | null) => NAMES[agencyCode(agency)] ?? agencyCode(agency)

/** Numer z przewoźnikiem, np. do udostępniania i kalendarza. */
export const trainLabel = (leg: { agency?: string | null; number: string }) => `${agencyCode(leg.agency)} ${leg.number}`

/**
 * Numer i nazwa pociągu osobno do nagłówka. Rozkład podaje nazwę już w numerze („71214 Powstaniec Wielkopolski”)
 * i drugi raz wielkimi literami w osobnym polu — pokazujemy ją raz, w zwykłej pisowni. Nazwy linii PKM pomijamy.
 */
export function trainTitle(number: string, name?: string | null): { number: string; name: string | null } {
  const m = number.match(/^([\d/]+)\s+(.+)$/)
  if (m) return { number: m[1], name: m[2] }
  return { number, name: name && !name.startsWith('PKM') ? name : null }
}
