import { describe, expect, it } from 'vitest'
import { agencyCode, agencyName, isPartner, trainLabel, trainTitle } from './agency'

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

  it('pokazuje nazwę pociągu raz', () => {
    expect(trainTitle('71214 Powstaniec Wielkopolski', 'POWSTANIEC WIELKOPOLSKI')).toEqual({ number: '71214', name: 'Powstaniec Wielkopolski' })
    expect(trainTitle('70406/7 Rusałka', 'RUSAŁKA')).toEqual({ number: '70406/7', name: 'Rusałka' })
    expect(trainTitle('77600', 'PKM1')).toEqual({ number: '77600', name: null })
    expect(trainTitle('77600/1', null)).toEqual({ number: '77600/1', name: null })
    expect(trainTitle('85724', 'Kopernik')).toEqual({ number: '85724', name: 'Kopernik' })
  })
})
