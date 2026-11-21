// Regiony serwisu: Wielkopolska (Koleje Wielkopolskie, pod /) i Małopolska (Koleje Małopolskie, pod /malopolska).
// Region wynika z adresu przy wczytaniu strony i nie zmienia się do przeładowania — przełączenie regionu to zwykły
// link do drugiego adresu (pełne wczytanie: inne stacje, rozkład i dane na żywo). Router dostaje base, API prefiks.

export type RegionId = 'wielkopolska' | 'malopolska' | 'nowyrj27'

export interface Region {
  id: RegionId
  /** początek adresów strony: '' albo '/malopolska' */
  base: string
  /** prefiks API: /api/stations albo /api/malopolska/stations */
  api: string
  name: string
  /** „w Wielkopolsce”, „w Małopolsce” */
  inName: string
  /** „po Wielkopolsce” */
  overName: string
  /** przewoźnik regionu: identyfikator w rozkładzie (KW, KML), skrót dla pasażera (KW, KMŁ) i pełna nazwa */
  agency: string
  agencyLabel: string
  agencyName: string
  /** „Kolei Wielkopolskich” */
  agencyOf: string
  /** główna stacja (domyślna tablica odjazdów, najważniejszy węzeł na mapie) */
  hub: { id: string; name: string }
  /** sprzedaż biletów przewoźnika (przycisk „Kup bilet”) */
  ticketUrl: string
  /** POLREGIO honoruje bilety przewoźnika na odcinkach wspólnych */
  partnerTickets: boolean
  /** środek i przybliżenie mapy przed wczytaniem pociągów */
  mapCenter: [number, number]
  /** części serwisu, które są tylko w niektórych regionach */
  features: { scheme: boolean; btk: boolean; notices: boolean; admin: boolean; map: boolean }
  /** tylko dla zalogowanego administratora (bez przełącznika regionu, noindex); startDate — domyślny dzień wyszukiwania */
  adminOnly?: boolean
  startDate?: string
}

export const DEFAULT_REGION: RegionId = 'wielkopolska'

export const REGIONS: Record<RegionId, Region> = {
  wielkopolska: {
    id: 'wielkopolska',
    base: '',
    api: '',
    name: 'Wielkopolska',
    inName: 'w Wielkopolsce',
    overName: 'po Wielkopolsce',
    agency: 'KW',
    agencyLabel: 'KW',
    agencyName: 'Koleje Wielkopolskie',
    agencyOf: 'Kolei Wielkopolskich',
    hub: { id: '30601', name: 'Poznań Główny' },
    ticketUrl: 'https://wielkopolskiebilety.pl/',
    partnerTickets: true,
    mapCenter: [17.2, 52.3],
    features: { scheme: true, btk: true, notices: true, admin: true, map: true },
  },
  malopolska: {
    id: 'malopolska',
    base: '/malopolska',
    api: '/malopolska',
    name: 'Małopolska',
    inName: 'w Małopolsce',
    overName: 'po Małopolsce',
    agency: 'KML',
    agencyLabel: 'KMŁ',
    agencyName: 'Koleje Małopolskie',
    agencyOf: 'Kolei Małopolskich',
    hub: { id: '80416', name: 'Kraków Główny' },
    ticketUrl: 'https://kolejemalopolskie.com.pl/pl/dla-pasazera/gdzie-kupic-bilet-kolejowy',
    partnerTickets: true,
    mapCenter: [20.1, 49.85],
    features: { scheme: false, btk: false, notices: false, admin: false, map: true },
  },
  // podgląd nowego rozkładu 2026/27 dla administratora: KW, POLREGIO i PKP Intercity w całej Polsce, bez danych na żywo
  nowyrj27: {
    id: 'nowyrj27',
    base: '/nowyrj27',
    api: '/admin/nowyrj27',
    name: 'Polska (RJ 2026/27)',
    inName: 'w całej Polsce',
    overName: 'po Polsce',
    agency: 'KW',
    agencyLabel: 'KW',
    agencyName: 'Koleje Wielkopolskie',
    agencyOf: 'Kolei Wielkopolskich',
    hub: { id: '30601', name: 'Poznań Główny' },
    ticketUrl: 'https://wielkopolskiebilety.pl/',
    partnerTickets: true,
    mapCenter: [19.4, 52.1],
    features: { scheme: false, btk: false, notices: false, admin: false, map: false },
    adminOnly: true,
    startDate: '2026-12-13',
  },
}

/** Regiony w przełączniku (bez podglądu dla administratora). */
export const REGION_LIST: Region[] = Object.values(REGIONS).filter((r) => !r.adminOnly)

/** Region z adresu strony: /malopolska i wszystko pod nim — Małopolska, reszta — Wielkopolska. */
export function regionFromPath(pathname: string): Region {
  return Object.values(REGIONS).find((r) => r.base && (pathname === r.base || pathname.startsWith(r.base + '/'))) ?? REGIONS[DEFAULT_REGION]
}

/** Region tej strony (stały do przeładowania). */
export const region: Region = regionFromPath(typeof location !== 'undefined' ? location.pathname : '/')

export const isDefaultRegion = region.id === DEFAULT_REGION

/**
 * Dane pasażera zależne od regionu (ulubione stacje, podróże, trasy, ostatnie wyszukiwanie, tablica, opcje) mają
 * w innych regionach osobne klucze localStorage: kw_routes → kw_routes@malopolska. Ustawienia i motyw są wspólne.
 */
const REGIONAL_KEYS = new Set(['kw_favorite_stations', 'kw_journeys_v1', 'kw_routes', 'kw_board_station', 'kw_last_search', 'kw_search_options'])

export function storageKey(key: string, r: Region = region): string {
  return r.id === DEFAULT_REGION || !REGIONAL_KEYS.has(key) ? key : `${key}@${r.id}`
}

/** Pełny adres strony w regionie (do linków poza routerem: udostępnianie, przełącznik regionu). */
export const regionPath = (path: string, r: Region = region) => (r.base + (path.startsWith('/') ? path : '/' + path)).replace(/(.)\/$/, '$1')

/** Ostatnio używany region (zainstalowana aplikacja startuje pod /, a mieszkaniec Krakowa chce od razu Małopolskę). */
export const LAST_REGION_KEY = 'kw_region'

/**
 * Przełącznik regionu: zapamiętuje wybór przed przejściem pod nowy adres — inaczej zainstalowana aplikacja
 * przy wejściu na / wracałaby do poprzedniego regionu (start aplikacji otwiera ostatni region, zob. migrate.ts).
 */
export function rememberRegion(id: RegionId) {
  try { localStorage.setItem(LAST_REGION_KEY, id) } catch { /* pamięć przeglądarki jest opcjonalna */ }
}
