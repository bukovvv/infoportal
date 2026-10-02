// Taryfa wspólnego biletu Bus-Tramwaj-Kolej (KW + POLREGIO + ZTM Poznań).
// Źródła: warunki taryfowe BTK od 1.09.2025 (POLREGIO), strona oferty KW, komunikat POLREGIO o strefie D + WTR Czempiń od 1.09.2026.
// Przy zmianie cen: podmienić FARES i TARIFF_DATE — test sprawdza, że ulgi wynikają z ceny normalnej.
import { normalize } from './format'

export const TARIFF_DATE = '1 września 2026'

export type RailZone = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
export type ZtmZone = 'A' | 'A+B' | 'A+C' | 'A+B+C'
export type Discount = 'normal' | 'u49' | 'u51'
/** Dodatkowa komunikacja dołączana do biletu: MPK Gniezno (tylko strefa F), przewozy gminne PKS w Czempiniu (tylko strefa D). */
export type Extra = 'gniezno' | 'czempin'

export const RAIL_ZONES: RailZone[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
export const ZTM_ZONES: ZtmZone[] = ['A', 'A+B', 'A+C', 'A+B+C']

export const DISCOUNTS: { value: Discount; label: string; short: string; who: string }[] = [
  { value: 'normal', label: 'Normalny', short: 'Normalny', who: 'Każda osoba' },
  { value: 'u49', label: 'Ulga 49%', short: '49%', who: 'Uczniowie, do 24. roku życia' },
  { value: 'u51', label: 'Ulga 51%', short: '51%', who: 'Studenci do 26. roku życia, doktoranci do 35.' },
]

export interface FareRow {
  rail: RailZone
  extra?: Extra
  /** cena w groszach: [normalny, ulga 49%, ulga 51%] */
  prices: Partial<Record<ZtmZone, [number, number, number]>>
}

export const FARES: FareRow[] = [
  { rail: 'B', prices: { A: [27600, 14076, 13524], 'A+B': [30200, 15402, 14798], 'A+B+C': [35700, 18207, 17493] } },
  { rail: 'C', prices: { A: [34800, 17748, 17052], 'A+B': [38500, 19635, 18865], 'A+C': [37900, 19329, 18571], 'A+B+C': [42800, 21828, 20972] } },
  { rail: 'D', prices: { A: [39100, 19941, 19159], 'A+B': [42800, 21828, 20972] } },
  { rail: 'D', extra: 'czempin', prices: { A: [46100, 23511, 22589], 'A+B': [49800, 25398, 24402] } },
  { rail: 'E', prices: { A: [42200, 21522, 20678], 'A+B': [45900, 23409, 22491] } },
  { rail: 'F', prices: { A: [44100, 22491, 21609], 'A+B': [47800, 24378, 23422] } },
  { rail: 'F', extra: 'gniezno', prices: { A: [51100, 26061, 25039], 'A+B': [54800, 27948, 26852] } },
  { rail: 'G', prices: { A: [47800, 24378, 23422], 'A+B': [51500, 26265, 25235] } },
]

export const EXTRAS: Record<Extra, { rail: RailZone; label: string; hint: string }> = {
  gniezno: { rail: 'F', label: 'Z komunikacją miejską MPK Gniezno', hint: 'Autobusy miejskie w Gnieźnie' },
  czempin: { rail: 'D', label: 'Z przewozami gminnymi w Czempiniu', hint: 'Autobusy PKS w Poznaniu na terenie gminy Czempiń (od 1.09.2026). Na razie do kupienia tylko w kasach KW.' },
}

/** Stacje i przystanki kolejowe w strefach (strefa A: wszystkie stacje w Poznaniu oraz Kiekrz). */
export const RAIL_STATIONS: Record<RailZone, string[]> = {
  A: ['Poznań Główny', 'Poznań Antoninek', 'Poznań Dębiec', 'Poznań Dębina', 'Poznań Garbary', 'Poznań Górczyn', 'Poznań Junikowo', 'Poznań Karolin',
    'Poznań Krzesiny', 'Poznań Podolany', 'Poznań Starołęka', 'Poznań Strzeszyn', 'Poznań Wola', 'Poznań Wschód', 'Kiekrz'],
  B: ['Czerwonak', 'Czerwonak Osiedle', 'Gądki', 'Ligowiec', 'Luboń k/Poznania', 'Rokietnica', 'Swarzędz', 'Wiry', 'Złotkowo', 'Złotniki', 'Złotniki Grzybowe'],
  C: ['Biskupice Wlkp.', 'Bolechowo', 'Buk', 'Chludowo', 'Dopiewo', 'Drużyna Poznańska', 'Golęczewo', 'Gułtowy', 'Iłowiec', 'Kobylnica', 'Kostrzyn Wlkp.',
    'Kórnik', 'Łopuchowo', 'Łopuchowo Osiedle', 'Mosina', 'Murowana Goślina', 'Otusz', 'Owińska', 'Paczkowo', 'Palędzie', 'Pierzchno', 'Pobiedziska',
    'Pobiedziska Letnisko', 'Promno', 'Przebędowo', 'Puszczykowo', 'Puszczykówko', 'Stęszew', 'Strykowo', 'Szreniawa', 'Trzebaw Rosnówko', 'Zielone Wzgórza'],
  D: ['Baborówko', 'Bogdanowo', 'Czempiń', 'Fałkowo', 'Granowo', 'Kotowo', 'Lednogóra', 'Nekla', 'Oborniki Wlkp.', 'Oborniki Wlkp. Miasto', 'Oborzyska Stare',
    'Opalenica', 'Pamiątkowo', 'Parkowo', 'Porażyn', 'Ptaszkowo Wlkp.', 'Roszkowo Wągrowieckie', 'Rożnowo', 'Skoki', 'Sława Wlkp.', 'Sulęcinek', 'Szamotuły',
    'Środa Wlkp.', 'Wargowo', 'Wojnowice Wlkp.'],
  E: ['Grąblewo', 'Grodzisk Wlkp.', 'Kościan', 'Pęckowo', 'Pierzyska', 'Podstolice', 'Przysieczyn', 'Przysieka Stara', 'Rogoźno Wlkp.', 'Sątopy', 'Solec Wlkp.',
    'Stare Bojanowo', 'Tarnowo Rogozińskie'],
  F: ['Chocicza', 'Chwalibogowo', 'Czerniejewo', 'Gębarzewo', 'Gniezno', 'Książno', 'Marzenin', 'Miłosław', 'Mokrz', 'Nowy Tomyśl', 'Obłaczkowo', 'Orzechowo',
    'Wągrowiec', 'Wronki', 'Wronki Zamość', 'Września', 'Żydowo'],
  G: ['Gutowo Wielkopolskie', 'Jankowo Dolne', 'Jarocin', 'Mieszków', 'Otoczna', 'Radlin', 'Słupca', 'Strzałkowo', 'Trzemeszno', 'Wólka', 'Żerków'],
}

/** Miejscowości w strefach ZTM Poznań (dotyczy wyłącznie linii organizowanych przez ZTM). */
export const ZTM_PLACES: Record<'A' | 'B' | 'C', string> = {
  A: 'Miasto Poznań z wyjątkiem przystanku Wielkie.',
  B: 'Babki, Baranowo, Biedrusko, Bogucin, Borówiec, Bylin, Bytkowo, Cerekwica, Chyby, Czapury, Czerwonak, Dachowa, Dalekie, Daszewice, Gądki, Gowarzewo, '
    + 'Gruszczyn, Janikowo, Jaryszki, Jelonek, Kamionki, Kicin, Kiekrz, Kleszczewo, Kobylniki, Komorniki, Komorniki (gm. Kleszczewo), Koninko, Koziegłowy, '
    + 'Krzyszkowo, Luboń, Łęczyca, Mrowino, Nagradowice, Napachanie, Pawłowice, Plewiska, Poznań Wielkie, Przybroda, Przeźmierowo, Robakowo, Rogierówko, '
    + 'Rokietnica, Rostworowo, Skórzewo, Sobota, Starzyny, Suchy Las, Swadzim, Swarzędz, Szczytniki, Szewce, Świątniczki (gm. Kórnik), Tanibórz, Trzek, Tulce, '
    + 'Wiórek, Wiry, Wysogotowo, Zalasewo, Złotkowo, Złotniki, Żerniki, Żydowo.',
  C: 'Annowo, Batorowo, Biernatki, Błażejewko, Błażejewo, Bolechowo, Bolechowo-Osiedle, Bolechówko, Brzezno, Bytyń, Ceradz Dolny, Ceradz Kościelny, Chludowo, '
    + 'Chomęcice, Dąbrowa, Dąbrówka, Dębogóra, Dopiewiec, Dopiewo, Dziećmierowo, Gaj Wielki, Głuchowo, Golęczewo, Gołuski, Góra, Grzebienisko, Jankowice, '
    + 'Karłowice, Kaźmierz, Kliny, Kokoszczyn, Konarzewo, Kórnik, Lisówki, Lusowo, Lusówko, Mielno, Miękowo, Młodasko, Mosina, Murowana Goślina, Otowo, '
    + 'Owińska, Palędzie, Piersko, Potasze, Pólko, Promnice, Prusinowo, Przebędowo, Przecław, Puszczykowo, Rosnowo, Rosnówko, Rumianek, Sady, Sierosław, '
    + 'Skrzynki, Szczodrzykowo, Szlachęcin, Szreniawa, Tarnowo Podgórne, Trzaskowo, Tuczno, Walerianowo, Wierzonka, Witkowice, Zakrzewo, Zielątkowo.',
}

export const ALL_STATIONS: { name: string; zone: RailZone }[] = RAIL_ZONES
  .flatMap((zone) => RAIL_STATIONS[zone].map((name) => ({ name, zone })))
  .sort((a, b) => a.name.localeCompare(b.name, 'pl'))

/** Strefa kolejowa stacji; każda stacja z „Poznań” w nazwie należy do strefy A. */
export function railZoneOf(station: string): RailZone | null {
  const key = normalize(station)
  if (!key) return null
  const hit = ALL_STATIONS.find((s) => normalize(s.name) === key)
  if (hit) return hit.zone
  return key.startsWith('poznan ') ? 'A' : null
}

/** Strefy, w których bilet danej strefy pozwala jechać pociągiem (każda strefa zawiera niższe). */
export function railCoverage(zone: RailZone): string {
  return zone === 'A' ? 'A' : `A–${zone}`
}

export function fareRow(rail: RailZone, extra?: Extra | null): FareRow | undefined {
  return FARES.find((r) => r.rail === rail && (r.extra ?? null) === (extra ?? null))
}

export function ztmOptions(rail: RailZone): ZtmZone[] {
  const row = fareRow(rail)
  return row ? ZTM_ZONES.filter((z) => row.prices[z]) : []
}

/** Cena w groszach albo null, gdy takiego biletu nie ma (np. strefa kolejowa A albo D z ZTM A+C). */
export function farePrice(rail: RailZone, ztm: ZtmZone, discount: Discount, extra?: Extra | null): number | null {
  const tuple = fareRow(rail, extra)?.prices[ztm]
  if (!tuple) return null
  return tuple[DISCOUNTS.findIndex((d) => d.value === discount)]
}

const money = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', minimumFractionDigits: 2 })
export function formatPrice(grosze: number): string {
  return money.format(grosze / 100)
}
