import type { AdminLogEntry, AdminSession, Board, ConnectionsResult, Live, Notice, Punctuality, Station, Status, TrainMatch, Trip } from './types'

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
  }
}

let csrfToken = ''
export const setCsrf = (token: string | undefined) => { csrfToken = token ?? '' }

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(method !== 'GET' && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError('Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.', 0)
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError((data && typeof data.error === 'string') ? data.error : `Błąd serwera (${response.status}).`, response.status)
  }
  return data as T
}

const q = (params: Record<string, string | number | boolean | undefined>) =>
  new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString()

export const api = {
  stations: () => request<Station[]>('GET', '/stations'),
  /** at: dzień (RRRR-MM-DD) i godzina (GG:MM), od których pokazać kursy; bez at — od teraz. */
  board: (stationId: string, mode: 'dep' | 'arr', limit = 16, at?: { date?: string; time?: string }) =>
    request<Board>('GET', `/stations/${encodeURIComponent(stationId)}/board?${q({ mode, limit, date: at?.date, time: at?.time })}`),
  connections: (p: {
    from: string; to: string; date: string; time: string; arriveBy?: boolean; limit?: number
    /** opcje (utils/searchOptions): najwięcej przesiadek, minimalny czas w min, przewoźnicy „KW,PR” */
    transfers?: number; minTransfer?: number; agencies?: string
  }) =>
    request<ConnectionsResult>('GET', `/connections?${q({ from: p.from, to: p.to, date: p.date, time: p.time, arrive: p.arriveBy ? 1 : undefined, limit: p.limit, transfers: p.transfers, minTransfer: p.minTransfer, agencies: p.agencies })}`),
  trip: (key: string) => request<Trip>('GET', `/trips/${encodeURIComponent(key)}`),
  train: (number: string) => request<Trip>('GET', `/trains/${encodeURIComponent(number)}`),
  searchTrains: (query: string) => request<{ query: string; trains: TrainMatch[] }>('GET', `/trains?${q({ q: query })}`),
  network: () => request<GeoJSON.FeatureCollection>('GET', '/network'),
  live: () => request<Live>('GET', '/live'),
  status: () => request<Status>('GET', '/status'),
  notices: () => request<Notice[]>('GET', '/notices'),
  punctuality: (number: string, agency = 'KW') => request<Punctuality>('GET', `/punctuality?${q({ number, agency })}`),
  push: {
    key: () => request<{ key: string }>('GET', '/push/key'),
    watch: (body: { subscription: PushSubscriptionJSON; journeyId: string; legs: { key: string; from: string; to: string }[] }) =>
      request<{ watching: boolean }>('POST', '/push/watch', body),
    unwatch: (body: { endpoint: string; journeyId?: string }) => request<{ watching: boolean }>('POST', '/push/unwatch', body),
    watchRoute: (body: {
      subscription: PushSubscriptionJSON; routeId: string; from: string; to: string
      options: { transfers: number; minTransfer: number; agencies: string[] }
      windows: { dir: 'ab' | 'ba'; days: number[]; start: string; end: string }[]
    }) => request<{ watching: boolean }>('POST', '/push/route-watch', body),
    unwatchRoute: (body: { endpoint: string; routeId: string }) => request<{ watching: boolean }>('POST', '/push/route-unwatch', body),
  },
  admin: {
    session: () => request<AdminSession>('GET', '/admin/session'),
    login: (username: string, password: string) => request<AdminSession>('POST', '/admin/login', { username, password }),
    logout: () => request<AdminSession>('POST', '/admin/logout', {}),
    notices: () => request<Notice[]>('GET', '/admin/notices'),
    saveNotice: (notice: Partial<Notice>, id?: number) =>
      id ? request<Notice>('PUT', `/admin/notices/${id}`, notice) : request<Notice>('POST', '/admin/notices', notice),
    deleteNotice: (id: number) => request<{ deleted: boolean }>('DELETE', `/admin/notices/${id}`),
    log: () => request<AdminLogEntry[]>('GET', '/admin/log'),
    health: () => request<Status & { server: Record<string, unknown> }>('GET', '/admin/health'),
    importTimetable: () => request<{ stats: Record<string, unknown>; log: string[] }>('POST', '/admin/import', {}),
  },
}
