import { beforeEach, describe, expect, it } from 'vitest'
import { importMigratedSettings, MIGRATION_HASH } from './migration'

const at = (data: unknown) => ({ hash: MIGRATION_HASH + encodeURIComponent(JSON.stringify(data)), pathname: '/odjazdy', search: '?stacja=1' })

describe('importMigratedSettings', () => {
  beforeEach(() => localStorage.clear())

  it('zapisuje klucze kw_* i czyści adres', () => {
    expect(importMigratedSettings(at({ kw_theme: '"dark"', kw_favorite_stations: '["1"]' }))).toBe(2)
    expect(localStorage.getItem('kw_favorite_stations')).toBe('["1"]')
    expect(location.hash).toBe('')
    expect(location.pathname + location.search).toBe('/odjazdy?stacja=1')
  })

  it('nie nadpisuje istniejących ustawień i pomija obce klucze', () => {
    localStorage.setItem('kw_theme', '"light"')
    expect(importMigratedSettings(at({ kw_theme: '"dark"', token: 'x', kw_bad: 5 }))).toBe(0)
    expect(localStorage.getItem('kw_theme')).toBe('"light"')
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('ignoruje uszkodzone dane i zwykłe kotwice', () => {
    expect(importMigratedSettings({ hash: MIGRATION_HASH + '%7Bzle', pathname: '/', search: '' })).toBe(0)
    expect(importMigratedSettings({ hash: '#szukaj', pathname: '/', search: '' })).toBe(0)
  })
})
