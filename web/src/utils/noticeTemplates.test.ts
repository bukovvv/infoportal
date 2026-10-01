import { describe, expect, it } from 'vitest'
import { buildNotice, minutesText } from './noticeTemplates'

const route = { train: '77642', origin: 'Poznań Główny', departure: '07:44', destination: 'Mogilno', arrival: '09:05' }

describe('generator komunikatów', () => {
  it('odmienia minuty', () => {
    expect(minutesText(1)).toBe('1 minutę')
    expect(minutesText(3)).toBe('3 minuty')
    expect(minutesText(13)).toBe('13 minut')
    expect(minutesText(24)).toBe('24 minuty')
    expect(minutesText(50)).toBe('50 minut')
  })

  it('tworzy komunikat o opóźnieniu z numerem pociągu', () => {
    const n = buildNotice({ kind: 'delay', ...route, delay: 22, reason: 'z przyczyn technicznych', replacement: true })
    expect(n.title).toBe('Pociąg 77642 opóźniony o około 22 minuty')
    expect(n.line).toBe('Poznań Główny – Mogilno')
    expect(n.body).toContain('relacji Poznań Główny (07:44) – Mogilno (09:05) jest opóźniony o około 22 minuty z przyczyn technicznych.')
    expect(n.body).toContain('skład zastępczy')
    expect(n.severity).toBe('warning')
    expect(n.trains).toEqual(['77642'])
  })

  it('odwołanie jest poważnym utrudnieniem', () => {
    expect(buildNotice({ kind: 'cancellation', ...route }).severity).toBe('danger')
  })

  it('zmiana peronu wymaga stacji, godziny i peronu', () => {
    expect(() => buildNotice({ kind: 'platform', train: '77642', station: 'Poznań Główny' })).toThrow('Uzupełnij')
    const n = buildNotice({ kind: 'platform', train: '77642', station: 'Poznań Główny', eventTime: '07:44', platform: '4', track: '12' })
    expect(n.body).toContain('z peronu 4, tor 12')
    expect(n.line).toBe('Poznań Główny')
  })

  it('skrócona relacja opisuje nieobsłużony odcinek', () => {
    const n = buildNotice({ kind: 'shortened', ...route, newDestination: 'Gniezno' })
    expect(n.line).toBe('Poznań Główny – Gniezno')
    expect(n.body).toContain('nie obsłuży odcinka Gniezno – Mogilno')
  })
})
