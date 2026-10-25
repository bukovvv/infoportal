import type { Notice, Severity } from '@/api/types'
import { localStamp } from './noticeText'
import { NOTICE_LINES, noticeLines } from './notices'

// Panel: stan komunikatu, zapis zmian z listy, robocze wersje formularza i zasięg („Gdzie się pokaże”).

/** Widoczny teraz, zaplanowany (początek w przyszłości), wygasły albo szkic (ukryty). */
export type NoticeState = 'live' | 'plan' | 'past' | 'draft'

export const STATE_LABEL: Record<NoticeState, string> = { live: 'Widoczny', plan: 'Zaplanowany', past: 'Wygasł', draft: 'Szkic' }
export const STATE_FILTERS: { value: NoticeState | 'all'; label: string }[] = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'live', label: 'Widoczne' },
  { value: 'plan', label: 'Zaplanowane' },
  { value: 'draft', label: 'Szkice' },
  { value: 'past', label: 'Wygasłe' },
]

/** „RRRR-MM-DDTGG:MM” (czas lokalny) → milisekundy; pusty — brak granicy. */
export const stampMs = (s: string | null | undefined) => (s ? new Date(s).getTime() : null)

export function noticeState(n: Pick<Notice, 'active' | 'startsAt' | 'endsAt'>, now = Date.now()): NoticeState {
  if (!n.active) return 'draft'
  const start = stampMs(n.startsAt)
  const end = stampMs(n.endsAt)
  if (start !== null && start > now) return 'plan'
  if (end !== null && end < now) return 'past'
  return 'live'
}

export type NoticeForm = Pick<Notice, 'title' | 'body' | 'line' | 'severity' | 'trains' | 'stations' | 'lines' | 'active'> & { startsAt: string; endsAt: string }

export const emptyForm = (): NoticeForm => ({
  title: '', body: '', line: '', severity: 'warning', trains: [], stations: [], lines: [], startsAt: '', endsAt: '', active: true,
})

/** Komunikat jako dane do zapisu (PUT podmienia całość, więc zmiana z listy wysyła wszystkie pola). */
export function toForm(n: Notice, over: Partial<NoticeForm> = {}): NoticeForm {
  return {
    title: n.title, body: n.body, line: n.line, severity: n.severity, trains: [...n.trains], stations: [...n.stations], lines: [...n.lines],
    startsAt: n.startsAt ?? '', endsAt: n.endsAt ?? '', active: n.active, ...over,
  }
}

/** Nowy koniec publikacji przesunięty o godziny od późniejszego z: obecnego końca i teraz. */
export function extendedEnd(n: Pick<Notice, 'endsAt'>, hours: number, now = Date.now()): string {
  const base = Math.max(stampMs(n.endsAt) ?? now, now)
  return localStamp(new Date(base + hours * 3_600_000))
}

/** Koniec dzisiejszego dnia (23:59) — „do końca dnia”. */
export function endOfDay(now = new Date()): string {
  return localStamp(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59))
}

/** Okres publikacji krótko: „18.10 – 31.10”, „dziś 17:20 – 21:00”, „od 1.11”, „bez dat”. */
export function periodText(n: Pick<Notice, 'startsAt' | 'endsAt'>, now = new Date()): string {
  const fmt = (s: string) => {
    const d = new Date(s)
    const sameDay = d.toDateString() === now.toDateString()
    const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
    const showTime = !(d.getHours() === 0 && d.getMinutes() === 0) && !(d.getHours() === 23 && d.getMinutes() === 59)
    return sameDay ? `dziś ${time}` : `${d.getDate()}.${d.getMonth() + 1}${showTime ? ` ${time}` : ''}`
  }
  if (n.startsAt && n.endsAt) {
    const a = fmt(n.startsAt)
    const b = fmt(n.endsAt)
    return a.startsWith('dziś') && b.startsWith('dziś') ? `${a} – ${b.slice(5)}` : `${a} – ${b}`
  }
  if (n.endsAt) return `do ${fmt(n.endsAt)}`
  if (n.startsAt) return `od ${fmt(n.startsAt)}`
  return 'bez dat'
}

const DAY = 86_400_000
/** Ile zostało / kiedy się pokaże / jak dawno wygasł — drugi wiersz okresu na liście. */
export function relativeText(n: Notice, now = Date.now()): string {
  const state = noticeState(n, now)
  const start = stampMs(n.startsAt)
  const end = stampMs(n.endsAt)
  const span = (ms: number) => {
    const h = Math.round(ms / 3_600_000)
    if (h < 1) return 'niecałą godzinę'
    if (h < 24) return `${h} h`
    const d = Math.round(ms / DAY)
    return d === 1 ? '1 dzień' : `${d} dni`
  }
  if (state === 'draft') return `szkic, zmieniony ${new Date(n.updatedAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'numeric' })}`
  if (state === 'plan' && start !== null) return `pokaże się za ${span(start - now)}`
  if (state === 'past' && end !== null) return `wygasł ${span(now - end)} temu`
  if (end !== null) return end - now < DAY ? `wygasa za ${span(end - now)}` : `jeszcze ${span(end - now)}`
  return 'bez końca — do ukrycia'
}

// --- zasięg komunikatu

export interface Reach {
  /** nazwy stacji z tablicami, na których się pokaże (wybrane + leżące na liniach) */
  boards: string[]
  lines: string[]
  trains: number
  /** linia przechodzi przez Poznań Gł., którego nie wybrano wprost */
  hubViaLine: boolean
}

export function reach(form: Pick<NoticeForm, 'stations' | 'lines' | 'trains'>, stationName: (id: string) => string, hub = 'Poznań Główny'): Reach {
  const picked = form.stations.map(stationName)
  const lines = noticeLines(form)
  const boards = [...new Set([...picked, ...lines.flatMap((l) => l.stations)])]
  return {
    boards,
    lines: lines.map((l) => (l.badge ? `${l.badge} ${l.name}` : l.name)),
    trains: form.trains.length,
    hubViaLine: !picked.includes(hub) && lines.some((l) => l.stations.includes(hub)),
  }
}

// --- „Do zrobienia” na pulpicie

export interface Todo {
  kind: 'expiring' | 'draft'
  notice: Notice
  text: string
}

/** Widoczne komunikaty, które wygasają w ciągu 6 h, i szkice nieruszane od 3 dni. */
export function todos(list: Notice[], now = Date.now()): Todo[] {
  const out: Todo[] = []
  for (const n of list) {
    const state = noticeState(n, now)
    const end = stampMs(n.endsAt)
    if (state === 'live' && end !== null && end - now < 6 * 3_600_000) out.push({ kind: 'expiring', notice: n, text: relativeText(n, now) })
    if (state === 'draft' && now - new Date(n.updatedAt).getTime() > 3 * DAY) {
      out.push({ kind: 'draft', notice: n, text: `szkic czeka od ${Math.floor((now - new Date(n.updatedAt).getTime()) / DAY)} dni` })
    }
  }
  return out
}

// --- robocze wersje formularza (w przeglądarce; nie giną przy odświeżeniu ani wygaśnięciu sesji)

export interface EditorDraft {
  form: NoticeForm
  step: number
  savedAt: string
  /** skąd treść: wklejka od przewoźnika — edytor pokazuje wtedy, że wszystko rozpoznano automatycznie */
  origin?: 'paste'
}

const DRAFT_KEY = 'kw_admin_draft'
type DraftStore = Record<string, EditorDraft>

function readAll(): DraftStore {
  try {
    const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}')
    return raw && typeof raw === 'object' ? (raw as DraftStore) : {}
  } catch {
    return {}
  }
}
function writeAll(all: DraftStore) {
  try {
    if (Object.keys(all).length) localStorage.setItem(DRAFT_KEY, JSON.stringify(all))
    else localStorage.removeItem(DRAFT_KEY)
  } catch {
    // pełna albo zablokowana pamięć — robocza wersja po prostu się nie zapisze
  }
}

/** `key`: 'new' albo id komunikatu. */
export const readDraft = (key: string): EditorDraft | null => readAll()[key] ?? null
export function writeDraft(key: string, draft: EditorDraft) {
  writeAll({ ...readAll(), [key]: draft })
}
export function clearDraft(key: string) {
  const all = readAll()
  delete all[key]
  writeAll(all)
}

export const lineColor = (id: string) => NOTICE_LINES.find((l) => l.id === id)?.color ?? '#9A8D8D'

export const SEVERITY_OPTIONS: { value: Severity; title: string; text: string }[] = [
  { value: 'info', title: 'Informacja', text: 'Nowości, zmiany bez utrudnień. Pasażer może je ukryć w ustawieniach.' },
  { value: 'warning', title: 'Utrudnienie', text: 'Zmiana peronu, opóźnienie, skrócona relacja.' },
  { value: 'danger', title: 'Poważne utrudnienie', text: 'Odwołania, autobusy za pociągi, zamknięta linia.' },
]

