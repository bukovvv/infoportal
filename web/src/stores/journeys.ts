import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { api } from '@/api/client'
import type { Connection, Trip } from '@/api/types'
import { pushSupport, unwatchJourney, watchJourney } from '@/utils/push'
import { read, useUi, write } from './ui'

export interface Journey {
  id: string
  savedAt: string
  from: string
  to: string
  connection: Connection
  /** powiadomienia push o opóźnieniach i odwołaniach (subskrypcja na serwerze do końca podróży) */
  notify?: boolean
}

export interface JourneyLegState {
  key: string
  number: string
  departure: string
  arrival: string
  expectedDeparture: string | null
  expectedArrival: string | null
  delay: number | null
  cancelled: boolean
  platform: string | null
}

const STORAGE_KEY = 'kw_journeys_v1'

export const useJourneys = defineStore('journeys', () => {
  const list = ref<Journey[]>(read<Journey[]>(STORAGE_KEY, []))
  const trips = ref<Record<string, Trip>>({})
  /** podróże, dla których trwa włączanie/wyłączanie powiadomień */
  const pending = ref<Record<string, boolean>>({})
  const ui = useUi()
  watch(list, (value) => write(STORAGE_KEY, value), { deep: true })

  const idOf = (c: Connection) => c.legs.map((l) => l.key).join('+') + '|' + c.departure

  function has(c: Connection) {
    return list.value.some((j) => j.id === idOf(c))
  }

  function add(c: Connection) {
    if (has(c)) return false
    list.value.unshift({ id: idOf(c), savedAt: new Date().toISOString(), from: c.legs[0].from.name, to: c.legs.at(-1)!.to.name, connection: c })
    void refresh()
    return true
  }

  function remove(id: string) {
    const index = list.value.findIndex((j) => j.id === id)
    if (index < 0) return null
    const [removed] = list.value.splice(index, 1)
    if (removed.notify) void unwatchJourney(removed.id).catch(() => undefined)
    return removed
  }

  function restore(j: Journey) {
    if (list.value.some((x) => x.id === j.id)) return
    list.value.unshift(j)
    if (j.notify) void watchJourney(j.id, j.connection).catch(() => { j.notify = false })
  }

  /** Włącza lub wyłącza powiadomienia o podróży; wynik i błędy pokazuje w pasku na dole ekranu. */
  async function setNotify(id: string, on: boolean) {
    const journey = list.value.find((j) => j.id === id)
    if (!journey || pending.value[id]) return
    if (on) {
      const support = pushSupport()
      if (support === 'ios-install') {
        ui.notify('Na iPhonie powiadomienia działają w aplikacji: Udostępnij → Do ekranu początkowego, potem otwórz ją z ekranu.')
        return
      }
      if (support === 'unsupported') {
        ui.notify('Ta przeglądarka nie obsługuje powiadomień.')
        return
      }
    }
    pending.value[id] = true
    try {
      if (on) await watchJourney(id, journey.connection)
      else await unwatchJourney(id)
      journey.notify = on
      ui.notify(on ? 'Powiadomimy Cię o opóźnieniu, odwołaniu i zagrożonej przesiadce.' : 'Wyłączono powiadomienia o tej podróży.')
    } catch (e) {
      ui.notify((e as Error).message || 'Nie udało się zmienić powiadomień. Spróbuj ponownie.')
    } finally {
      delete pending.value[id]
    }
  }

  /** „Powiadom” przy połączeniu: obserwuje je (jeśli trzeba) i włącza powiadomienia. */
  async function notifyFor(c: Connection) {
    add(c)
    await setNotify(idOf(c), true)
  }

  /** Aktualne dane kursów dla podróży dzisiejszych i przyszłych (maks. co minutę). */
  async function refresh() {
    const now = Date.now()
    const keys = new Set<string>()
    for (const j of list.value) {
      if (new Date(j.connection.arrival).getTime() < now - 3600_000) continue
      if (new Date(j.connection.departure).getTime() > now + 12 * 3600_000) continue
      j.connection.legs.forEach((l) => keys.add(l.key))
    }
    await Promise.all([...keys].map(async (key) => {
      try { trips.value[key] = await api.trip(key) } catch { /* kurs mógł zniknąć z rozkładu */ }
    }))
  }

  /** Stan odcinka: rozkład + dane na żywo z odpowiedzi /trips. */
  function legState(journey: Journey, index: number): JourneyLegState {
    const leg = journey.connection.legs[index]
    const trip = trips.value[leg.key]
    const from = trip?.stops.find((s) => s.station.id === leg.from.id)
    const to = trip ? [...trip.stops].reverse().find((s) => s.station.id === leg.to.id) : undefined
    return {
      key: leg.key,
      number: leg.number,
      departure: leg.departure,
      arrival: leg.arrival,
      expectedDeparture: from?.expectedDeparture ?? leg.expectedDeparture,
      expectedArrival: to?.expectedArrival ?? leg.expectedArrival,
      delay: from?.departureDelay ?? trip?.realtime.delay ?? leg.departureDelay,
      cancelled: trip?.realtime.cancelled ?? false,
      platform: from?.platform ?? leg.platform,
    }
  }

  const sorted = computed(() => [...list.value].sort((a, b) => a.connection.departure.localeCompare(b.connection.departure)))

  const notifying = (c: Connection) => list.value.some((j) => j.id === idOf(c) && j.notify)

  return { list, sorted, trips, pending, idOf, has, add, remove, restore, setNotify, notifyFor, notifying, refresh, legState }
})
