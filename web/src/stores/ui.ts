import { defineStore } from 'pinia'
import { ref } from 'vue'
import { storageKey } from '@/utils/region'

export interface SnackAction {
  label: string
  run: () => void
}

type ThemeMode = 'system' | 'light' | 'dark'

// klucze zależne od regionu (ulubione, podróże, trasy…) mają w Małopolsce osobne wpisy — utils/region
const read = <T>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(storageKey(key))
    return v === null ? fallback : (JSON.parse(v) as T)
  } catch {
    return fallback
  }
}
export const write = (key: string, value: unknown) => {
  try { localStorage.setItem(storageKey(key), JSON.stringify(value)) } catch { /* pamięć przeglądarki jest opcjonalna */ }
}
export { read }

export const useUi = defineStore('ui', () => {
  const snack = ref<{ text: string; action?: SnackAction; id: number } | null>(null)
  const sheet = ref<{ key?: string; number?: string; docked?: boolean } | null>(null)
  const theme = ref<ThemeMode>(read<ThemeMode>('kw_theme', 'system'))
  /** „Pokaż na mapie” kliknięte na samej mapie: kurs do pokazania (mapa odbiera i czyści) */
  const mapFocus = ref<string | null>(null)

  function notify(text: string, action?: SnackAction) {
    snack.value = { text, action, id: Date.now() }
  }

  function openTrain(target: { key?: string; number?: string }, docked = false) {
    sheet.value = { ...target, docked }
  }

  function closeTrain() {
    sheet.value = null
  }

  function setTheme(mode: ThemeMode) {
    theme.value = mode
    write('kw_theme', mode)
  }

  return { snack, sheet, theme, mapFocus, notify, openTrain, closeTrain, setTheme }
})
