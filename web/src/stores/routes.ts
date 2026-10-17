import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { api } from '@/api/client'
import type { Connection, StationRef } from '@/api/types'
import { warsawNow } from '@/utils/format'
import { pushSupport, unwatchRoute, watchRoute } from '@/utils/push'
import { routeId, upcoming, type RouteDir, type RouteWindow } from '@/utils/routes'
import { optionsToApi, sanitize, type SearchOptions } from '@/utils/searchOptions'
import { read, useUi, write } from './ui'

/** Obserwowana trasa: para stacji (oba kierunki) z opcjami wyszukiwania z chwili zapisu. */
export interface SavedRoute {
  id: string
  a: StationRef
  b: StationRef
  options: SearchOptions
  /** kierunek pokazywany na karcie */
  dir: RouteDir
  savedAt: string
  /** okienka powiadomień push dla kierunków (subskrypcja na serwerze) */
  notify?: Partial<Record<RouteDir, RouteWindow>>
  /** ostatnie odnowienie wpisu na serwerze (serwer usuwa wpisy nieodnawiane od 90 dni) */
  syncedAt?: string
}

export interface RouteResult { at: number; connections: Connection[]; error?: string }

const STORAGE_KEY = 'kw_routes'
const RESYNC = 7 * 86400_000

export const ends = (r: SavedRoute, dir: RouteDir = r.dir) => (dir === 'ab' ? { from: r.a, to: r.b } : { from: r.b, to: r.a })

export const useRoutes = defineStore('routes', () => {
  const list = ref<SavedRoute[]>(read<SavedRoute[]>(STORAGE_KEY, []).map((r) => ({ ...r, options: sanitize(r.options) })))
  /** wyniki dla `id|kierunek` */
  const results = ref<Record<string, RouteResult>>({})
  const loading = ref<Record<string, boolean>>({})
  /** trasy, dla których trwa włączanie/wyłączanie powiadomień */
  const pending = ref<Record<string, boolean>>({})
  const ui = useUi()
  watch(list, (value) => write(STORAGE_KEY, value), { deep: true })

  const find = (a: string, b: string) => list.value.find((r) => r.id === routeId(a, b))
  const has = (a: string, b: string) => !!find(a, b)

  /** Dodaje trasę (kierunek jak w wyszukiwaniu); false, gdy już jest. */
  function add(from: StationRef, to: StationRef, options: SearchOptions) {
    if (has(from.id, to.id)) return false
    list.value.unshift({ id: routeId(from.id, to.id), a: { ...from }, b: { ...to }, options: { ...options, agencies: [...options.agencies] }, dir: 'ab', savedAt: new Date().toISOString() })
    void load(list.value[0], 'ab', true)
    return true
  }

  function remove(id: string) {
    const index = list.value.findIndex((r) => r.id === id)
    if (index < 0) return null
    const [removed] = list.value.splice(index, 1)
    if (removed.notify) void unwatchRoute(removed.id).catch(() => undefined)
    return removed
  }

  function restore(r: SavedRoute) {
    if (list.value.some((x) => x.id === r.id)) return
    list.value.unshift(r)
    if (r.notify) void sync(r).catch(() => { r.notify = undefined })
  }

  function setDir(id: string, dir: RouteDir) {
    const r = list.value.find((x) => x.id === id)
    if (!r) return
    r.dir = dir
    void load(r, dir)
  }

  /** Najbliższe połączenia w kierunku; bez `force` nie częściej niż co 50 s. */
  async function load(r: SavedRoute, dir: RouteDir = r.dir, force = false) {
    const k = `${r.id}|${dir}`
    if (loading.value[k] || (!force && results.value[k] && Date.now() - results.value[k].at < 50_000)) return
    const { from, to } = ends(r, dir)
    // kilkanaście minut wstecz: opóźniony pociąg zostaje na karcie do faktycznego odjazdu
    const since = warsawNow(new Date(Date.now() - 20 * 60_000))
    loading.value[k] = true
    try {
      const res = await api.connections({ from: from.id, to: to.id, date: since.date, time: since.time, limit: 8, ...optionsToApi(r.options) })
      results.value[k] = { at: Date.now(), connections: upcoming(res.connections, Date.now(), 3) }
    } catch (e) {
      results.value[k] = { at: Date.now(), connections: results.value[k]?.connections ?? [], error: (e as Error).message }
    } finally {
      delete loading.value[k]
    }
  }

  /** Odświeża pokazywane kierunki wszystkich tras (co minutę ze strony startowej). */
  async function refresh() {
    await Promise.all(list.value.map((r) => load(r)))
  }

  function windowsBody(r: SavedRoute) {
    return (['ab', 'ba'] as const).filter((d) => r.notify?.[d]).map((d) => ({ dir: d, ...r.notify![d]! }))
  }

  async function sync(r: SavedRoute) {
    await watchRoute(r.id, {
      from: r.a.id,
      to: r.b.id,
      options: { transfers: r.options.maxTransfers, minTransfer: r.options.minTransfer, agencies: r.options.agencies },
      windows: windowsBody(r),
    })
    r.syncedAt = new Date().toISOString()
  }

  /** Zapisuje okienka powiadomień (puste — wyłącza); wynik i błędy w pasku na dole ekranu. Zwraca true po sukcesie. */
  async function setNotify(id: string, notify: Partial<Record<RouteDir, RouteWindow>> | null) {
    const r = list.value.find((x) => x.id === id)
    if (!r || pending.value[id]) return false
    const on = !!notify && Object.values(notify).some(Boolean)
    if (on) {
      const support = pushSupport()
      if (support === 'ios-install') {
        ui.notify('Na iPhonie powiadomienia działają w aplikacji: Udostępnij → Do ekranu początkowego, potem otwórz ją z ekranu.')
        return false
      }
      if (support === 'unsupported') {
        ui.notify('Ta przeglądarka nie obsługuje powiadomień.')
        return false
      }
    }
    const before = r.notify
    pending.value[id] = true
    try {
      if (on) {
        r.notify = notify!
        await sync(r)
      } else {
        await unwatchRoute(id)
        r.notify = undefined
      }
      ui.notify(on ? 'Powiadomimy Cię o opóźnieniach od 5 min i odwołaniach w wybranych godzinach.' : 'Wyłączono powiadomienia o tej trasie.')
      return true
    } catch (e) {
      r.notify = before
      ui.notify((e as Error).message || 'Nie udało się zmienić powiadomień. Spróbuj ponownie.')
      return false
    } finally {
      delete pending.value[id]
    }
  }

  /** Odnawia wpisy na serwerze raz na tydzień (bez pytania o zgodę — tylko gdy powiadomienia są już dozwolone). */
  function resync() {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    for (const r of list.value) {
      if (r.notify && (!r.syncedAt || Date.now() - new Date(r.syncedAt).getTime() > RESYNC)) void sync(r).catch(() => undefined)
    }
  }

  return { list, results, loading, pending, find, has, add, remove, restore, setDir, load, refresh, setNotify, resync }
})
