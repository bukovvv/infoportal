// Przewoźnicy: KW oraz partnerzy POLREGIO i PKP Intercity (tylko w Wielkopolsce, bez mapy).

const NAMES: Record<string, string> = { KW: 'Koleje Wielkopolskie', PR: 'POLREGIO', IC: 'PKP Intercity' }

/** Kurs innego przewoźnika niż KW (brak pola w starszych zapisanych podróżach = KW). */
export const isPartner = (agency?: string | null) => !!agency && agency !== 'KW'

/** PKP Intercity — bilety KW i POLREGIO nie obowiązują. */
export const isIntercity = (agency?: string | null) => agency === 'IC'

/** Skrót przed numerem pociągu: „KW 77600”, „PR 85724”. */
export const agencyCode = (agency?: string | null) => agency || 'KW'

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
