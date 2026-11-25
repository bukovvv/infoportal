import 'vuetify/styles'
import { createVuetify, type IconSet, type ThemeDefinition } from 'vuetify'
import { md3 } from 'vuetify/blueprints'
import { pl } from 'vuetify/locale'
import { h } from 'vue'
import MsIcon from './MsIcon'
import { region } from '@/utils/region'

// Kolory z logo: grafit #1A1111 (górny pasek „band”) i czerwień #D2232A (akcja; „brand-red” = strzałka w znaku),
// ciepłe neutralne tła + kolory rozszerzone: planowo, opóźnienie, estymacja.
// Tło strony (background) jest ciemniejsze od kart: karty to surface / surface-container-low (ten sam kolor).
const light: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#F7F5F5',
    'on-background': '#1A1111',
    surface: '#FFFFFF',
    'on-surface': '#1A1111',
    'surface-bright': '#FFFFFF',
    'surface-light': '#E9E4E4',
    'surface-variant': '#E9E4E4',
    'on-surface-variant': '#544A4B',
    'surface-container-lowest': '#FFFFFF',
    'surface-container-low': '#FFFFFF',
    'surface-container': '#F1EDED',
    'surface-container-high': '#E9E4E4',
    'surface-container-highest': '#E3DDDD',
    primary: '#D2232A',
    'on-primary': '#FFFFFF',
    'primary-container': '#FFDAD7',
    'on-primary-container': '#410004',
    secondary: '#775654',
    'on-secondary': '#FFFFFF',
    'secondary-container': '#FFDAD7',
    'on-secondary-container': '#410004',
    tertiary: '#715B2E',
    'tertiary-container': '#FDDEA6',
    'on-tertiary-container': '#261900',
    error: '#BA1A1A',
    'error-container': '#FFDAD6',
    'on-error-container': '#410002',
    outline: '#7F7475',
    'outline-variant': '#DCD4D4',
    'inverse-surface': '#362F2F',
    'on-inverse-surface': '#FBEEEE',
    'inverse-primary': '#FFB3AE',
    success: '#2E6A44',
    'success-container': '#B1F1C1',
    'on-success-container': '#00210F',
    warning: '#7C5800',
    'warning-container': '#FFDEA0',
    'on-warning-container': '#261900',
    info: '#3F5F90',
    'info-container': '#D6E3FF',
    'on-info-container': '#001B3E',
    band: '#1A1111',
    'on-band': '#FFFFFF',
    // przycisk „Kup bilet” na pasku: w Wielkopolsce jasny na grafitowym, w Małopolsce żółty KML
    'band-accent': '#FFFFFF',
    'on-band-accent': '#1A1111',
    'brand-red': '#D2232A',
  },
}

const dark: ThemeDefinition = {
  dark: true,
  colors: {
    background: '#120C0C',
    'on-background': '#F0E6E6',
    surface: '#1C1616',
    'on-surface': '#F0E6E6',
    'surface-bright': '#3A3131',
    'surface-light': '#2F2727',
    'surface-variant': '#2F2727',
    'on-surface-variant': '#CDBDBD',
    'surface-container-lowest': '#0D0808',
    'surface-container-low': '#1C1616',
    'surface-container': '#251E1E',
    'surface-container-high': '#2F2727',
    'surface-container-highest': '#3A3131',
    primary: '#FFB3AE',
    'on-primary': '#68000B',
    'primary-container': '#93101A',
    'on-primary-container': '#FFDAD7',
    secondary: '#E7BDB9',
    'on-secondary': '#442928',
    'secondary-container': '#93101A',
    'on-secondary-container': '#FFDAD7',
    tertiary: '#E1C38C',
    'tertiary-container': '#584419',
    'on-tertiary-container': '#FDDEA6',
    error: '#FFB4AB',
    'error-container': '#93000A',
    'on-error-container': '#FFDAD6',
    outline: '#9A8D8D',
    'outline-variant': '#463C3C',
    'inverse-surface': '#F0E6E6',
    'on-inverse-surface': '#362F2F',
    'inverse-primary': '#D2232A',
    success: '#95D5A6',
    'success-container': '#135232',
    'on-success-container': '#B1F1C1',
    warning: '#F2BF48',
    'warning-container': '#5C4200',
    'on-warning-container': '#FFDEA0',
    info: '#A9C7FF',
    'info-container': '#264777',
    'on-info-container': '#D6E3FF',
    band: '#231B1B',
    'on-band': '#F0E6E6',
    'band-accent': '#F0E6E6',
    'on-band-accent': '#231B1B',
    'brand-red': '#D2232A',
  },
}

/**
 * Małopolska (/malopolska) w spokojnych barwach Kolei Małopolskich — ten sam układ co w Wielkopolsce, inna temperatura:
 * pasek granatowo-grafitowy (#141C29, ciemny kolor ze strony KMŁ) zamiast ciepłego grafitu, jedna akcja w stonowanym
 * niebieskim zamiast czerwieni, chłodne szarości. Żółty KML (#FDC300) tylko na „Kup bilet”. Czerwony znak logo zostaje.
 */
const KML_LIGHT: Record<string, string> = {
  background: '#F4F5F8',
  'on-background': '#151A23',
  'on-surface': '#151A23',
  'surface-light': '#E6E9EF',
  'surface-variant': '#E6E9EF',
  'on-surface-variant': '#4A505C',
  'surface-container': '#EEF0F4',
  'surface-container-high': '#E6E9EF',
  'surface-container-highest': '#E0E3EA',
  primary: '#2A55B0',
  'on-primary': '#FFFFFF',
  'primary-container': '#DCE3F7',
  'on-primary-container': '#0F1F45',
  secondary: '#5B6170',
  'on-secondary': '#FFFFFF',
  'secondary-container': '#E1E5EE',
  'on-secondary-container': '#181D28',
  outline: '#777C88',
  'outline-variant': '#D6DAE2',
  'inverse-surface': '#2C313B',
  'on-inverse-surface': '#EEF0F5',
  'inverse-primary': '#B3C6F2',
  band: '#141C29',
  'on-band': '#FFFFFF',
  'band-accent': '#FDC300',
  'on-band-accent': '#141C29',
}
const KML_DARK: Record<string, string> = {
  background: '#0E1117',
  'on-background': '#E4E6EB',
  surface: '#171B22',
  'on-surface': '#E4E6EB',
  'surface-bright': '#393F4A',
  'surface-light': '#2A2F38',
  'surface-variant': '#2A2F38',
  'on-surface-variant': '#C3C7D0',
  'surface-container-lowest': '#0A0C10',
  'surface-container-low': '#171B22',
  'surface-container': '#1F242C',
  'surface-container-high': '#2A2F38',
  'surface-container-highest': '#343A44',
  primary: '#B3C6F2',
  'on-primary': '#152B5C',
  'primary-container': '#2D4478',
  'on-primary-container': '#DCE3F7',
  secondary: '#C1C6D2',
  'on-secondary': '#2B303B',
  'secondary-container': '#353B48',
  'on-secondary-container': '#DDE2EE',
  outline: '#8D929D',
  'outline-variant': '#40454F',
  'inverse-surface': '#E4E6EB',
  'on-inverse-surface': '#2C313B',
  'inverse-primary': '#2A55B0',
  band: '#1B2230',
  'on-band': '#ECEEF3',
  'band-accent': '#FDC300',
  'on-band-accent': '#141C29',
}
if (region.id === 'malopolska') {
  Object.assign(light.colors!, KML_LIGHT)
  Object.assign(dark.colors!, KML_DARK)
}

/**
 * Wersja 2.0 („Tarcza”, server/v20) dla panelu admina: chłodne szarości, płyty bez obrysów, czerwień tylko na głównym
 * przycisku. Panel włącza je przez v-theme-provider (AdminLayout), reszta serwisu bez zmian.
 */
const tarcza: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#FBFBFC', 'on-background': '#14171C', surface: '#FBFBFC', 'on-surface': '#14171C',
    'surface-bright': '#FFFFFF', 'surface-light': '#E2E6EB', 'surface-variant': '#E2E6EB', 'on-surface-variant': '#5A626E',
    'surface-container-lowest': '#FFFFFF', 'surface-container-low': '#EFF1F4', 'surface-container': '#EFF1F4',
    'surface-container-high': '#E2E6EB', 'surface-container-highest': '#E2E6EB',
    primary: '#D2232A', 'on-primary': '#FFFFFF', 'primary-container': '#FBE3E4', 'on-primary-container': '#7A1015',
    secondary: '#5A626E', 'on-secondary': '#FFFFFF', 'secondary-container': '#E2E6EB', 'on-secondary-container': '#14171C',
    tertiary: '#9A5200', 'tertiary-container': '#FBEBCF', 'on-tertiary-container': '#5C3100',
    error: '#B81D24', 'error-container': '#FBE3E4', 'on-error-container': '#7A1015',
    outline: '#8A929E', 'outline-variant': '#D5DAE1', 'inverse-surface': '#14171C', 'on-inverse-surface': '#FBFBFC', 'inverse-primary': '#FF8084',
    success: '#0E7A55', 'success-container': '#DDF1E8', 'on-success-container': '#0B4D37',
    warning: '#9A5200', 'warning-container': '#FBEBCF', 'on-warning-container': '#5C3100',
    info: '#2A55B0', 'info-container': '#DCE3F7', 'on-info-container': '#0F1F45',
    band: '#14171C', 'on-band': '#FBFBFC', 'band-accent': '#FBFBFC', 'on-band-accent': '#14171C', 'brand-red': '#D2232A',
  },
}
const tarczaDark: ThemeDefinition = {
  dark: true,
  colors: {
    background: '#0E1013', 'on-background': '#F1F3F6', surface: '#0E1013', 'on-surface': '#F1F3F6',
    'surface-bright': '#343943', 'surface-light': '#252930', 'surface-variant': '#252930', 'on-surface-variant': '#A3ABB7',
    'surface-container-lowest': '#07080A', 'surface-container-low': '#181B20', 'surface-container': '#181B20',
    'surface-container-high': '#252930', 'surface-container-highest': '#252930',
    primary: '#E5484D', 'on-primary': '#FFFFFF', 'primary-container': '#3D1416', 'on-primary-container': '#FFD9DA',
    secondary: '#A3ABB7', 'on-secondary': '#14171C', 'secondary-container': '#252930', 'on-secondary-container': '#F1F3F6',
    tertiary: '#F2B95C', 'tertiary-container': '#3A2A0C', 'on-tertiary-container': '#FBE3B8',
    error: '#FF8084', 'error-container': '#3D1416', 'on-error-container': '#FFD9DA',
    outline: '#6B7380', 'outline-variant': '#343943', 'inverse-surface': '#F1F3F6', 'on-inverse-surface': '#14171C', 'inverse-primary': '#D2232A',
    success: '#5FD0A0', 'success-container': '#12352A', 'on-success-container': '#B8F0D6',
    warning: '#F2B95C', 'warning-container': '#3A2A0C', 'on-warning-container': '#FBE3B8',
    info: '#B3C6F2', 'info-container': '#1F2B45', 'on-info-container': '#DCE3F7',
    band: '#07080A', 'on-band': '#F1F3F6', 'band-accent': '#F1F3F6', 'on-band-accent': '#07080A', 'brand-red': '#D2232A',
  },
}

// wersja 2.0 w Małopolsce: akcja w stonowanym niebieskim, ciemna płyta granatowa (jak data-region="mal" w makiecie)
if (region.id === 'malopolska') {
  Object.assign(tarcza.colors!, { primary: '#2A55B0', 'on-primary': '#FFFFFF', band: '#141C29' })
  Object.assign(tarczaDark.colors!, { primary: '#B3C6F2', 'on-primary': '#141C29', band: '#1F2736' })
}

const aliases: Record<string, string> = {
  collapse: 'keyboard_arrow_up', complete: 'check', cancel: 'cancel', close: 'close', delete: 'cancel', clear: 'close',
  success: 'check_circle', info: 'info', warning: 'warning', error: 'error', prev: 'chevron_left', next: 'chevron_right',
  checkboxOn: 'check_box', checkboxOff: 'check_box_outline_blank', checkboxIndeterminate: 'indeterminate_check_box',
  delimiter: 'circle', sortAsc: 'arrow_upward', sortDesc: 'arrow_downward', expand: 'keyboard_arrow_down', menu: 'menu',
  subgroup: 'arrow_drop_down', dropdown: 'arrow_drop_down', radioOn: 'radio_button_checked', radioOff: 'radio_button_unchecked',
  edit: 'edit', loading: 'progress_activity', first: 'first_page', last: 'last_page', unfold: 'unfold_more', file: 'attach_file',
  plus: 'add', minus: 'remove', calendar: 'calendar_today', treeviewCollapse: 'arrow_drop_down', treeviewExpand: 'arrow_right',
  eyeDropper: 'colorize', upload: 'upload', search: 'search', arrowup: 'arrow_upward', arrowdown: 'arrow_downward',
  arrowleft: 'arrow_back', arrowright: 'arrow_forward', enter: 'keyboard_return',
}

const vuetify = createVuetify({
  blueprint: md3,
  locale: { locale: 'pl', messages: { pl } },
  theme: { defaultTheme: 'system', themes: { light, dark, tarcza, tarczaDark } },
  icons: {
    defaultSet: 'ms',
    aliases,
    sets: { ms: { component: ((props: Record<string, unknown>) => h(MsIcon, props)) as unknown as IconSet['component'] } },
  },
  defaults: {
    // jedna skala zaokrągleń: przyciski, chipy i przełączniki — pigułki; karty, alerty i panele — 24 px
    VBtn: { rounded: 'pill' },
    VBtnToggle: { rounded: 'pill' },
    VChip: { rounded: 'pill' },
    VCard: { rounded: 'xl', flat: true },
    VAlert: { rounded: 'xl' },
    VExpansionPanels: { rounded: 'xl' },
    VTextField: { variant: 'outlined' },
    VAutocomplete: { variant: 'outlined' },
    VSelect: { variant: 'outlined' },
    VTextarea: { variant: 'outlined' },
    VSnackbar: { color: 'inverse-surface', location: 'bottom center', rounded: 'pill' },
    VProgressLinear: { color: 'primary' },
  },
})

export default vuetify
