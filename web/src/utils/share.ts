// Udostępnianie: systemowe okno (telefon) albo skopiowanie linku do schowka (komputer).
import type { Connection } from '@/api/types'
import { useUi } from '@/stores/ui'
import { trainLabel } from './agency'
import { clock } from './format'
import { regionPath } from './region'

export async function shareLink(data: { title: string; text: string; url: string }) {
  const ui = useUi()
  if (navigator.share) {
    try {
      await navigator.share(data)
      return
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return // pasażer zamknął okno udostępniania
    }
  }
  try {
    await navigator.clipboard.writeText(data.url)
    ui.notify('Skopiowano link.')
  } catch {
    ui.notify(data.url)
  }
}

/** Link do wyszukiwarki z tym połączeniem jako pierwszym wynikiem (dzień i godzina odjazdu). */
export function connectionUrl(c: Connection) {
  const first = c.legs[0]
  const last = c.legs[c.legs.length - 1]
  const params = new URLSearchParams({ z: first.from.id, do: last.to.id, data: c.departure.slice(0, 10), godz: clock(c.departure) })
  // opcje w adresie (nie te zapamiętane u odbiorcy), żeby to połączenie na pewno się znalazło
  params.set('przes', c.transfers ? '2' : '0')
  return `${location.origin}${regionPath('/')}?${params}`
}

export function shareConnection(c: Connection) {
  const first = c.legs[0]
  const last = c.legs[c.legs.length - 1]
  const trains = c.legs.map(trainLabel).join(', ')
  return shareLink({
    title: `${first.from.name} → ${last.to.name}`,
    text: `${first.from.name} → ${last.to.name}, ${clock(c.departure)}–${clock(c.arrival)} (${trains})`,
    url: connectionUrl(c),
  })
}
