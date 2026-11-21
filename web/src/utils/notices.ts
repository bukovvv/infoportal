import type { Connection, Notice, Severity, StationRef } from '@/api/types'
import { isPartner } from './agency'
import { splitNumbers } from './format'
import { region } from './region'
import { LEGEND, PKM_LINES, type SchemeLine } from './scheme'

export const noticeIcon: Record<Severity, string> = { danger: 'cancel-fill', warning: 'warning-fill', info: 'info-fill' }
export const noticeLabel: Record<Severity, string> = { danger: 'Poważne utrudnienie', warning: 'Utrudnienie', info: 'Informacja' }

/** Linie, do których można przypiąć komunikat: linie KW ze schematu (kolejność legendy), potem PKM. */
export const NOTICE_LINES: SchemeLine[] = [...LEGEND, ...[...PKM_LINES].sort((a, b) => (a.badge ?? '').localeCompare(b.badge ?? ''))]
const LINE_BY_ID = new Map(NOTICE_LINES.map((l) => [l.id, l]))

export const lineTitle = (l: SchemeLine) => (l.badge ? `${l.badge} ${l.name}` : l.name)
export const noticeLines = (n: Pick<Notice, 'lines'>): SchemeLine[] => n.lines.flatMap((id) => LINE_BY_ID.get(id) ?? [])

/** Komunikat dotyczy stacji: wybranej wprost albo leżącej na wybranej linii. */
export function aboutStation(n: Notice, station: Pick<StationRef, 'id' | 'name'>): boolean {
  return n.stations.includes(station.id) || noticeLines(n).some((l) => l.stations.includes(station.name))
}

/** Pociąg w komunikacie: sam numer — przewoźnik regionu, „PR 85724” / „IC 1804” — POLREGIO, PKP Intercity. */
export const noticeTrain = (agency: string | null | undefined, number: string) => (isPartner(agency) ? `${agency} ${number}` : number)
export function parseNoticeTrain(token: string): { agency: string; number: string } {
  const m = /^([A-Z]+) (\d+)$/.exec(token)
  return m ? { agency: m[1], number: m[2] } : { agency: region.agency, number: token }
}
/** Wpis w polu pociągów panelu („85724”, „pr85724”, „IC 1804”, „KW 77600”) → pociąg komunikatu; null — to nie numer. */
export function noticeTrainInput(value: string): string | null {
  const m = /^\s*(?:(kw|km[lł]|pr|ic)\s*)?(\d{3,6})\s*$/i.exec(value)
  return m ? noticeTrain(m[1]?.toUpperCase().replace('Ł', 'L'), m[2]) : null
}

/**
 * Komunikat dotyczy kursu: pociąg z listy, postój na wybranej stacji albo przejazd wybraną linią (co najmniej dwie stacje kursu na linii).
 * POLREGIO i PKP Intercity — tylko wymienione z numerem (stacje i linie dotyczą pociągów przewoźnika regionu).
 */
export function aboutTrip(n: Notice, numbers: string[], stops: Pick<StationRef, 'id' | 'name'>[], agency?: string | null): boolean {
  const own = numbers.map((x) => noticeTrain(agency, x))
  if (n.trains.some((t) => own.includes(t))) return true
  if (isPartner(agency)) return false
  if (stops.some((s) => n.stations.includes(s.id))) return true
  return noticeLines(n).some((l) => stops.filter((s) => l.stations.includes(s.name)).length >= 2)
}

/** Komunikat dotyczy połączenia: któregoś odcinka (jak na stronie pociągu). */
export function aboutConnection(n: Notice, c: Pick<Connection, 'legs'>): boolean {
  return c.legs.some((leg) => aboutTrip(n, splitNumbers(leg.number), [leg.from, ...(leg.stops ?? []), leg.to], leg.agency))
}

/** Najpierw poważne utrudnienia, potem utrudnienia, na końcu informacje. */
const RANK: Record<Severity, number> = { danger: 0, warning: 1, info: 2 }
export const bySeverity = (a: Notice, b: Notice) => RANK[a.severity] - RANK[b.severity]

/** „Dotyczy” ułożone z wybranych linii i stacji (podpowiedź pola „Linia lub odcinek” w panelu). */
export function scopeText(lines: string[], stationNames: string[]): string {
  const parts = [...noticeLines({ lines }).map(lineTitle), ...stationNames]
  if (!parts.length) return ''
  const text = parts.length > 3 ? `${parts.slice(0, 3).join(', ')} i ${parts.length - 3} więcej` : parts.join(', ')
  return text.length > 120 ? `${text.slice(0, 119)}…` : text
}

export type BodyBlock = { kind: 'p'; text: string } | { kind: 'ul'; items: string[] }
const BULLET = /^\s*[-–•*]\s+/

/** Treść komunikatu na akapity (oddzielone pustą linią) i listy (wiersze od „- ”, „– ”, „• ” albo „* ”). Zawsze sam tekst — bez HTML. */
export function bodyBlocks(body: string): BodyBlock[] {
  const blocks: BodyBlock[] = []
  let open = false
  for (const raw of body.split('\n')) {
    const line = raw.trimEnd()
    const last = blocks[blocks.length - 1]
    if (!line.trim()) {
      open = false
    } else if (BULLET.test(line)) {
      const item = line.replace(BULLET, '')
      if (open && last?.kind === 'ul') last.items.push(item)
      else blocks.push({ kind: 'ul', items: [item] })
      open = true
    } else if (open && last?.kind === 'p') {
      last.text += `\n${line.trim()}`
    } else if (open && last?.kind === 'ul' && /^\s+/.test(raw)) {
      // wcięty wiersz — ciąg dalszy punktu listy
      last.items[last.items.length - 1] += ` ${line.trim()}`
    } else {
      blocks.push({ kind: 'p', text: line.trim() })
      open = true
    }
  }
  return blocks
}

/** Treść bez znaczników list i pustych linii — do skróconego podglądu i opisu strony. */
export const plainBody = (body: string) => body.split('\n').map((l) => l.replace(BULLET, '').trim()).filter(Boolean).join('\n')
