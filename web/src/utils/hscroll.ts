import type { Directive } from 'vue'

/**
 * v-hscroll: pasek przewijany w bok (chipy stacji, ulubione) przewija się zwykłym kółkiem myszy.
 * Pionowy obrót kółka przesuwa pasek, a na jego końcu oddaje przewijanie stronie.
 */
function onWheel(e: WheelEvent) {
  const el = e.currentTarget as HTMLElement
  if (e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return
  const max = el.scrollWidth - el.clientWidth
  if (max <= 0) return
  const delta = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY
  if ((delta < 0 && el.scrollLeft <= 0) || (delta > 0 && el.scrollLeft >= max - 1)) return
  e.preventDefault()
  el.scrollLeft += delta
}

export const vHscroll: Directive<HTMLElement> = {
  mounted: (el) => el.addEventListener('wheel', onWheel, { passive: false }),
  beforeUnmount: (el) => el.removeEventListener('wheel', onWheel),
}
