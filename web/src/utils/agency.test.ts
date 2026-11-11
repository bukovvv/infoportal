import { describe, expect, it } from 'vitest'
import { agencyCode, agencyLabel, agencyName, isIntercity, isPartner, shortNumber, trainLabel, trainTitle } from './agency'

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

  it('rozpoznaje PKP Intercity', () => {
    expect(isIntercity('IC')).toBe(true)
    expect(isIntercity('PR')).toBe(false)
    expect(isPartner('IC')).toBe(true)
    expect(agencyName('IC')).toBe('PKP Intercity')
    expect(trainTitle('45102/3 Flisak', 'FLISAK')).toEqual({ number: '45102/3', name: 'Flisak' })
  })

  it('pokazuje nazwę pociągu raz', () => {
    expect(trainTitle('71214 Powstaniec Wielkopolski', 'POWSTANIEC WIELKOPOLSKI')).toEqual({ number: '71214', name: 'Powstaniec Wielkopolski' })
    expect(trainTitle('70406/7 Rusałka', 'RUSAŁKA')).toEqual({ number: '70406/7', name: 'Rusałka' })
    expect(trainTitle('77600', 'PKM1')).toEqual({ number: '77600', name: null })
    expect(trainTitle('77600/1', null)).toEqual({ number: '77600/1', name: null })
    expect(trainTitle('85724', 'Kopernik')).toEqual({ number: '85724', name: 'Kopernik' })
  })

  it('KML pasażerom jako KMŁ, w danych bez zmian', () => {
    expect(agencyLabel('KML')).toBe('KMŁ')
    expect(agencyCode('KML')).toBe('KML')
    expect(agencyLabel('PR')).toBe('PR')
    expect(trainLabel({ agency: 'KML', number: '33423' })).toBe('KMŁ 33423')
  })

  it('krótki numer: bez pary i nazwy', () => {
    expect(shortNumber('33126/7 Dunajec')).toBe('33126')
    expect(shortNumber('77610/1')).toBe('77610')
    expect(shortNumber('33423')).toBe('33423')
    expect(shortNumber('43610 Bolek i Lolek')).toBe('43610')
  })
})
