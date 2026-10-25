import { reactive } from 'vue'
import { api } from '@/api/client'
import { clock } from '@/utils/format'

// Sprawdzanie numerów pociągów z komunikatu w rozkładzie (dziś/jutro, jak wyszukiwarka pociągów) — po kolei, z pamięcią,
// żeby nie wpaść w limit zapytań.
export type TrainCheck = { state: 'checking' } | { state: 'ok'; text: string } | { state: 'missing' } | { state: 'error' }

export const trainChecks = reactive(new Map<string, TrainCheck>())
let queue: Promise<void> = Promise.resolve()

export function checkTrains(numbers: string[]) {
  for (const n of numbers) {
    if (trainChecks.has(n) || !/^\d{3,6}$/.test(n)) continue
    trainChecks.set(n, { state: 'checking' })
    queue = queue.then(async () => {
      try {
        const res = await api.searchTrains(n)
        const t = res.trains.find((x) => x.exact)
        trainChecks.set(n, t ? { state: 'ok', text: `${t.origin} ${clock(t.departure)} → ${t.destination}` } : { state: 'missing' })
      } catch {
        trainChecks.set(n, { state: 'error' })
      }
    })
  }
}
