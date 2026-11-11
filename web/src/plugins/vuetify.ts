import 'vuetify/styles'
import { createVuetify, type IconSet, type ThemeDefinition } from 'vuetify'
import { md3 } from 'vuetify/blueprints'
import { pl } from 'vuetify/locale'
import { h } from 'vue'
import MsIcon from './MsIcon'
import { mourning } from '@/utils/mourning'

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
    'brand-red': '#D2232A',
  },
}

// żałoba: górny pasek i menu boczne czarne (reszta strony w szarości — klasa kw-mourning w app.css)
const BAND = { light: light.colors!.band as string, dark: dark.colors!.band as string }
if (mourning.value) {
  light.colors!.band = '#000000'
  dark.colors!.band = '#000000'
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
  theme: { defaultTheme: 'system', themes: { light, dark } },
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

/** Koniec żałoby w otwartej karcie: pasek wraca do grafitu. */
export function endMourningTheme() {
  const themes = vuetify.theme.themes.value
  themes.light.colors.band = BAND.light
  themes.dark.colors.band = BAND.dark
}
export default vuetify
