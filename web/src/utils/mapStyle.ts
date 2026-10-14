import type { StyleSpecification } from 'maplibre-gl'

// Podkład OpenFreeMap (Positron, bez klucza API) przemalowany na ciepłe neutralne kolory motywu i odchudzony:
// mapa ma tło dla pociągów, więc bez granic gmin, rzek, drobnych dróg i nazw wsi przy oddaleniu.
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
    bg: '#F4F2F1', land: '#EFEBEA', wood: '#E7E8E0', water: '#D5DEE4', road: '#FFFFFF', roadCasing: '#E3DDDC',
    rail: '#CBC3C2', boundary: '#ABA1A0', label: '#4A4142', labelMuted: '#7F7475', halo: '#F4F2F1',
    network: '#8F8383', ontime: '#1F8A4C', late: '#E08600', est: '#5E7CA8',
  },
  dark: {
    bg: '#151111', land: '#1A1515', wood: '#191915', water: '#111A20', road: '#2D2727', roadCasing: '#221D1D',
    rail: '#463D3D', boundary: '#5A4F4F', label: '#D6CCCC', labelMuted: '#968A8A', halo: '#151111',
    network: '#8F8383', ontime: '#6FCF8E', late: '#F5B83D', est: '#8FAEDB',
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
  // poza mapą kolejową: tarcze i nazwy dróg, lotniska, granice gmin i powiatów, rzeki, drogi lokalne i ścieżki, nazwa województwa
  style.layers = style.layers.filter((l) => !/shield|highway-name|aeroway|airport|boundary_3|boundary_disputed|waterway|water_name_line|highway_path|highway_minor|road_pier|road_area_pier|label_state/.test(l.id))
  for (const layer of style.layers) {
    const layout = (layer as { layout?: Record<string, unknown> }).layout
    // nazwy po polsku (podkład domyślnie bierze angielskie: „Poland”, „Greater Poland Voivodeship”)
    if (layout?.['text-field'] && layer.id.startsWith('label_')) layout['text-field'] = ['coalesce', ['get', 'name:pl'], ['get', 'name']]
    // wsie dopiero po przybliżeniu
    if (layer.id === 'label_village') layer.minzoom = 11
  }
  return style
}

export const mapPalette = (mode: 'light' | 'dark') => palettes[mode]
