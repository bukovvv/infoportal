import type { InjectionKey, Ref } from 'vue'

/** Czy rysować ikony wersji 2.0 zamiast Material Symbols (App.vue: w panelu /admin). */
export const TARCZA_ICONS: InjectionKey<Ref<boolean>> = Symbol('tarcza-icons')

// Ikony wersji 2.0 („Tarcza”, server/v20/app.js): kreska 2 px, zaokrąglone końce, siatka 24 × 24.
// Klucz = nazwa Material Symbols (bez „-fill”), więc widoki panelu się nie zmieniają; brak nazwy → zwykła ikona MS.
const kolo = '<circle cx="12" cy="12" r="9"/>'
const tarcza = '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/>'
const zegar = '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
const kal = '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'
const odswiez = '<path d="M20 12a8 8 0 1 1-2.4-5.7L20 8.5"/><path d="M20 4v4.5h-4.5"/>'
const oko = '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'
const dol = '<path d="M6 9l6 6 6-6"/>'

export const TZ_ICONS: Record<string, string> = {
  add: '<path d="M12 5v14M5 12h14"/>',
  remove: '<path d="M5 12h14"/>',
  arrow_back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  arrow_forward: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrow_upward: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrow_downward: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  chevron_left: '<path d="M15 6l-6 6 6 6"/>',
  chevron_right: '<path d="M9 6l6 6-6 6"/>',
  keyboard_arrow_down: dol, arrow_drop_down: dol, expand_more: dol,
  keyboard_arrow_up: '<path d="M6 15l6-6 6 6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  cancel: kolo + '<path d="M9 9l6 6M15 9l-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  check_circle: kolo + '<path d="M8 12.5l3 3 5-6"/>',
  check_box: '<rect x="4" y="4" width="16" height="16" rx="5" fill="currentColor"/><path d="M8 12.2l2.8 2.8L16 9.5" stroke="var(--papier, #fff)"/>',
  check_box_outline_blank: '<rect x="4" y="4" width="16" height="16" rx="5"/>',
  indeterminate_check_box: '<rect x="4" y="4" width="16" height="16" rx="5" fill="currentColor"/><path d="M8.5 12h7" stroke="var(--papier, #fff)"/>',
  radio_button_checked: kolo + '<circle cx="12" cy="12" r="4" fill="currentColor"/>',
  radio_button_unchecked: kolo,
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  manage_search: '<circle cx="15" cy="15" r="4"/><path d="M21 21l-3-3M3 5h12M3 10h7M3 15h4"/>',
  info: kolo + '<path d="M12 11v5.5M12 7.5v.01"/>',
  error: kolo + '<path d="M12 7.5v5.5M12 16.5v.01"/>',
  warning: '<path d="M12 4L2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  report: kolo + '<path d="M12 7.5v5.5M12 16.5v.01"/>',
  campaign: '<path d="M4 10v4h3l7 4V6L7 10z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
  dashboard: '<rect x="4" y="4" width="7" height="9" rx="2"/><rect x="13" y="4" width="7" height="5" rx="2"/><rect x="13" y="11" width="7" height="9" rx="2"/><rect x="4" y="15" width="7" height="5" rx="2"/>',
  monitor_heart: '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
  history: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/><path d="M12 8v4l3 2"/>',
  shield: tarcza,
  verified_user: tarcza + '<path d="M9 12l2 2 4-4"/>',
  gpp_bad: tarcza + '<path d="M10 9.5l4 4M14 9.5l-4 4"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
  login: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M3 12h11M10 8l4 4-4 4"/>',
  logout: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M10 12h11M17 8l4 4-4 4"/>',
  devices: '<rect x="3" y="5" width="13" height="10" rx="2"/><path d="M7 19h5"/><rect x="17" y="9" width="4" height="10" rx="1"/>',
  visibility: oko,
  visibility_off: oko + '<path d="M4 4l16 16"/>',
  open_in_new: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
  content_copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  delete: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  more_vert: '<path d="M12 5v.01M12 12v.01M12 19v.01" stroke-width="3"/>',
  more_horiz: '<path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3"/>',
  refresh: odswiez, sync: odswiez, update: odswiez,
  schedule: zegar, more_time: zegar + '<path d="M19 3v4M17 5h4"/>', timer: zegar,
  event: kal, calendar_month: kal, calendar_today: kal,
  backup: '<path d="M7 18a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 17.5 18z"/><path d="M12 16v-5M9.5 13.5L12 11l2.5 2.5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7l8 6 8-6"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 9l3 3-3 3M12 15h5"/>',
  route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"/>',
  train: '<rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 10h12M9 20l-1.5 1.5M15 20l1.5 1.5M9 14v.01M15 14v.01"/>',
  location_on: '<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  // z makiety 2.0: udostępnij, dzwonek, pieszo (przesiadka), zamień, opcje
  share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6h14v-6"/>',
  notifications: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  directions_walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="M10 21l2-6-2.5-2.5 1-5 3 3 3 1M9.5 12.5L7 13M12 15l3 2 1 4"/>',
  swap_vert: '<path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/>',
  tune: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  format_list_bulleted: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6v.01M4.5 12v.01M4.5 18v.01"/>',
  save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  draft: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h4"/>',
  light_mode: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
  dark_mode: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  brightness_auto: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',
  filter_list: '<path d="M4 7h16M7 12h10M10 17h4"/>',
  sort: '<path d="M4 7h16M4 12h10M4 17h5"/>',
  progress_activity: '<path d="M12 3a9 9 0 1 1-9 9"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
  attach_file: '<path d="M16 7l-7.5 7.5a2.5 2.5 0 0 0 3.5 3.5L19.5 10.5a5 5 0 0 0-7-7L5 11"/>',
  first_page: '<path d="M6 6v12M17 6l-6 6 6 6"/>',
  last_page: '<path d="M18 6v12M7 6l6 6-6 6"/>',
  circle: '<circle cx="12" cy="12" r="4" fill="currentColor"/>',
}
