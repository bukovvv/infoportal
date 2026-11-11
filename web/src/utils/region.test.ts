import { describe, expect, it } from 'vitest'
import { REGIONS, regionFromPath, regionPath, storageKey } from './region'

describe('region', () => {
  it('rozpoznaje region z adresu', () => {
    expect(regionFromPath('/').id).toBe('wielkopolska')
    expect(regionFromPath('/odjazdy/30601').id).toBe('wielkopolska')
    expect(regionFromPath('/malopolska').id).toBe('malopolska')
    expect(regionFromPath('/malopolska/odjazdy/80416').id).toBe('malopolska')
    // tylko cały segment adresu
    expect(regionFromPath('/malopolskaxyz').id).toBe('wielkopolska')
  })

  it('buduje adresy w regionie', () => {
    expect(regionPath('/', REGIONS.wielkopolska)).toBe('/')
    expect(regionPath('/', REGIONS.malopolska)).toBe('/malopolska')
    expect(regionPath('/mapa', REGIONS.malopolska)).toBe('/malopolska/mapa')
    expect(regionPath('odjazdy', REGIONS.wielkopolska)).toBe('/odjazdy')
  })

  it('osobne klucze pamięci dla danych pasażera w innym regionie', () => {
    expect(storageKey('kw_routes', REGIONS.wielkopolska)).toBe('kw_routes')
    expect(storageKey('kw_routes', REGIONS.malopolska)).toBe('kw_routes@malopolska')
    expect(storageKey('kw_favorite_stations', REGIONS.malopolska)).toBe('kw_favorite_stations@malopolska')
    // ustawienia i motyw wspólne
    expect(storageKey('kw_prefs', REGIONS.malopolska)).toBe('kw_prefs')
    expect(storageKey('kw_theme', REGIONS.malopolska)).toBe('kw_theme')
  })
})
