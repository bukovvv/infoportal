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
}

export interface StationRef {
  id: string
  name: string
}

export type DelaySource = 'rt' | 'gps' | null

export interface BoardRow {
  key: string
  number: string
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
