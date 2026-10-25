import type { Severity, StationRef } from '@/api/types'
import { normalize, splitNumbers } from './format'
import { NOTICE_LINES } from './notices'

// Rozbiór tekstu komunikatu (panel: „Wklej od przewoźnika” i podpowiedzi w edytorze) — tylko tekst, nic nie trafia do HTML.

/** Węzeł, przez który jeździ prawie wszystko — w tekście przewoźnika zwykle tylko cel pociągów, więc nie zaznaczamy go z góry. */
export const HUB_STATION = 'Poznań Główny'

// --- stacje, także w odmianie („z Konina”, „w Kole”, „do Poznania Gł.”)

/** Skróty słów z nazw stacji (po `normalize`, bez kropki). */
const ABBREVIATIONS: [RegExp, string[]][] = [
  [/^glown[yae]$/, ['gl']],
  [/^wielkopolsk(i|a|ie)$/, ['wlkp', 'wlk']],
  [/^zachod$/, ['zach']],
  [/^wschod$/, ['wsch']],
  [/^kolo$/, ['k']],
]

/** Twarde spółgłoski, które w miejscowniku miękną: Trzcianka → Trzciance, Środa → Środzie, Góra → Górze. */
const SOFTEN: [RegExp, string][] = [[/ch$/, 'sz'], [/k$/, 'c'], [/g$/, 'dz'], [/d$/, 'dz'], [/t$/, 'c'], [/r$/, 'rz'], [/st$/, 'sc']]

/** Formy słowa z nazwy stacji (po `normalize`), które uznajemy za tę samą nazwę — końcówki przypadków i proste oboczności. */
export function wordForms(word: string): Set<string> {
  const out = new Set([word])
  if (word.length < 4) return out
  const add = (stem: string, endings: string[]) => endings.forEach((e) => out.add(stem + e))
  const softened = (stem: string) => SOFTEN.filter(([re]) => re.test(stem)).map(([re, to]) => stem.replace(re, to))
  const last = word.slice(-1)
  if (last === 'y' || last === 'i') {
    // przymiotnik albo liczba mnoga: Główny → Głównego, Wielkopolski → Wielkopolskim, Oborniki → Obornikach
    add(word.slice(0, -1), ['y', 'i', 'ego', 'iego', 'emu', 'iemu', 'ym', 'im', 'ych', 'ich', 'ach', ''])
  } else if (last === 'a') {
    // Kłodawa → Kłodawie, Września → Wrześni, Piła Główna → Pile Głównej
    const stem = word.slice(0, -1)
    add(stem, ['a', 'y', 'i', 'e', 'ie', 'ej', 'iej', 'o', 'ach', 'om', ...(stem.endsWith('i') ? [''] : [])])
    softened(stem).forEach((s) => add(s, ['e', 'ie']))
  } else if (last === 'o' || last === 'e') {
    // Koło → Kole, Gniezno → Gnieźnie, Kutno → Kutna
    const stem = word.slice(0, -1)
    add(stem, ['o', 'e', 'a', 'u', 'em', 'ie', 'om', 'ach'])
    softened(stem).forEach((s) => add(s, ['e', 'ie']))
  } else {
    // Konin → Konina, Koninie; Poznań → Poznaniu; Wągrowiec → Wągrowca (ruchome „e”)
    add(word, ['a', 'u', 'owi', 'em', 'ie', 'iu', 'ia', 'y', 'i', 'e', 'ach'])
    if (/e[kc]$/.test(word)) add(word.replace(/i?e([kc])$/, '$1'), ['a', 'u', 'iem', 'em', 'ach', 'i', 'y'])
  }
  return out
}

/** słowo z tekstu; `end` bez kropki, `dotEnd` z kropką skrótu („Gł.”) */
type Token = { norm: string; start: number; end: number; dotEnd: number; upper: boolean }

function tokens(text: string): Token[] {
  return [...text.matchAll(/(\p{L}+)(\.?)/gu)].map((m) => ({
    norm: normalize(m[1]),
    start: m.index,
    end: m.index + m[1].length,
    dotEnd: m.index + m[0].length,
    upper: /^\p{Lu}/u.test(m[1]),
  }))
}

const formsCache = new Map<string, Set<string>>()
/** Czy słowo z tekstu to słowo z nazwy stacji: 'abbr' — skrót (koniec razem z kropką), 'word' — pełne albo odmienione. */
function wordMatches(nameWord: string, token: Token): 'abbr' | 'word' | false {
  if (token.norm === nameWord) return 'word'
  if (ABBREVIATIONS.some(([re, abbr]) => re.test(nameWord) && abbr.includes(token.norm))) return 'abbr'
  let forms = formsCache.get(nameWord)
  if (!forms) formsCache.set(nameWord, (forms = wordForms(nameWord)))
  return forms.has(token.norm) ? 'word' : false
}

type StationHit<S> = { station: S; start: number; end: number; form: string }

/**
 * Każde miejsce w tekście, w którym pada nazwa stacji — także w odmianie i ze skrótami („Poznania Gł.”, „w Kole”). Nazwa musi
 * zaczynać się wielką literą („koło dworca” to nie stacja Koło); dłuższa nazwa wygrywa: „Konin Zachód” nie dodaje „Konin”.
 */
function stationHits<S extends Pick<StationRef, 'id' | 'name'>>(text: string, stations: S[]): StationHit<S>[] {
  const toks = tokens(text)
  const used = new Set<number>()
  const hits: StationHit<S>[] = []
  for (const station of [...stations].sort((a, b) => b.name.length - a.name.length)) {
    const words = normalize(station.name).split(/[\s-]+/).filter(Boolean)
    if (!words.length || words.join('').length < 3) continue
    for (let i = 0; i + words.length <= toks.length; i++) {
      if (!toks[i].upper) continue
      let match: 'abbr' | 'word' | false = 'word'
      for (let k = 0; k < words.length && match; k++) match = !used.has(i + k) && wordMatches(words[k], toks[i + k])
      if (!match) continue
      for (let k = 0; k < words.length; k++) used.add(i + k)
      const lastTok = toks[i + words.length - 1]
      const start = toks[i].start
      const end = match === 'abbr' ? lastTok.dotEnd : lastTok.end
      hits.push({ station, start, end, form: text.slice(start, end) })
    }
  }
  return hits.sort((a, b) => a.start - b.start)
}

export interface StationMention<S> {
  station: S
  /** formy z tekstu, np. „Konin”, „z Konina” → [„Konin”, „Konina”] */
  forms: string[]
  start: number
}

/** Stacje wymienione w tekście (każda raz, z formami, w jakich padła), w kolejności z tekstu. */
export function findStationMentions<S extends Pick<StationRef, 'id' | 'name'>>(text: string, stations: S[]): StationMention<S>[] {
  const found = new Map<string, StationMention<S>>()
  for (const h of stationHits(text, stations)) {
    const m = found.get(h.station.id)
    if (!m) found.set(h.station.id, { station: h.station, forms: [h.form], start: h.start })
    else if (!m.forms.includes(h.form)) m.forms.push(h.form)
  }
  return [...found.values()]
}

// --- pociągi

export interface NumberHit { value: string; start: number; end: number }

/** Numery pociągów (4–6 cyfr, także „77610/1”) poza datami, godzinami i latami; `years` — odrzucone lata (do „Pominięto”). */
export function findTrains(text: string): { trains: NumberHit[]; years: NumberHit[] } {
  const trains: NumberHit[] = []
  const years: NumberHit[] = []
  for (const m of text.matchAll(/(?<![\d.:,/-])\d{4,6}(?:\/\d{1,6})?(?!\d|[.:,/-]\d)/g)) {
    const hit = { value: m[0], start: m.index, end: m.index + m[0].length }
    if (/^(19|20)\d\d$/.test(m[0])) years.push(hit)
    else trains.push(hit)
  }
  return { trains, years }
}

// --- daty

const MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'wrzesnia', 'pazdziernika', 'listopada', 'grudnia']
const M = MONTHS.join('|')
/** dzień, opcjonalnie miesiąc (liczbą albo słownie) i rok */
const DATE = `(\\d{1,2})(?:\\s*\\.\\s*(\\d{1,2})(?:\\s*\\.\\s*(\\d{4}|\\d{2}))?|\\s+(${M})(?:\\s+(\\d{4}))?)?`
/** data z miesiącem */
const DATE_FULL = `(\\d{1,2})(?:\\s*\\.\\s*(\\d{1,2})(?:\\s*\\.\\s*(\\d{4}|\\d{2}))?|\\s+(${M})(?:\\s+(\\d{4}))?)`
const YEAR_SUFFIX = '(?:\\s*r\\.?)?'
const RANGE = new RegExp(`(?<![\\d:.,/])(?:\\bod\\s+(?:dnia\\s+)?|\\bw dniach\\s+|\\bw terminie\\s+)?${DATE}${YEAR_SUFFIX}\\s*(?:[-–—]|\\bdo\\s+(?:dnia\\s+)?)\\s*${DATE_FULL}${YEAR_SUFFIX}(?![\\d:])`, 'g')
const FROM = new RegExp(`(?<![\\d:.,/])\\bod\\s+(?:dnia\\s+)?${DATE_FULL}${YEAR_SUFFIX}(?![\\d:])`, 'g')
const SINGLE = new RegExp(`(?<![\\d:.,/])${DATE_FULL}${YEAR_SUFFIX}(?![\\d:])`, 'g')
/** data wydania komunikatu, nie okres utrudnień */
const ISSUED = /(z dnia|z dn\.|aktualizacj\w*|opublikowan\w*|publikacji|wydan\w*|stan na)\s*:?\s*$/

export interface Period {
  /** RRRR-MM-DD */
  from: string
  /** RRRR-MM-DD; null — „do odwołania” */
  to: string | null
  /** fragment tekstu, z którego wzięto okres */
  text: string
  start: number
  end: number
}

type Parts = { day: number; month: number | null; year: number | null }
function parts(g: (string | undefined)[]): Parts {
  const [d, mNum, yNum, mName, yName] = g
  const month = mNum ? Number(mNum) : mName ? MONTHS.indexOf(mName) + 1 : null
  const y = yNum ?? yName
  return { day: Number(d), month, year: y ? (y.length === 2 ? 2000 + Number(y) : Number(y)) : null }
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
function valid(y: number, m: number, d: number): boolean {
  const date = new Date(y, m - 1, d)
  return m >= 1 && m <= 12 && date.getMonth() === m - 1 && date.getDate() === d
}
/** Rok domyślny: bieżący, a gdy data wypadłaby dawno temu (ponad 4 miesiące) — następny. */
function inferYear(m: number, d: number, today: Date): number {
  const y = today.getFullYear()
  return new Date(y, m - 1, d).getTime() < today.getTime() - 120 * 86_400_000 ? y + 1 : y
}

/** Okres utrudnień z tekstu: „od 3 do 16 listopada 2026 r.”, „3–16.11.2026”, „od 3.11 do 16.11”, „od 3 listopada”, „3 listopada”. */
export function findPeriod(text: string, today = new Date()): Period | null {
  const hay = normalize(text).replace(/ /g, ' ')
  const issued = (at: number) => ISSUED.test(hay.slice(Math.max(0, at - 24), at))
  for (const m of hay.matchAll(RANGE)) {
    if (issued(m.index)) continue
    const a = parts(m.slice(1, 6))
    const b = parts(m.slice(6, 11))
    if (!b.month) continue
    const by = b.year ?? inferYear(b.month, b.day, today)
    let am = a.month ?? b.month
    if (!a.month && a.day > b.day) am = b.month - 1 || 12
    // „od 30 grudnia do 4 stycznia” — początek rok wcześniej
    const ay = a.year ?? (am > b.month ? by - 1 : by)
    if (!valid(ay, am, a.day) || !valid(by, b.month, b.day)) continue
    const from = iso(ay, am, a.day)
    const to = iso(by, b.month, b.day)
    if (to < from) continue
    return { from, to, text: text.slice(m.index, m.index + m[0].length).trim(), start: m.index, end: m.index + m[0].length }
  }
  for (const re of [FROM, SINGLE]) {
    for (const m of hay.matchAll(re)) {
      if (issued(m.index)) continue
      const p = parts(m.slice(1, 6))
      if (!p.month) continue
      const y = p.year ?? inferYear(p.month, p.day, today)
      if (!valid(y, p.month, p.day)) continue
      const day = iso(y, p.month, p.day)
      return { from: day, to: re === FROM ? null : day, text: text.slice(m.index, m.index + m[0].length).trim(), start: m.index, end: m.index + m[0].length }
    }
  }
  return null
}

/** Daty, które nie są okresem utrudnień (np. „z dnia 23.10.2026”) — do „Pominięto”. */
export function issuedDates(text: string): NumberHit[] {
  const hay = normalize(text)
  const out: NumberHit[] = []
  for (const m of hay.matchAll(SINGLE)) {
    if (ISSUED.test(hay.slice(Math.max(0, m.index - 24), m.index))) {
      out.push({ value: text.slice(m.index, m.index + m[0].length).trim(), start: m.index, end: m.index + m[0].length })
    }
  }
  return out
}

// --- rodzaj, tytuł i treść

const DANGER = /odwoł\w*|zastępcz\w* komunikacj\w*|komunikacj\w* zastępcz\w*|autobus\w* (?:za|zamiast) pociąg\w*|zastąpi\w*|zamknięc\w*|zamknięt\w*|wstrzyma\w*|nie (?:będzie |będą )?kursuj\w*|nie (?:będzie|będą) kursowa\w*/i
const WARNING = /opóźni\w*|zmian\w* peron\w*|peron\w*|torze|skrócon\w*|skróc\w*|zmian\w* (?:rozkładu|godzin|kursowania)|utrudnie\w*|objazd\w*/i

/** Podpowiedź rodzaju komunikatu z treści i fraza, która o tym zdecydowała. */
export function suggestSeverity(text: string): { value: Severity; reason: string | null } {
  const d = DANGER.exec(text)
  if (d) return { value: 'danger', reason: d[0] }
  const w = WARNING.exec(text)
  if (w) return { value: 'warning', reason: w[0] }
  return { value: 'info', reason: null }
}

const BULLET_IN = /^\s*[-–—•·▪●◦*]\s*/

/** Tytuł z pierwszego wiersza (bez „na odcinku”, kropki na końcu, najwyżej 160 znaków), treść z reszty; listy jako „- ”. */
export function splitTitle(text: string): { title: string; body: string } {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim())
  const first = lines.findIndex(Boolean)
  if (first < 0) return { title: '', body: '' }
  const head = lines[first]
  const rest = lines.slice(first + 1)
  const separate = rest.some(Boolean) && head.length <= 160 && !/[.!?:]$/.test(head)
  let title = separate ? head : (/^[^.!?]{10,}[.!?]/.exec(head)?.[0] ?? head)
  title = title.replace(/\s+na odcinku\s+/i, ' ').replace(/[.:]$/, '').trim()
  if (title.length > 160) title = `${title.slice(0, 157).replace(/\s+\S*$/, '')}…`
  const bodyLines = (separate ? rest : lines.slice(first)).map((l) => (BULLET_IN.test(l) ? `- ${l.replace(BULLET_IN, '').replace(/[,;]$/, '')}` : l))
  const body = bodyLines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return { title, body }
}

/** Linie, na których leżą wszystkie podane stacje (bez węzła Poznań Gł.), od najkrótszej — najwyżej 3; dla jednej stacji żadna. */
export function suggestLines(stationNames: string[]): string[] {
  const names = stationNames.filter((n) => n !== HUB_STATION)
  if (names.length < 2) return []
  return NOTICE_LINES.filter((l) => names.every((n) => l.stations.includes(n)))
    .sort((a, b) => a.stations.length - b.stations.length)
    .slice(0, 3)
    .map((l) => l.id)
}

// --- całość: „Wklej od przewoźnika”

export type MarkKind = 'date' | 'train' | 'station' | 'skip'
export interface Mark { start: number; end: number; kind: MarkKind }

export interface NoticeAnalysis<S> {
  title: string
  body: string
  period: Period | null
  severity: { value: Severity; reason: string | null }
  stations: (StationMention<S> & { hub: boolean })[]
  trains: string[]
  lines: string[]
  skipped: { text: string; why: string }[]
  marks: Mark[]
}

export function analyzeNotice<S extends Pick<StationRef, 'id' | 'name'>>(text: string, stations: S[], today = new Date()): NoticeAnalysis<S> {
  const { title, body } = splitTitle(text)
  const period = findPeriod(text, today)
  const hits = stationHits(text, stations)
  const mentions = findStationMentions(text, stations)
  const { trains, years: foundYears } = findTrains(text)
  const issued = issuedDates(text)
  // rok w okresie („listopada 2026 r.”) to część daty, nie pominięty numer
  const years = foundYears.filter((y) => !period || y.end <= period.start || y.start >= period.end)
  const numbers: string[] = []
  for (const t of trains) for (const n of splitNumbers(t.value)) if (!numbers.includes(n)) numbers.push(n)

  const marks: Mark[] = [
    ...(period ? [{ start: period.start, end: period.end, kind: 'date' as const }] : []),
    ...trains.map((t) => ({ start: t.start, end: t.end, kind: 'train' as const })),
    ...hits.map((s) => ({ start: s.start, end: s.end, kind: 'station' as const })),
    ...[...issued, ...years].map((s) => ({ start: s.start, end: s.end, kind: 'skip' as const })),
  ]
  // bez nakładania się: pierwszeństwo ma wcześniejszy, potem dłuższy
  marks.sort((a, b) => a.start - b.start || b.end - a.end)
  const clean: Mark[] = []
  for (const m of marks) if (!clean.length || m.start >= clean[clean.length - 1].end) clean.push(m)

  return {
    title,
    body,
    period,
    severity: suggestSeverity(text),
    stations: mentions.map((m) => ({ ...m, hub: m.station.name === HUB_STATION && mentions.length > 1 })),
    trains: numbers.slice(0, 40),
    lines: suggestLines(mentions.map((m) => m.station.name)),
    skipped: [...issued.map((d) => ({ text: d.value, why: 'data wydania' })), ...years.map((y) => ({ text: y.value, why: 'rok' }))],
    marks: clean,
  }
}

/** Tekst pocięty na kawałki do podświetlenia (wstawiane jako tekst, bez HTML). */
export function segments(text: string, marks: Mark[]): { text: string; kind: MarkKind | null }[] {
  const out: { text: string; kind: MarkKind | null }[] = []
  let at = 0
  for (const m of marks) {
    if (m.start > at) out.push({ text: text.slice(at, m.start), kind: null })
    out.push({ text: text.slice(m.start, m.end), kind: m.kind })
    at = m.end
  }
  if (at < text.length) out.push({ text: text.slice(at), kind: null })
  return out
}

// --- publikacja względem okresu utrudnień

/** „RRRR-MM-DDTGG:MM” w czasie lokalnym (format pól panelu i API). */
export function localStamp(d: Date): string {
  return `${iso(d.getFullYear(), d.getMonth() + 1, d.getDate())}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Początek publikacji N dni przed utrudnieniem, o 18:00; gdy to już minęło — pusty (od razu). */
export function publishBefore(from: string, days: number, now = new Date()): string {
  const [y, m, d] = from.split('-').map(Number)
  const at = new Date(y, m - 1, d - days, 18, 0)
  return at.getTime() <= now.getTime() ? '' : localStamp(at)
}

/** Koniec publikacji: ostatni dzień utrudnień, 23:59. */
export const publishUntil = (to: string) => `${to}T23:59`
