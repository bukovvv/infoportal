/** Ustawienia przeniesione ze starego adresu (public/przenosiny.js): zapisuje tylko klucze kw_*, których tu jeszcze nie ma. */
export const MIGRATION_HASH = '#kw-przenosiny='
/** Koniec przenosin: od 1.01.2027 (czasu polskiego) ustawienia z adresu są pomijane — ta sama data w public/przenosiny.js. */
export const MIGRATION_END = Date.parse('2027-01-01T00:00:00+01:00')

export function importMigratedSettings(loc: Pick<Location, 'hash' | 'pathname' | 'search'> = location, storage: Storage = localStorage, now = Date.now()): number {
  if (!loc.hash.startsWith(MIGRATION_HASH)) return 0
  let saved = 0
  try {
    const data: unknown = now < MIGRATION_END ? JSON.parse(decodeURIComponent(loc.hash.slice(MIGRATION_HASH.length))) : null
    if (data && typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith('kw_') && typeof value === 'string' && storage.getItem(key) === null) {
          storage.setItem(key, value)
          saved++
        }
      }
    }
  } catch { /* uszkodzony adres albo pamięć niedostępna — strona działa bez przeniesionych ustawień */ }
  history.replaceState(history.state, '', loc.pathname + loc.search)
  return saved
}
