import type { AdminLogEntry } from '@/api/types'

// Wpisy dziennika panelu: nazwa akcji, ikona i krótki opis zmiany (zakładka „Dziennik” i pulpit).
const ACTIONS: Record<string, { label: string; icon: string; tone?: 'warn' | 'error' }> = {
  login: { label: 'Zalogowanie', icon: 'login' },
  logout: { label: 'Wylogowanie', icon: 'logout' },
  'login-failed': { label: 'Nieudane logowanie', icon: 'lock', tone: 'warn' },
  'login-blocked': { label: 'Logowanie zablokowane (za dużo prób)', icon: 'gpp_bad', tone: 'error' },
  'login-code-failed': { label: 'Błędny kod z aplikacji', icon: 'lock', tone: 'warn' },
  'logout-all': { label: 'Wylogowanie wszędzie', icon: 'devices' },
  '2fa-enable': { label: 'Włączony kod z aplikacji', icon: 'verified_user' },
  '2fa-disable': { label: 'Wyłączony kod z aplikacji', icon: 'shield', tone: 'warn' },
  'notice-create': { label: 'Dodany komunikat', icon: 'add' },
  'notice-update': { label: 'Zmieniony komunikat', icon: 'edit' },
  'notice-delete': { label: 'Usunięty komunikat', icon: 'delete' },
  import: { label: 'Import rozkładu', icon: 'sync' },
  'import-failed': { label: 'Import rozkładu nieudany', icon: 'sync', tone: 'error' },
}
export const logInfo = (action: string) => ACTIONS[action] ?? { label: action, icon: 'history' }

/** Tytuł komunikatu (po zmianie, a przy usunięciu sprzed) i zmienione pola. */
export function logSummary(e: AdminLogEntry): string {
  const before = e.detail.before as Record<string, unknown> | null | undefined
  const after = e.detail.after as Record<string, unknown> | null | undefined
  if (e.detail.recovery) return `Kodem zapasowym (zostało: ${String(e.detail.recoveryLeft)})`
  if (e.detail.cli) return 'Z serwera (admin-2fa.php)'
  if (e.detail.username !== undefined) return `Nazwa użytkownika: ${String(e.detail.username) || '(pusta)'}`
  const title = String((after ?? before)?.title ?? '')
  if (!before || !after) return title
  const names: Record<string, string> = { title: 'tytuł', body: 'treść', line: 'dotyczy', severity: 'waga', trains: 'pociągi', stations: 'stacje', lines: 'linie', startsAt: 'początek', endsAt: 'koniec', active: 'widoczność' }
  const changed = Object.keys(names).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k])).map((k) => names[k])
  return changed.length ? `${title} · zmiany: ${changed.join(', ')}` : `${title} · bez zmian`
}
