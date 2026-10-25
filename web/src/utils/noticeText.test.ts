import { describe, expect, it } from 'vitest'
import { analyzeNotice, findPeriod, findStationMentions, findTrains, publishBefore, segments, splitTitle, suggestLines, suggestSeverity } from './noticeText'

const today = new Date(2026, 9, 25, 19, 0)
const ids = (xs: { station: { id: string } }[]) => xs.map((x) => x.station.id)

describe('stacje w tekście', () => {
  const stations = [
    { id: 'konin', name: 'Konin' }, { id: 'konz', name: 'Konin Zachód' }, { id: 'poz', name: 'Poznań Główny' }, { id: 'kost', name: 'Kostrzyn Wielkopolski' },
    { id: 'wrz', name: 'Września' }, { id: 'kolo', name: 'Koło' }, { id: 'klod', name: 'Kłodawa' }, { id: 'kutno', name: 'Kutno' }, { id: 'gn', name: 'Gniezno' },
    { id: 'wag', name: 'Wągrowiec' }, { id: 'sroda', name: 'Środa Wielkopolska' }, { id: 'trz', name: 'Trzcianka' }, { id: 'obor', name: 'Oborniki Wielkopolskie' },
    { id: 'pila', name: 'Piła Główna' }, { id: 'ostr', name: 'Ostrów Wielkopolski' },
  ]

  it('skróty, dłuższa nazwa wygrywa', () => {
    expect(ids(findStationMentions('relacji Konin Zachód – Poznań Gł., przez Kostrzyn Wlkp.', stations))).toEqual(['konz', 'poz', 'kost'])
    expect(ids(findStationMentions('Konin – Września', stations))).toEqual(['konin', 'wrz'])
  })

  it('odmiana nazw', () => {
    const text = 'z Konina do Kutna przez Koło, postój w Kole i Kłodawie, dalej do Poznania Głównego, w Gnieźnie, z Wągrowca, w Środzie Wlkp., w Trzciance, w Obornikach Wlkp., w Pile Głównej, do Ostrowa Wielkopolskiego, we Wrześni'
    const found = findStationMentions(text, stations)
    expect(ids(found)).toEqual(['konin', 'kutno', 'kolo', 'klod', 'poz', 'gn', 'wag', 'sroda', 'trz', 'obor', 'pila', 'ostr', 'wrz'])
    expect(found.find((m) => m.station.id === 'kolo')?.forms).toEqual(['Koło', 'Kole'])
  })

  it('bez fałszywych trafień', () => {
    expect(findStationMentions('postój koło dworca, Koleje Wielkopolskie, w kolei, w środę', stations)).toEqual([])
  })
})

describe('pociągi i daty', () => {
  it('numery bez dat, godzin i lat', () => {
    const { trains, years } = findTrains('W dniach 20.10.2026–23.10.2026 pociąg 77600 (Konin 05:12) i 3410 oraz KW 77600, rok 2026, 77610/1')
    expect(trains.map((t) => t.value)).toEqual(['77600', '3410', '77600', '77610/1'])
    expect(years.map((y) => y.value)).toEqual(['2026'])
  })

  it('okresy', () => {
    expect(findPeriod('od 3 do 16 listopada 2026 r. pociągi', today)).toMatchObject({ from: '2026-11-03', to: '2026-11-16', text: 'od 3 do 16 listopada 2026 r.' })
    expect(findPeriod('w dniach 3–16.11.2026', today)).toMatchObject({ from: '2026-11-03', to: '2026-11-16' })
    expect(findPeriod('od 28.10 do 2.11', today)).toMatchObject({ from: '2026-10-28', to: '2026-11-02' })
    expect(findPeriod('od 28 października do 2 listopada', today)).toMatchObject({ from: '2026-10-28', to: '2026-11-02' })
    expect(findPeriod('od 30 grudnia do 4 stycznia', today)).toMatchObject({ from: '2026-12-30', to: '2027-01-04' })
    expect(findPeriod('od 1 grudnia zmiana rozkładu', today)).toMatchObject({ from: '2026-12-01', to: null })
    expect(findPeriod('W niedzielę 8 listopada pociąg nie kursuje', today)).toMatchObject({ from: '2026-11-08', to: '2026-11-08' })
    // styczeń za ponad 4 miesiące wstecz → przyszły rok
    expect(findPeriod('3 stycznia', today)).toMatchObject({ from: '2027-01-03' })
  })

  it('data wydania to nie okres, godziny to nie daty', () => {
    expect(findPeriod('Informacja z dnia 23.10.2026 r. Odjazd 5.42 i 14:08', today)).toBeNull()
    expect(findPeriod('Informacja z dnia 23.10.2026 r. Utrudnienia 3–4 listopada', today)).toMatchObject({ from: '2026-11-03', to: '2026-11-04' })
  })
})

describe('rodzaj, tytuł, linie', () => {
  it('rodzaj z treści', () => {
    expect(suggestSeverity('pociągi zostaną zastąpione zastępczą komunikacją autobusową')).toMatchObject({ value: 'danger' })
    expect(suggestSeverity('Pociąg 77600 odwołany')).toMatchObject({ value: 'danger', reason: 'odwołany' })
    expect(suggestSeverity('zmiana peronu w Lesznie')).toMatchObject({ value: 'warning' })
    expect(suggestSeverity('Nowe bilety miesięczne')).toEqual({ value: 'info', reason: null })
  })

  it('tytuł z pierwszego wiersza, listy jako „- ”', () => {
    expect(splitTitle('Zastępcza komunikacja autobusowa na odcinku Konin – Kutno\n\nZmiany dotyczą pociągów:\n• 77610 z Konina,\n• 77612 z Konina.\n\n\nPrzepraszamy.')).toEqual({
      title: 'Zastępcza komunikacja autobusowa Konin – Kutno',
      body: 'Zmiany dotyczą pociągów:\n- 77610 z Konina\n- 77612 z Konina.\n\nPrzepraszamy.',
    })
    // jeden akapit: tytuł z pierwszego zdania, treść cała
    expect(splitTitle('Pociąg 77600 odwołany z przyczyn technicznych. Prosimy o wybór innego połączenia.').title).toBe('Pociąg 77600 odwołany z przyczyn technicznych')
  })

  it('linie dla stacji', () => {
    expect(suggestLines(['Konin', 'Koło', 'Kutno', 'Poznań Główny'])).toEqual(['kutno'])
    expect(suggestLines(['Gniezno'])).toEqual([])
  })
})

describe('wklejka od przewoźnika', () => {
  const stations = [{ id: 'konin', name: 'Konin' }, { id: 'kutno', name: 'Kutno' }, { id: 'kolo', name: 'Koło' }, { id: 'poz', name: 'Poznań Główny' }]
  const text = 'Autobusy na odcinku Konin – Kutno\n\nOd 3 do 16 listopada 2026 r. pociągi nr 77610 i 77615 (do Poznania Głównego) zastąpią autobusy, postój w Kole.\nInformacja z dnia 23.10.2026 r.'

  it('rozbiór całości', () => {
    const a = analyzeNotice(text, stations, today)
    expect(a.title).toBe('Autobusy Konin – Kutno')
    expect(a.period).toMatchObject({ from: '2026-11-03', to: '2026-11-16' })
    expect(a.severity.value).toBe('danger')
    expect(a.trains).toEqual(['77610', '77615'])
    expect(a.stations.map((s) => [s.station.id, s.hub])).toEqual([['konin', false], ['kutno', false], ['poz', true], ['kolo', false]])
    expect(a.lines).toEqual(['kutno'])
    expect(a.skipped).toEqual([{ text: '23.10.2026 r.', why: 'data wydania' }])
  })

  it('podświetlenia bez nakładania i całość tekstu w kawałkach', () => {
    const a = analyzeNotice(text, stations, today)
    const parts = segments(text, a.marks)
    expect(parts.map((p) => p.text).join('')).toBe(text)
    expect(parts.filter((p) => p.kind === 'station').map((p) => p.text)).toEqual(['Konin', 'Kutno', 'Poznania Głównego', 'Kole'])
    expect(parts.find((p) => p.kind === 'date')?.text).toBe('Od 3 do 16 listopada 2026 r.')
  })

  it('publikacja przed utrudnieniem', () => {
    expect(publishBefore('2026-11-03', 2, today)).toBe('2026-11-01T18:00')
    expect(publishBefore('2026-10-26', 2, today)).toBe('')
  })
})
