import { describe, expect, it } from 'vitest'
import { agencyCode, agencyName, isPartner, trainLabel } from './agency'

describe('agency', () => {
  it('rozróżnia KW i POLREGIO (brak pola = KW)', () => {
    expect(isPartner('PR')).toBe(true)
    expect(isPartner('KW')).toBe(false)
    expect(isPartner(undefined)).toBe(false)
    expect(agencyCode(undefined)).toBe('KW')
    expect(agencyName('PR')).toBe('POLREGIO')
    expect(trainLabel({ agency: 'PR', number: '85724' })).toBe('PR 85724')
    expect(trainLabel({ number: '77600/1' })).toBe('KW 77600/1')
  })
})
