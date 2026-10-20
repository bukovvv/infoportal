import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { api } from '@/api/client'
import type { Live, LiveTrain, Notice, Station, StationRef, Status } from '@/api/types'
import { normalize } from '@/utils/format'
import { stationByKurs90 } from '@/utils/kurs90'
import { aboutStation, aboutTrip } from '@/utils/notices'

/** Uruchamia funkcję od razu, potem cyklicznie — kolejne odświeżenia wstrzymuje, gdy karta jest w tle. */
function poll(fn: () => Promise<void>, everyMs: number) {
  let timer: number | undefined
  const tick = async (force = false) => {
    window.clearTimeout(timer)
    if (force || document.visibilityState === 'visible') await fn().catch(() => undefined)
    timer = window.setTimeout(tick, everyMs)
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void tick() })
  void tick(true)
}

export const useStations = defineStore('stations', () => {
  /** wszystkie stacje, także te, na których staje tylko POLREGIO (mapa) */
  const all = shallowRef<Station[]>([])
  /** stacje KW */
  const list = computed(() => all.value.filter((s) => s.kw !== false))
  const byId = computed(() => new Map(all.value.map((s) => [s.id, s])))
  const loaded = ref(false)
  let pending: Promise<void> | null = null

  function load() {
    pending ??= api.stations().then((data) => { all.value = data; loaded.value = true }).catch((e) => { pending = null; throw e })
    return pending
  }

  function search(query: string, limit = 8): Station[] {
    // cicha funkcja: sam numer = kod stacji z KURS'90 (np. 159 → Poznań Główny)
    const coded = /^\s*\d+\s*$/.test(query) ? byId.value.get(stationByKurs90(query) ?? '') : undefined
    if (coded) return [coded]
    // sam numer bez kodu stacji — to nie nazwa (np. numer pociągu na tablicy odjazdów)
    if (/^\s*((kw|pr)\s*)?\d+/i.test(query)) return []
    const q = normalize(query)
    const rank = (s: Station) => {
      const n = normalize(s.name)
      return n.startsWith(q) ? 0 : n.split(/[\s-]+/).some((p) => p.startsWith(q)) ? 1 : 2
    }
    return all.value
      .filter((s) => !q || normalize(s.name).includes(q))
      .sort((a, b) => (q ? rank(a) - rank(b) : 0) || b.daily - a.daily)
      .slice(0, limit)
  }

  return { all, list, byId, loaded, load, search }
})

export const useLive = defineStore('live', () => {
  const data = shallowRef<Live | null>(null)
  const error = ref<string | null>(null)
  const trains = computed<LiveTrain[]>(() => data.value?.trains ?? [])
  const byKey = computed(() => new Map(trains.value.filter((t) => t.key).map((t) => [t.key as string, t])))
  let started = false

  async function refresh() {
    try {
      data.value = await api.live()
      error.value = null
    } catch (e) {
      error.value = (e as Error).message
    }
  }

  function start() {
    if (started) return
    started = true
    poll(refresh, 30_000)
  }

  return { data, error, trains, byKey, refresh, start }
})

export const useStatus = defineStore('status', () => {
  const status = shallowRef<Status | null>(null)
  let started = false
  function start() {
    if (started) return
    started = true
    poll(async () => { status.value = await api.status() }, 60_000)
  }
  return { status, start }
})

export const useNotices = defineStore('notices', () => {
  const list = shallowRef<Notice[]>([])
  const loaded = ref(false)
  let started = false
  const alerts = computed(() => list.value.filter((n) => n.severity !== 'info'))
  const forNumbers = (numbers: string[]) => list.value.filter((n) => n.trains.some((t) => numbers.includes(t)))
  const forStation = (station: Pick<StationRef, 'id' | 'name'>) => list.value.filter((n) => aboutStation(n, station))
  const forLine = (lineId: string) => list.value.filter((n) => n.lines.includes(lineId))
  const forTrip = (numbers: string[], stops: Pick<StationRef, 'id' | 'name'>[]) => list.value.filter((n) => aboutTrip(n, numbers, stops))
  function start() {
    if (started) return
    started = true
    poll(async () => { list.value = await api.notices(); loaded.value = true }, 120_000)
  }
  return { list, loaded, alerts, forNumbers, forStation, forLine, forTrip, start }
})
