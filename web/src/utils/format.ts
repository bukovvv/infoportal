// Formatowanie czasu zawsze w strefie Europe/Warsaw, niezależnie od ustawień urządzenia.
const TZ = 'Europe/Warsaw'
const timeFmt = new Intl.DateTimeFormat('pl-PL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
const dateFmt = new Intl.DateTimeFormat('pl-PL', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'long' })
const dateTimeFmt = new Intl.DateTimeFormat('pl-PL', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const weekdayFmt = new Intl.DateTimeFormat('pl-PL', { timeZone: TZ, weekday: 'short' })
const partsFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

export const clock = (iso: string | null | undefined) => (iso ? timeFmt.format(new Date(iso)) : '–')
export const dayLabel = (iso: string | Date) => dateFmt.format(typeof iso === 'string' ? new Date(iso) : iso)
export const weekdayShort = (iso: string) => weekdayFmt.format(new Date(iso))
export const dateTime = (iso: string | null | undefined) => (iso ? dateTimeFmt.format(new Date(iso)) : '–')

/** Data i godzina w Warszawie: { date: 'RRRR-MM-DD', time: 'GG:MM' }. */
export function warsawNow(at: Date = new Date()) {
  const p = Object.fromEntries(partsFmt.formatToParts(at).map((x) => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` }
}

export function plural(n: number, one: string, few: string, many: string) {
  const n10 = n % 10
  const n100 = n % 100
  if (n === 1) return one
  return n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14) ? few : many
}

export function duration(minutes: number) {
  const m = Math.max(0, Math.round(minutes))
  const h = Math.floor(m / 60)
  const r = m % 60
  return h ? `${h} godz.${r ? ` ${r} min` : ''}` : `${r} min`
}

/** „za 5 min”, „za 1 godz. 10 min”, „teraz”. */
export function relative(minutes: number) {
  const m = Math.round(minutes)
  if (m <= 0) return 'teraz'
  return `za ${duration(m)}`
}

export const minutesUntil = (iso: string, now = Date.now()) => (new Date(iso).getTime() - now) / 60000

export function normalize(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L').toLowerCase().trim()
}

/** „77610/1” → ['77610', '77611'] (jak GtfsImporter::splitNumbers). */
export function splitNumbers(value: string): string[] {
  const parts = value.split('/').map((p) => p.trim()).filter(Boolean)
  if (!parts.length) return []
  const base = parts[0]
  return [...new Set([base, ...parts.slice(1).map((p) => (p.length < base.length ? base.slice(0, base.length - p.length) + p : p))])]
}

export function delayLabel(delay: number | null | undefined) {
  if (delay === null || delay === undefined) return null
  if (delay <= 0) return delay < 0 ? `${delay} min` : 'planowo'
  return `+${delay} min`
}
