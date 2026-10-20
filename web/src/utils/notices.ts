import type { Connection, Notice, Severity, StationRef } from '@/api/types'
import { isPartner } from './agency'
import { normalize, splitNumbers } from './format'
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

/** Komunikat dotyczy kursu: pociąg z listy, postój na wybranej stacji albo przejazd wybraną linią (co najmniej dwie stacje kursu na linii). */
export function aboutTrip(n: Notice, numbers: string[], stops: Pick<StationRef, 'id' | 'name'>[]): boolean {
  if (n.trains.some((t) => numbers.includes(t))) return true
  if (stops.some((s) => n.stations.includes(s.id))) return true
  return noticeLines(n).some((l) => stops.filter((s) => l.stations.includes(s.name)).length >= 2)
}

/** Komunikat dotyczy połączenia: któregoś odcinka KW (POLREGIO i PKP Intercity pomijamy — komunikaty dotyczą KW, jak na stronie pociągu). */
export function aboutConnection(n: Notice, c: Pick<Connection, 'legs'>): boolean {
  return c.legs.some((leg) => !isPartner(leg.agency) && aboutTrip(n, splitNumbers(leg.number), [leg.from, ...(leg.stops ?? []), leg.to]))
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

// --- wykrywanie pociągów i stacji w treści (panel: „Wykryj z treści”, np. po wklejeniu aktualności przewoźnika)

/** Numery pociągów (4–6 cyfr, także „77610/1”) poza datami, godzinami i latami. */
export function detectTrains(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(/(?<![\d.:,/-])\d{4,6}(?:\/\d{1,6})?(?!\d|[.:,/-]\d)/g)) {
    if (/^(19|20)\d\d$/.test(m[0])) continue
    for (const n of splitNumbers(m[0])) if (!out.includes(n)) out.push(n)
  }
  return out
}

/** Klucz nazwy stacji: „Poznań Gł.” = „Poznań Główny”, „Wlkp.” = „Wielkopolski”. */
export function stationTextKey(name: string): string {
  return ` ${normalize(name)
    .replace(/\bglown(y|a|e)\b|\bgl\./g, 'gl')
    .replace(/\bwielkopolsk(i|a|ie)\b|\bwlkp\.?/g, 'wlkp')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `
}

/** Stacje wymienione w tekście (pełna nazwa jako osobne słowa); dłuższa nazwa wygrywa: „Konin Zachód” nie dodaje „Konin”. */
export function detectStations<S extends Pick<StationRef, 'id' | 'name'>>(text: string, stations: S[]): S[] {
  const full = stationTextKey(text)
  let hay = full
  const found: { s: S; at: number }[] = []
  for (const s of [...stations].sort((a, b) => b.name.length - a.name.length)) {
    const key = stationTextKey(s.name)
    if (key.trim().length < 3 || !hay.includes(key)) continue
    found.push({ s, at: full.indexOf(key) })
    hay = hay.split(key).join(' | ')
  }
  // w kolejności z tekstu
  return found.sort((a, b) => a.at - b.at).map((f) => f.s)
}
