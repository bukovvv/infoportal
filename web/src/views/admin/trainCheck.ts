import { reactive } from 'vue'
import { api } from '@/api/client'
import { isPartner } from '@/utils/agency'
import { clock } from '@/utils/format'
import { noticeTrainInput, parseNoticeTrain } from '@/utils/notices'

// Sprawdzanie numerów pociągów z komunikatu w rozkładzie (dziś/jutro, jak wyszukiwarka pociągów) — po kolei, z pamięcią,
// żeby nie wpaść w limit zapytań. Sam numer: najpierw pociąg przewoźnika regionu, inaczej POLREGIO / PKP Intercity (agency).
export type TrainCheck = { state: 'checking' } | { state: 'ok'; text: string; agency?: string } | { state: 'missing' } | { state: 'error' }

export const trainChecks = reactive(new Map<string, TrainCheck>())
let queue: Promise<void> = Promise.resolve()

export function checkTrains(numbers: string[]) {
  for (const n of numbers) {
    if (trainChecks.has(n) || noticeTrainInput(n) !== n) continue
    trainChecks.set(n, { state: 'checking' })
    queue = queue.then(async () => {
      try {
        const { agency, number } = parseNoticeTrain(n)
        const exact = (await api.searchTrains(number)).trains.filter((x) => x.exact)
        const t = n === number ? exact.find((x) => !isPartner(x.agency)) ?? exact[0] : exact.find((x) => x.agency === agency)
        trainChecks.set(n, t ? { state: 'ok', text: `${t.origin} ${clock(t.departure)} → ${t.destination}`, agency: t.agency } : { state: 'missing' })
      } catch {
        trainChecks.set(n, { state: 'error' })
      }
    })
  }
}
