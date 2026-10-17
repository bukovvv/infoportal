import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS, changedCount, optionsFromQuery, optionsLabel, optionsToApi, optionsToQuery, sanitize } from './searchOptions'

describe('searchOptions', () => {
  it('domyślne opcje nic nie dopisują', () => {
    expect(changedCount(DEFAULT_OPTIONS)).toBe(0)
    expect(optionsLabel(DEFAULT_OPTIONS)).toBe('Opcje')
    expect(optionsToQuery(DEFAULT_OPTIONS)).toEqual({})
    expect(optionsToApi(DEFAULT_OPTIONS)).toEqual({ transfers: undefined, minTransfer: undefined, agencies: undefined })
  })

  it('opisuje zmiany na chipie', () => {
    expect(optionsLabel({ ...DEFAULT_OPTIONS, maxTransfers: 0 })).toBe('Bez przesiadek')
    expect(optionsLabel({ maxTransfers: 1, minTransfer: 10, agencies: ['KW', 'PR'] })).toBe('Opcje · 3')
  })

  it('czyta adres, także dawne bezp=1', () => {
    expect(optionsFromQuery({ z: '1' })).toBeNull()
    expect(optionsFromQuery({ bezp: '1' })?.maxTransfers).toBe(0)
    expect(optionsFromQuery({ przes: '1', minp: '10', przew: 'kw,ic' })).toEqual({ maxTransfers: 1, minTransfer: 10, agencies: ['KW', 'IC'] })
    const o = { maxTransfers: 1 as const, minTransfer: 5, agencies: ['PR'] }
    expect(optionsFromQuery(optionsToQuery(o))).toEqual(o)
  })

  it('poprawia złe wartości', () => {
    expect(sanitize({ maxTransfers: 7 as never, minTransfer: 4, agencies: ['XX'] })).toEqual(DEFAULT_OPTIONS)
    expect(sanitize(null)).toEqual(DEFAULT_OPTIONS)
  })
})
