import { defineComponent, h, type PropType } from 'vue'
import paths from 'virtual:material-symbols'

/** Ikona Material Symbols (Rounded) jako SVG. Nazwa z sufiksem „-fill” daje wariant wypełniony. */
export default defineComponent({
  name: 'MsIcon',
  inheritAttrs: false,
  props: {
    icon: { type: [String, Array, Object] as PropType<unknown>, default: '' },
    tag: { type: String, default: 'i' },
  },
  setup(props, { attrs }) {
    return () => {
      const name = String(props.icon)
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
