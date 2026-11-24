import { defineComponent, h, inject, ref, type PropType } from 'vue'
import paths from 'virtual:material-symbols'
import { TARCZA_ICONS, TZ_ICONS } from './tarczaIcons'

/** Ikona Material Symbols (Rounded) jako SVG. Nazwa z sufiksem „-fill” daje wariant wypełniony. W panelu (/admin) ikony wersji 2.0. */
export default defineComponent({
  name: 'MsIcon',
  inheritAttrs: false,
  props: {
    icon: { type: [String, Array, Object] as PropType<unknown>, default: '' },
    tag: { type: String, default: 'i' },
  },
  setup(props, { attrs }) {
    const tarcza = inject(TARCZA_ICONS, ref(false))
    return () => {
      const name = String(props.icon)
      // stałe ścieżki z tarczaIcons.ts (nie dane z zewnątrz), więc innerHTML jest tu bezpieczny
      const tz = tarcza.value ? TZ_ICONS[name.replace(/-fill$/, '')] : undefined
      if (tz) {
        return h(props.tag, attrs, [
          h('svg', {
            class: 'v-icon__svg tz-ikona', xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', role: 'img', 'aria-hidden': 'true',
            fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', innerHTML: tz,
          }),
        ])
      }
      const d = paths[name]
      if (!d && import.meta.env.DEV) console.warn(`[ikony] brak „${name}” w src/plugins/icons.json`)
      // attrs zawierają klasę i styl z VIcon (m.in. font-size dla rozmiaru liczbowego) — przekazujemy je bez zmian
      return h(props.tag, attrs, [
        h('svg', { class: 'v-icon__svg', xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 -960 960 960', role: 'img', 'aria-hidden': 'true' }, [
          h('path', { d: d ?? '' }),
        ]),
      ])
    }
  },
})
