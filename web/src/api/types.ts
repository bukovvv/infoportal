// Kontrakt z server/src/Api/*.php

export interface Route {
  id: string
  short: string
  long: string
  type: number
  color: string | null
  textColor: string | null
}

export interface Station {
  id: string
  name: string
  lat: number
  lon: number
  daily: number
  lines: string[]
  /** staje tu KW; false — stacja tylko POLREGIO (bez mapy) */
  kw?: boolean
}

export interface StationRef {
  id: string
  name: string
}

export type DelaySource = 'rt' | 'gps' | null

export interface BoardRow {
  key: string
  number: string
  /** KW albo PR (POLREGIO) */
  agency?: string
  route: Route | null
  isBus: boolean
  headsign: string
  origin: string
  destination: string
  via: string[]
  scheduled: string
  expected: string | null
  delay: number | null
  delaySource: DelaySource
  platform: string | null
  track: string | null
  cancelled: boolean
  skipped: boolean
}

export interface Board {
  station: StationRef
  mode: 'dep' | 'arr'
  generatedAt: string
  rows: BoardRow[]
}

export interface Leg {
  key: string
  number: string
  /** przewoźnik: KW albo PR (POLREGIO); brak w podróżach zapisanych przed dodaniem pola = KW */
  agency?: string
  route: Route | null
  isBus: boolean
  headsign: string
  from: StationRef
  to: StationRef
  departure: string
  arrival: string
  expectedDeparture: string | null
  expectedArrival: string | null
  departureDelay: number | null
  arrivalDelay: number | null
  platform: string | null
  track: string | null
  arrivalPlatform: string | null
  stopsBetween: number
  /** stacje pośrednie (bez początkowej i końcowej); brak w podróżach zapisanych przed dodaniem pola */
  stops?: LegStop[]
  /** spodziewany pojazd (vagonWEB); brak danych lub autobus — null */
  vehicle?: VehicleInfo | null
  /** POLREGIO na odcinku wspólnym z KW — bilety KW honorowane; brak w starszych zapisanych podróżach */
  kwTickets?: boolean
}

export interface LegStop {
  id: string
  name: string
  departure: string
  expectedDeparture: string | null
  delay: number | null
  skipped: boolean
  requestOnly: boolean
}

export interface Connection {
  departure: string
  arrival: string
  durationMinutes: number
  transfers: number
  waits: number[]
  via: StationRef[]
  legs: Leg[]
}

export interface ConnectionsResult {
  from: StationRef
  to: StationRef
  date: string
  time: string
  /** godzina oznacza przyjazd (wyniki: najpóźniejsze odjazdy z przyjazdem do tej godziny) */
  arriveBy: boolean
  connections: Connection[]
}

export interface TripStop {
  seq: number
  station: StationRef & { lat: number | null; lon: number | null }
  arrival: string | null
  departure: string | null
  expectedArrival: string | null
  expectedDeparture: string | null
  arrivalDelay: number | null
  departureDelay: number | null
  platform: string | null
  track: string | null
  skipped: boolean
  requestOnly: boolean
}

export interface LiveTrain {
  key: string | null
  tripId: string | null
  serviceDate: string | null
  number: string
  route: Pick<Route, 'id' | 'short' | 'color' | 'textColor'> | null
  isBus: boolean
  headsign: string | null
  origin: string | null
  destination: string | null
  lat: number
  lon: number
  bearing: number | null
  speed: number | null
  source: 'gps' | 'est'
  gpsProvider: string | null
  observedAt: string | null
  delay: number | null
  delaySource: DelaySource
  dwelling: boolean
  prev: { seq: number; name: string } | null
  next: { seq: number; name: string; expected: string | null; platform: string | null } | null
  progress: number
}

export interface Trip {
  key: string
  tripId: string
  serviceDate: string
  agency?: string
  /** kurs POLREGIO jedzie dalej poza Wielkopolskę (origin/destination to prawdziwe końce, stops — tylko tutejsze) */
  trimmed?: boolean
  number: string
  numbers: string[]
  name: string | null
  category: string | null
  isBus: boolean
  headsign: string
  route: Route | null
  origin: string
  destination: string
  stops: TripStop[]
  shape: [number, number][]
  realtime: { source: DelaySource; delay: number | null; cancelled: boolean }
  position: LiveTrain | null
  otherLegs: { key: string; number: string; isBus: boolean; from: string; to: string }[]
  notices: number[]
  /** ostatnio zaobserwowany skład (vagonWEB); brak danych lub autobus — null */
  vehicle?: VehicleInfo | null
}

/** Pociąg znaleziony po numerze (GET /trains?q=…): bieżący albo najbliższy kurs. */
export interface TrainMatch {
  key: string
  number: string
  agency?: string
  exact: boolean
  route: Route | null
  origin: string
  destination: string
  departure: string
  arrival: string
  running: boolean
}

export interface VehicleInfo {
  /** dzień obserwacji RRRR-MM-DD; null — przypisanie ręczne */
  date: string | null
  section: string | null
  /** zestawienie na vagonWEB; null — przypisanie ręczne */
  url: string | null
  vehicles: {
    series: string
    name: string | null
    image: string | null
    width: number | null
    height: number | null
    seats: number | null
    /** nazwy piktogramów vagonWEB, np. klima, wifi, kolo */
    features: string[]
  }[]
  alsoSeen: string[]
}

export interface SourceState {
  ok: boolean
  error: string | null
  [key: string]: unknown
}

export interface Live {
  generatedAt: string | null
  ageSeconds: number | null
  sources?: { gps: SourceState & { provider: string | null; count: number }; rt: SourceState & { count: number; feedTime: string | null } }
  trains: LiveTrain[]
}

export interface Status {
  level: 'ok' | 'degraded' | 'down'
  generatedAt: string
  timetable: {
    ok: boolean
    validFrom?: string
    validUntil?: string
    daysLeft?: number
    importedAt?: string
    trips?: number
    stations?: number
    attribution?: string[]
  }
  live: {
    ok: boolean
    generatedAt: string | null
    ageSeconds: number | null
    trains: number
    gpsTrains: number
    rtTrains?: number
    gpsEnabled?: boolean
    gps: (SourceState & { provider: string | null; count: number }) | null
    rt: (SourceState & { count: number; feedTime: string | null }) | null
  }
  notices: { active: number; danger: number; warning: number }
  messages: { level: 'warning' | 'error'; text: string }[]
}

export type Severity = 'info' | 'warning' | 'danger'

export interface Notice {
  id: number
  title: string
  body: string
  line: string
  severity: Severity
  trains: string[]
  startsAt: string | null
  endsAt: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminSession {
  loggedIn: boolean
  configured?: boolean
  username?: string
  csrf?: string
}
