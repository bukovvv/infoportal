// Powiadomienia push o obserwowanej podróży: service worker (public/sw.js) rejestrowany dopiero po włączeniu powiadomień.
import { api } from '@/api/client'
import type { Connection } from '@/api/types'

export type PushSupport = 'ok' | 'ios-install' | 'unsupported'

/** iPhone i iPad pozwalają na powiadomienia tylko w aplikacji dodanej do ekranu początkowego. */
export function pushSupport(): PushSupport {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) return 'ok'
  return ios && !standalone ? 'ios-install' : 'unsupported'
}

function keyBytes(base64url: string): Uint8Array {
  const raw = atob(base64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (base64url.length % 4)) % 4))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

/** Subskrypcja tej przeglądarki (pyta o zgodę przy pierwszym razie). Rzuca Error z komunikatem dla pasażera. */
async function subscription(): Promise<PushSubscription> {
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
  if (permission !== 'granted') throw new Error(BLOCKED)
  // rejestracja i usługa push przeglądarki potrafią nie odpowiadać — bez limitu przycisk kręciłby się bez końca
  const registration = await withinTime(navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready))
  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing
  const { key } = await api.push.key()
  // przeglądarka zgłasza błędy po angielsku — pasażerowi pokazujemy polski komunikat
  return withinTime(registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) as BufferSource }))
    .catch((e: unknown) => {
      if (e instanceof Error && e.message === TIMEOUT) throw e
      throw new Error((e as DOMException)?.name === 'NotAllowedError' ? BLOCKED : 'Nie udało się włączyć powiadomień w tej przeglądarce. Spróbuj ponownie za chwilę.')
    })
}

const BLOCKED = 'Powiadomienia są zablokowane. Zezwól na nie w ustawieniach przeglądarki dla tej strony.'
const TIMEOUT = 'Przeglądarka nie odpowiada przy włączaniu powiadomień. Spróbuj ponownie za chwilę.'

function withinTime<T>(promise: Promise<T>, ms = 15_000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(TIMEOUT)), ms)),
  ])
}

/** Czy powiadomienia są zablokowane w ustawieniach przeglądarki (wtedy nie pytamy, tylko podpowiadamy). */
export const pushBlocked = () => typeof Notification !== 'undefined' && Notification.permission === 'denied'

export async function watchJourney(id: string, connection: Connection) {
  const sub = await subscription()
  await api.push.watch({
    subscription: sub.toJSON(),
    journeyId: id,
    legs: connection.legs.map((l) => ({ key: l.key, from: l.from.id, to: l.to.id })),
  })
}

/** Wyłącza powiadomienia o podróży (bez pytania o zgodę; brak subskrypcji = nic do zrobienia). */
export async function unwatchJourney(id: string) {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  const sub = await registration?.pushManager.getSubscription()
  if (sub) await api.push.unwatch({ endpoint: sub.endpoint, journeyId: id })
}

/** Okienko powiadomień o trasie: dni 1–7 (pn–nd) i godziny odjazdu GG:MM. */
export interface RouteWindowBody { dir: 'ab' | 'ba'; days: number[]; start: string; end: string }

/** Włącza (albo odnawia) powiadomienia o trasie A–B w podanych okienkach czasu. */
export async function watchRoute(id: string, body: { from: string; to: string; options: { transfers: number; minTransfer: number; agencies: string[] }; windows: RouteWindowBody[] }) {
  const sub = await subscription()
  await api.push.watchRoute({ subscription: sub.toJSON(), routeId: id, ...body })
}

export async function unwatchRoute(id: string) {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  const sub = await registration?.pushManager.getSubscription()
  if (sub) await api.push.unwatchRoute({ endpoint: sub.endpoint, routeId: id })
}
