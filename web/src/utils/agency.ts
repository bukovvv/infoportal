// Przewoźnicy w wynikach wyszukiwarki: KW oraz POLREGIO (tylko w Wielkopolsce, bez strony pociągu, mapy i tablicy).

const NAMES: Record<string, string> = { KW: 'Koleje Wielkopolskie', PR: 'POLREGIO' }

/** Kurs innego przewoźnika niż KW (brak pola w starszych zapisanych podróżach = KW). */
export const isPartner = (agency?: string | null) => !!agency && agency !== 'KW'

/** Skrót przed numerem pociągu: „KW 77600”, „PR 85724”. */
export const agencyCode = (agency?: string | null) => agency || 'KW'

export const agencyName = (agency?: string | null) => NAMES[agencyCode(agency)] ?? agencyCode(agency)

/** Numer z przewoźnikiem, np. do udostępniania i kalendarza. */
export const trainLabel = (leg: { agency?: string | null; number: string }) => `${agencyCode(leg.agency)} ${leg.number}`
