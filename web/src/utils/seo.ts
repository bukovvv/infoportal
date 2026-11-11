import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { region } from './region'

/**
 * Tytuł, opis, adres kanoniczny i podgląd linku (Open Graph) bieżącej strony. Ustawiane po każdej nawigacji
 * (router.afterEach), a w widokach z danymi (stacja, pociąg, komunikat) — po ich wczytaniu (usePageMeta).
 * Robot Google wykonuje JavaScript, więc widzi te wartości; w statycznym index.html nie ma adresu kanonicznego,
 * żeby nie wskazywał strony głównej dla każdej podstrony.
 */
export const SITE_URL = 'https://zanimwyjdziesz.pl'

export const descriptions: Record<string, string> = {
  start: `Wyszukiwarka połączeń kolejowych ${region.inName}: ${region.agencyName}, POLREGIO i PKP Intercity, z przesiadkami i opóźnieniami na żywo. Nieoficjalny serwis pasażerski bez reklam i bez konta.`,
  map: `Mapa pociągów ${region.inName} na żywo: gdzie jest pociąg ${region.agencyOf}, POLREGIO i PKP Intercity i ile ma opóźnienia.`,
  scheme: 'Schemat połączeń Kolei Wielkopolskich: linie, stacje i przesiadki w Wielkopolsce na interaktywnym schemacie sieci.',
  board: `Odjazdy i przyjazdy pociągów na stacjach ${region.inName} na żywo: perony, opóźnienia i odwołania.`,
  train: `Rozkład jazdy pociągu ${region.inName}: postoje, perony i opóźnienie na żywo.`,
  notices: 'Komunikaty o utrudnieniach w ruchu pociągów Kolei Wielkopolskich: opóźnienia, odwołania i zastępcza komunikacja autobusowa.',
  notice: 'Komunikat o utrudnieniach w ruchu pociągów Kolei Wielkopolskich.',
  btk: 'Bilet Bus-Tramwaj-Kolej (BTK) w aglomeracji poznańskiej: kalkulator ceny, cennik, strefy i zasady wspólnego biletu.',
  about: 'O serwisie zanimwyjdziesz.pl: nieoficjalny serwis pasażerski kolei w Wielkopolsce i Małopolsce. Funkcje, źródła danych i prywatność.',
}

/** Strony, których wyszukiwarki nie mają pokazywać. */
const NOINDEX = /^(admin|missing)/

export interface PageMeta {
  title: string
  description?: string
  /** ścieżka strony bez zapytania, np. /odjazdy/30601 */
  path: string
  noindex?: boolean
}

/** Znacznik w <head> o atrybucie attr="key" (tworzony, gdy go nie ma). */
function tag(name: 'meta' | 'link', attr: string, key: string): HTMLElement {
  let el = document.head.querySelector<HTMLElement>(`${name}[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement(name)
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  return el
}

const meta = (attr: 'name' | 'property', key: string, content: string) => tag('meta', attr, key).setAttribute('content', content)

export function setMeta(page: PageMeta) {
  const description = page.description ?? descriptions.start
  // ścieżki routera są bez początku regionu (/malopolska) — adres kanoniczny z nim
  const path = region.base + (page.path === '/' && !region.base ? '/' : page.path.replace(/\/+$/, ''))
  const url = SITE_URL + (path || '/')
  document.title = page.title
  meta('name', 'description', description)
  meta('name', 'robots', page.noindex ? 'noindex' : 'index, follow')
  meta('property', 'og:title', page.title)
  meta('property', 'og:description', description)
  meta('property', 'og:url', url)
  const link = tag('link', 'rel', 'canonical')
  if (page.noindex) link.remove()
  else link.setAttribute('href', url)
}

export const isNoindex = (routeName: string) => NOINDEX.test(routeName)

/**
 * Opis strony z danymi (np. nazwa stacji). Stosowany po każdej zmianie ścieżki — po router.afterEach,
 * który ustawia wartości ogólne dla widoku.
 */
export function usePageMeta(get: () => Omit<PageMeta, 'path'> | null) {
  const route = useRoute()
  watch([() => route.path, get], ([path, page]) => {
    if (page) setMeta({ ...page, path })
  }, { immediate: true, flush: 'post' })
}
