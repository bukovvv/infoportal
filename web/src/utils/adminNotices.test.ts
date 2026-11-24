import { beforeEach, describe, expect, it } from 'vitest'
import type { Notice } from '@/api/types'
import { clearDraft, emptyForm, extendedEnd, noticeState, periodText, reach, readDraft, relativeText, writeDraft } from './adminNotices'

const now = new Date(2026, 9, 25, 19, 0).getTime()
const notice = (over: Partial<Notice> = {}): Notice => ({
  id: 1, title: 'T', body: 'B', line: 'Cała sieć KW', severity: 'warning', trains: [], stations: [], lines: [],
  startsAt: null, endsAt: null, active: true, createdAt: '2026-10-20T10:00:00+02:00', updatedAt: '2026-10-20T10:00:00+02:00', ...over,
})

describe('stan komunikatu', () => {
  it('widoczny, zaplanowany, wygasły, szkic', () => {
    expect(noticeState(notice(), now)).toBe('live')
    expect(noticeState(notice({ startsAt: '2026-11-01T18:00' }), now)).toBe('plan')
    expect(noticeState(notice({ endsAt: '2026-10-25T18:59' }), now)).toBe('past')
    expect(noticeState(notice({ active: false, startsAt: '2026-11-01T18:00' }), now)).toBe('draft')
  })

  it('okres i opis względny', () => {
    const today = new Date(now)
    expect(periodText(notice({ startsAt: '2026-10-25T17:20', endsAt: '2026-10-25T21:00' }), today)).toBe('dziś 17:20 – 21:00')
    expect(periodText(notice({ startsAt: '2026-11-01T00:00', endsAt: '2026-11-16T23:59' }), today)).toBe('1.11 – 16.11')
    expect(periodText(notice(), today)).toBe('bez dat')
    expect(relativeText(notice({ endsAt: '2026-10-25T21:00' }), now)).toBe('wygasa za 2 h')
    expect(relativeText(notice({ startsAt: '2026-11-01T19:00' }), now)).toBe('pokaże się za 7 dni')
    expect(relativeText(notice({ endsAt: '2026-10-20T19:00' }), now)).toBe('wygasł 5 dni temu')
  })

  it('przedłużenie liczy od późniejszego z: końca i teraz', () => {
    expect(extendedEnd(notice({ endsAt: '2026-10-25T21:00' }), 2, now)).toBe('2026-10-25T23:00')
    expect(extendedEnd(notice({ endsAt: '2026-10-24T10:00' }), 24, now)).toBe('2026-10-26T19:00')
  })
})

describe('zasięg', () => {
  it('tablice stacji z linii i ostrzeżenie o Poznaniu Gł.', () => {
    const r = reach({ stations: ['k'], lines: ['kutno'], trains: ['77610'] }, (id) => (id === 'k' ? 'Konin' : id))
    expect(r.boards[0]).toBe('Konin')
    expect(r.boards).toContain('Poznań Główny')
    expect(r.hubViaLine).toBe(true)
    expect(r.trains).toBe(1)
    expect(reach({ stations: ['k'], lines: [], trains: [] }, () => 'Konin').hubViaLine).toBe(false)
  })
})

describe('wersje robocze', () => {
  beforeEach(() => localStorage.clear())
  it('zapis, odczyt i usunięcie po kluczu', () => {
    writeDraft('new', { form: { ...emptyForm(), title: 'A' }, step: 2, savedAt: '2026-10-25T18:00:00Z' })
    writeDraft('7', { form: emptyForm(), step: 1, savedAt: '2026-10-25T18:00:00Z' })
    expect(readDraft('new')?.form.title).toBe('A')
    clearDraft('new')
    expect(readDraft('new')).toBeNull()
    expect(readDraft('7')).not.toBeNull()
    clearDraft('7')
    expect(localStorage.getItem('kw_admin_draft')).toBeNull()
  })
})
