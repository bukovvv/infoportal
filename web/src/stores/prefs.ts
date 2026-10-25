import { defineStore } from 'pinia'
import { reactive, ref, watch } from 'vue'
import type { Notice } from '@/api/types'
import { read, write } from './ui'

/** Ustawienia pasażera (okno „Ustawienia” w menu górnego paska), tylko w tej przeglądarce: localStorage `kw_prefs`. */
export interface Prefs {
  /** karta punktualności na stronie pociągu */
  showPunctuality: boolean
  /** okres statystyk punktualności w dniach */
  punctualityDays: 7 | 30 | 90
  /** „na czas” = opóźnienie do tylu minut */
  onTimeMinutes: 3 | 5 | 10
  /** komunikaty przy połączeniach, podróżach i na tablicy: wszystkie albo tylko utrudnienia (bez informacji) */
  connectionNotices: 'all' | 'alerts'
}

export const PREF_DEFAULTS: Prefs = { showPunctuality: true, punctualityDays: 30, onTimeMinutes: 5, connectionNotices: 'all' }
export const PERIODS = [7, 30, 90] as const
export const THRESHOLDS = [3, 5, 10] as const

/** Zapisane ustawienia z poprawionymi wartościami spoza listy (np. po zmianie wersji). */
export function sanitize(raw: unknown): Prefs {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Prefs, unknown>>
  return {
    showPunctuality: typeof v.showPunctuality === 'boolean' ? v.showPunctuality : PREF_DEFAULTS.showPunctuality,
    punctualityDays: (PERIODS as readonly unknown[]).includes(v.punctualityDays) ? (v.punctualityDays as Prefs['punctualityDays']) : PREF_DEFAULTS.punctualityDays,
    onTimeMinutes: (THRESHOLDS as readonly unknown[]).includes(v.onTimeMinutes) ? (v.onTimeMinutes as Prefs['onTimeMinutes']) : PREF_DEFAULTS.onTimeMinutes,
    connectionNotices: v.connectionNotices === 'alerts' ? 'alerts' : 'all',
  }
}

export const usePrefs = defineStore('prefs', () => {
  const prefs = reactive<Prefs>(sanitize(read<unknown>('kw_prefs', null)))
  /** okno ustawień (otwierane z menu i z karty punktualności) */
  const dialog = ref(false)
  watch(prefs, (v) => write('kw_prefs', { ...v }), { deep: true })
  const reset = () => Object.assign(prefs, PREF_DEFAULTS)
  /** komunikat przy połączeniu / podróży / rzędzie tablicy — według ustawienia „Tylko utrudnienia” */
  const showsNotice = (n: Notice) => prefs.connectionNotices === 'all' || n.severity !== 'info'
  return { prefs, dialog, reset, showsNotice }
})
