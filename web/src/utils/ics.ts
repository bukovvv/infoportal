// Plik kalendarza (.ics, RFC 5545) dla połączenia: jedno wydarzenie od odjazdu do przyjazdu z opisem odcinków.
import type { Connection } from '@/api/types'
import { trainLabel } from './agency'
import { clock } from './format'

/** Czas UTC w formacie iCalendar: 20261014T145400Z. */
const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** Znaki specjalne w tekście (przecinek, średnik, ukośnik, nowa linia). */
const text = (value: string) => value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Linie dłuższe niż 75 bajtów zawijamy (kontynuacja zaczyna się spacją). */
function fold(line: string) {
  const bytes = new TextEncoder()
  const out: string[] = []
  let current = ''
  for (const ch of line) {
    if (bytes.encode(current + ch).length > 75) {
      out.push(current)
      current = ' ' + ch
    } else {
      current += ch
    }
  }
  return [...out, current].join('\r\n')
}

export function connectionIcs(c: Connection, url: string, now = new Date()) {
  const first = c.legs[0]
  const last = c.legs[c.legs.length - 1]
  const description = c.legs.map((l, i) => {
    const platform = l.platform ? `, peron ${l.platform}` : ''
    const wait = i < c.legs.length - 1 ? `\nPrzesiadka w ${l.to.name}: ${c.waits[i]} min` : ''
    return `${clock(l.departure)} ${l.from.name} → ${clock(l.arrival)} ${l.to.name}: ${l.isBus ? 'autobus' : 'pociąg'} ${trainLabel(l)}${platform}${wait}`
  }).join('\n') + `\n\nSprawdź opóźnienia: ${url}`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//zanimwyjdziesz.pl//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${c.legs.map((l) => l.key).join('+').replace(/[^\w@.+-]/g, '')}@zanimwyjdziesz.pl`,
    `DTSTAMP:${utc(now.toISOString())}`,
    `DTSTART:${utc(c.departure)}`,
    `DTEND:${utc(c.arrival)}`,
    `SUMMARY:${text(`Pociąg ${first.from.name} → ${last.to.name}`)}`,
    `LOCATION:${text(first.from.name + (first.platform ? `, peron ${first.platform}` : ''))}`,
    `DESCRIPTION:${text(description)}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${text(`Za 15 minut odjazd z ${first.from.name}`)}`,
    'TRIGGER:-PT15M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}

/** Pobiera plik .ics (telefon proponuje dodanie do kalendarza). */
export function downloadIcs(c: Connection, url: string) {
  const blob = new Blob([connectionIcs(c, url)], { type: 'text/calendar;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `podroz-${c.legs[0].from.name}-${c.legs[c.legs.length - 1].to.name}.ics`.replace(/\s+/g, '-')
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000)
}
