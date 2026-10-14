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
  if (permission !== 'granted') {
    throw new Error('Powiadomienia są zablokowane. Zezwól na nie w ustawieniach przeglądarki dla tej strony.')
  }
  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing
  const { key } = await api.push.key()
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) as BufferSource })
}

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
