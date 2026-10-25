import { describe, expect, it } from 'vitest'
import { PREF_DEFAULTS, sanitize } from './prefs'

describe('ustawienia pasażera', () => {
  it('brak zapisu — domyślne', () => {
    expect(sanitize(null)).toEqual(PREF_DEFAULTS)
  })

  it('poprawne wartości zostają, spoza listy wracają do domyślnych', () => {
    expect(sanitize({ showPunctuality: false, punctualityDays: 90, onTimeMinutes: 3, connectionNotices: 'alerts' }))
      .toEqual({ showPunctuality: false, punctualityDays: 90, onTimeMinutes: 3, connectionNotices: 'alerts' })
    expect(sanitize({ showPunctuality: 'tak', punctualityDays: 14, onTimeMinutes: '5', connectionNotices: 'x' })).toEqual(PREF_DEFAULTS)
  })
})
