import { ref } from 'vue'

/**
 * Żałoba (od 2026-11-08, po strzelaninie w Krakowie; decyzja właściciela): czarny górny pasek,
 * cała strona w odcieniach szarości, wstążka żałobna przy logo i słowo od właściciela na starcie.
 * Kończy się sama 12 listopada 2026 o 00:00 czasu polskiego (także w otwartej karcie, bez przeładowania).
 * Po tej dacie kod można usunąć.
 */
export const MOURNING_END = new Date('2026-11-12T00:00:00+01:00')

export const mourning = ref(Date.now() < MOURNING_END.getTime())

/** Wyłącza żałobę o MOURNING_END w otwartej karcie (setTimeout przyjmuje najwyżej ~24 dni). */
export function scheduleMourningEnd(onEnd: () => void) {
  if (!mourning.value) return
  const ms = MOURNING_END.getTime() - Date.now()
  if (ms > 2 ** 31 - 1) return
  window.setTimeout(() => { mourning.value = false; onEnd() }, Math.max(0, ms))
}
