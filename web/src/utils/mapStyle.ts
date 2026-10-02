import type { StyleSpecification } from 'maplibre-gl'

// Podkład OpenFreeMap (Positron, bez klucza API) przemalowany na tokeny MD3 motywu jasnego i ciemnego.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'

interface Palette {
  bg: string
  land: string
  wood: string
  water: string
  road: string
  roadCasing: string
  rail: string
  boundary: string
  label: string
  labelMuted: string
  halo: string
  /** nakładki KW: sieć linii (neutralna) i stany pociągów (jak plakietki statusu) */
  network: string
  ontime: string
  late: string
  est: string
}

const palettes: Record<'light' | 'dark', Palette> = {
  light: {
    bg: '#FBF1F0', land: '#F5E8E7', wood: '#EEE6DD', water: '#D6E1E8', road: '#FFFFFF', roadCasing: '#E8D5D3',
    rail: '#C9B3B1', boundary: '#B9A3A1', label: '#534342', labelMuted: '#857372', halo: '#FBF1F0',
    network: '#B29C9A', ontime: '#1F8A4C', late: '#E08600', est: '#5E7CA8',
  },
  dark: {
    bg: '#1E1515', land: '#241A1A', wood: '#231D18', water: '#17232B', road: '#3A2F2E', roadCasing: '#2C2322',
    rail: '#5A4948', boundary: '#6A5857', label: '#D8C2C0', labelMuted: '#A08C8B', halo: '#1E1515',
    network: '#7A6665', ontime: '#6FCF8E', late: '#F5B83D', est: '#8FAEDB',
  },
}

let base: Promise<StyleSpecification> | null = null

export async function loadMapStyle(mode: 'light' | 'dark'): Promise<StyleSpecification> {
  base ??= fetch(STYLE_URL).then((r) => {
    if (!r.ok) throw new Error('Nie udało się wczytać podkładu mapy.')
    return r.json() as Promise<StyleSpecification>
  }).catch((e) => { base = null; throw e })
  const style = structuredClone(await base)
  const p = palettes[mode]
  for (const layer of style.layers) {
    const id = layer.id
    const paint = ((layer as { paint?: Record<string, unknown> }).paint ??= {})
    if (layer.type === 'background') paint['background-color'] = p.bg
    else if (layer.type === 'fill') {
      if (id === 'water' || id.startsWith('water')) paint['fill-color'] = p.water
      else if (id.includes('wood') || id.includes('park') || id.includes('grass')) paint['fill-color'] = p.wood
      else if (id === 'building' || id.startsWith('landuse') || id.startsWith('landcover')) {
        paint['fill-color'] = p.land
        if (id === 'building') paint['fill-outline-color'] = p.roadCasing
      } else if (id.startsWith('road') || id.startsWith('aeroway')) paint['fill-color'] = p.road
    } else if (layer.type === 'line') {
      if (id.startsWith('waterway')) paint['line-color'] = p.water
      else if (id.startsWith('railway')) paint['line-color'] = id.includes('dash') ? p.bg : p.rail
      else if (id.startsWith('boundary')) paint['line-color'] = p.boundary
      else if (id.includes('casing')) paint['line-color'] = p.roadCasing
      else if (id.startsWith('highway') || id.startsWith('road') || id.startsWith('aeroway') || id.startsWith('tunnel')) paint['line-color'] = p.road
    } else if (layer.type === 'symbol') {
      if ('text-color' in paint || (layer as { layout?: Record<string, unknown> }).layout?.['text-field']) {
        paint['text-color'] = id.startsWith('label_') ? p.label : p.labelMuted
        paint['text-halo-color'] = p.halo
      }
    }
  }
  // tarcze dróg i nazwy ścieżek tylko zaciemniają mapę kolejową
  style.layers = style.layers.filter((l) => !/shield|highway-name-path|aeroway/.test(l.id))
  return style
}

export const mapPalette = (mode: 'light' | 'dark') => palettes[mode]
