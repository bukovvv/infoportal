import { describe, expect, it } from 'vitest'
import { isNoindex, setMeta } from './seo'

const content = (selector: string) => document.head.querySelector(selector)?.getAttribute('content')

describe('setMeta', () => {
  it('ustawia tytuł, opis, adres kanoniczny i podgląd linku', () => {
    setMeta({ title: 'Swarzędz: odjazdy | zanimwyjdziesz.pl', description: 'Odjazdy ze Swarzędza', path: '/odjazdy/123/' })
    expect(document.title).toBe('Swarzędz: odjazdy | zanimwyjdziesz.pl')
    expect(content('meta[name="description"]')).toBe('Odjazdy ze Swarzędza')
    expect(content('meta[property="og:url"]')).toBe('https://zanimwyjdziesz.pl/odjazdy/123')
    expect(content('meta[name="robots"]')).toBe('index, follow')
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://zanimwyjdziesz.pl/odjazdy/123')
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1)
  })

  it('panel i brakujące strony bez indeksowania i bez adresu kanonicznego', () => {
    expect(isNoindex('admin-log') && isNoindex('missing') && !isNoindex('board')).toBe(true)
    setMeta({ title: 'Panel', path: '/admin', noindex: true })
    expect(content('meta[name="robots"]')).toBe('noindex')
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
    setMeta({ title: 'Start', path: '/' })
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://zanimwyjdziesz.pl/')
  })
})
