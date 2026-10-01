import type { Severity } from '@/api/types'

// Generator treści komunikatów — przeniesiony z legacy/public/assets/app.js (przycisk „Utwórz treść”).
export type TemplateKind = 'delay' | 'cancellation' | 'bus' | 'platform' | 'shortened'

export interface TemplateInput {
  kind: TemplateKind
  train: string
  delay?: number | null
  origin?: string
  departure?: string
  destination?: string
  arrival?: string
  newDestination?: string
  station?: string
  eventTime?: string
  platform?: string
  track?: string
  reason?: string
  replacement?: boolean
}

export interface TemplateOutput {
  title: string
  body: string
  line: string
  severity: Severity
  trains: string[]
}

export const templateKinds: { value: TemplateKind; title: string }[] = [
  { value: 'delay', title: 'Opóźnienie pociągu' },
  { value: 'cancellation', title: 'Odwołanie pociągu' },
  { value: 'bus', title: 'Zastępcza komunikacja autobusowa' },
  { value: 'platform', title: 'Zmiana peronu lub toru' },
  { value: 'shortened', title: 'Skrócona relacja' },
]

/** Pola wymagane dla danego rodzaju komunikatu. */
export function requiredFields(kind: TemplateKind): (keyof TemplateInput)[] {
  const route: (keyof TemplateInput)[] = ['train', 'origin', 'departure', 'destination', 'arrival']
  if (kind === 'platform') return ['train', 'station', 'eventTime', 'platform']
  if (kind === 'delay') return [...route, 'delay']
  if (kind === 'shortened') return [...route, 'newDestination']
  return route
}

export function minutesText(n: number) {
  const lastTwo = n % 100
  const last = n % 10
  return `${n} ${n === 1 ? 'minutę' : lastTwo >= 12 && lastTwo <= 14 ? 'minut' : last >= 2 && last <= 4 ? 'minuty' : 'minut'}`
}

export function buildNotice(i: TemplateInput): TemplateOutput {
  const missing = requiredFields(i.kind).find((f) => !String(i[f] ?? '').trim())
  if (missing) throw new Error('Uzupełnij wszystkie dane potrzebne do tego komunikatu.')
  const train = i.train.trim()
  const reason = (i.reason ?? '').trim()
  const origin = (i.origin ?? '').trim()
  const destination = (i.destination ?? '').trim()
  const relation = `${origin} – ${destination}`
  const full = `${origin} (${i.departure}) – ${destination} (${i.arrival})`
  const r = reason ? ` ${reason}` : ''

  switch (i.kind) {
    case 'delay': {
      const text = minutesText(Math.max(1, Math.round(Number(i.delay))))
      return {
        title: `Pociąg ${train} opóźniony o około ${text}`,
        line: relation,
        body: `Pociąg ${train} relacji ${full} jest opóźniony o około ${text}${r}.${i.replacement ? ' Do obsługi połączenia został podstawiony skład zastępczy.' : ''}`,
        severity: 'warning',
        trains: [train],
      }
    }
    case 'cancellation':
      return {
        title: `Pociąg ${train} został odwołany`,
        line: relation,
        body: `Pociąg ${train} relacji ${full} został odwołany${r}.${i.replacement ? ' Dla pasażerów uruchomiono transport zastępczy.' : ''}`,
        severity: 'danger',
        trains: [train],
      }
    case 'bus':
      return {
        title: `Komunikacja zastępcza za pociąg ${train}`,
        line: relation,
        body: `Za pociąg ${train} relacji ${full} została uruchomiona zastępcza komunikacja autobusowa${r}. Prosimy zwracać uwagę na oznaczenia przystanków zastępczych.`,
        severity: 'warning',
        trains: [train],
      }
    case 'platform': {
      const track = (i.track ?? '').trim() ? `, tor ${(i.track ?? '').trim()}` : ''
      const station = (i.station ?? '').trim()
      return {
        title: `Zmiana peronu dla pociągu ${train}`,
        line: station,
        body: `Pociąg ${train} odjedzie ze stacji ${station} o ${i.eventTime} z peronu ${(i.platform ?? '').trim()}${track}. Prosimy o zwracanie uwagi na zapowiedzi i wyświetlacze.`,
        severity: 'warning',
        trains: [train],
      }
    }
    case 'shortened': {
      const newDestination = (i.newDestination ?? '').trim()
      return {
        title: `Skrócona relacja pociągu ${train}`,
        line: `${origin} – ${newDestination}`,
        body: `Pociąg ${train} planowej relacji ${full} pojedzie w skróconej relacji do stacji ${newDestination}${r}. Pociąg nie obsłuży odcinka ${newDestination} – ${destination}.`,
        severity: 'warning',
        trains: [train],
      }
    }
  }
}
