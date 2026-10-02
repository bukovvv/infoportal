import type { AdminSession, Board, ConnectionsResult, Live, Notice, Station, Status, Trip } from './types'

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
  connections: (p: { from: string; to: string; date: string; time: string; direct?: boolean }) =>
    request<ConnectionsResult>('GET', `/connections?${q({ ...p, direct: p.direct ? 1 : undefined })}`),
  trip: (key: string) => request<Trip>('GET', `/trips/${encodeURIComponent(key)}`),
  train: (number: string) => request<Trip>('GET', `/trains/${encodeURIComponent(number)}`),
  network: () => request<GeoJSON.FeatureCollection>('GET', '/network'),
  live: () => request<Live>('GET', '/live'),
  status: () => request<Status>('GET', '/status'),
  notices: () => request<Notice[]>('GET', '/notices'),
  admin: {
    session: () => request<AdminSession>('GET', '/admin/session'),
    login: (username: string, password: string) => request<AdminSession>('POST', '/admin/login', { username, password }),
    logout: () => request<AdminSession>('POST', '/admin/logout', {}),
    notices: () => request<Notice[]>('GET', '/admin/notices'),
    saveNotice: (notice: Partial<Notice>, id?: number) =>
      id ? request<Notice>('PUT', `/admin/notices/${id}`, notice) : request<Notice>('POST', '/admin/notices', notice),
    deleteNotice: (id: number) => request<{ deleted: boolean }>('DELETE', `/admin/notices/${id}`),
    health: () => request<Status & { server: Record<string, unknown> }>('GET', '/admin/health'),
    importTimetable: () => request<{ stats: Record<string, unknown>; log: string[] }>('POST', '/admin/import', {}),
  },
}
