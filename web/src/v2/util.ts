// Wersja 2.0: drobne pomocniki widoków (słowa i kolory jak w makiecie server/v20/app.js), na danych z API 1.0.
import type { Connection, Leg } from '@/api/types'
import { agencyLabel, agencyName, shortNumber } from '@/utils/agency'
import { clock, duration, plural } from '@/utils/format'

export { clock as hm, duration as dur, plural }

/** Linia odcinka: plakietka („PKM2”, „K7”, „KW”, „BUS”), kolor z rozkładu, przewoźnik i numer linii (gdy jest). */
export function lineOf(leg: Pick<Leg, 'route' | 'agency' | 'isBus'>) {
  const short = leg.route?.short || agencyLabel(leg.agency)
  const base = short.replace(/ ?P$/, '') // „K7P” — linia K7 (przyspieszony)
  const named = /^(PKM|SKA|K)\d/.test(base)
  return {
    badge: leg.isBus ? 'BUS' : named ? base : agencyLabel(leg.agency),
    line: named && !leg.isBus ? base : '',
    color: leg.route?.color || '#8A8F98',
    company: agencyName(leg.agency),
  }
}

/** „KW 77600” — przewoźnik i krótki numer (bez nazwy pociągu). */
export const trainShort = (leg: Pick<Leg, 'agency' | 'number'>) => `${agencyLabel(leg.agency)} ${shortNumber(leg.number)}`
/** Nazwa pociągu z numeru („33126/7 Dunajec” → „Dunajec”). */
export const trainName = (number: string) => number.trim().split(/\s+/).slice(1).join(' ')

/** Skrót nazwy stacji jak na tablicach: „Poznań Główny” → „Poznań Gł.”. */
export const short = (name: string) => name.replace(/ Główny$/, ' Gł.').replace(/ Wielkopolski(e)?$/, ' Wlkp.')

export const minutesFrom = (iso: string, now = Date.now()) => Math.round((new Date(iso).getTime() - now) / 60_000)
/** „teraz”, „za 12 min”, „za 1 h 5 min”. */
export const inWords = (m: number) => (m <= 0 ? 'teraz' : `za ${duration(m)}`)
/** Minuty pokazuje koło (do godziny), więc zdanie obok ich nie powtarza. */
export const inDial = (m: number) => m > 0 && m <= 60

export const depDelay = (c: Connection) => c.legs[0].departureDelay ?? 0
export const expDep = (c: Connection) => c.legs[0].expectedDeparture ?? c.departure
export const expArr = (c: Connection) => c.legs.at(-1)!.expectedArrival ?? c.arrival
export const connKey = (c: Connection) => c.legs.map((l) => l.key).join('+')

/** „bez przesiadek”, „1 przesiadka (Poznań Gł.)”, „2 przesiadki”. */
export function transfersText(c: Connection) {
  const n = c.legs.length - 1
  if (!n) return 'bez przesiadek'
  if (n === 1) return `1 przesiadka (${short(c.legs[0].to.name)})`
  return `${n} ${plural(n, 'przesiadka', 'przesiadki', 'przesiadek')}`
}

const DAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota']
const MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia']
const SHORT_DAYS = ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.']
const at = (isoDate: string) => new Date(`${isoDate}T12:00:00`)
/** „piątek, 28 listopada”. */
export const fullDate = (isoDate: string) => { const d = at(isoDate); return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}` }
/** „Dziś”, „Jutro”, „pon. 1.12”. */
export function dayChip(isoDate: string, today: string) {
  const diff = Math.round((at(isoDate).getTime() - at(today).getTime()) / 86_400_000)
  if (diff === 0) return 'Dziś'
  if (diff === 1) return 'Jutro'
  const d = at(isoDate)
  return `${SHORT_DAYS[d.getDay()]} ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}
export function addDays(isoDate: string, n: number) {
  const d = at(isoDate)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
