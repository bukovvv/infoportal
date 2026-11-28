<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDisplay } from 'vuetify'
import type { Connection, Leg } from '@/api/types'
import { useNotices } from '@/stores/data'
import { useJourneys } from '@/stores/journeys'
import { useUi } from '@/stores/ui'
import { warsawNow } from '@/utils/format'
import { downloadIcs } from '@/utils/ics'
import { connectionUrl, shareConnection } from '@/utils/share'
import { addDays, depDelay, dur, expArr, expDep, fullDate, hm, inDial, inWords, lineOf, minutesFrom, plural, short, trainName, trainShort } from '../util'
import Dial from './Dial.vue'

// Szczegóły połączenia (makieta: rDetal): ciemna płyta z godzinami, kafle, komunikaty, każdy pociąg na własnej płycie
// z postojami, „Do kalendarza”, „Powiadom mnie” i „Obserwuj podróż”. Na telefonie na całym ekranie, na komputerze obok listy.
const props = defineProps<{ c: Connection; now: number }>()
const emit = defineEmits<{ close: [] }>()
const notices = useNotices()
const journeys = useJourneys()
const ui = useUi()
const { mdAndUp } = useDisplay()

const today = computed(() => warsawNow(new Date(props.now)).date)
const day = computed(() => props.c.departure.slice(0, 10))
const delay = computed(() => depDelay(props.c))
const toGo = computed(() => minutesFrom(expDep(props.c), props.now))
// najważniejsze zdanie: o której odjeżdża (inny dzień — z datą)
const lead = computed(() => {
  if (day.value !== today.value) return { gl: `Odjazd o ${hm(expDep(props.c))}`, sub: `${day.value === addDays(today.value, 1) ? 'Jutro, ' : ''}${fullDate(day.value)}` }
  if (toGo.value < 0) return { gl: `Pociąg odjechał o ${hm(expDep(props.c))}`, sub: 'Wybierz późniejsze połączenie.' }
  return { gl: `Odjazd o ${hm(expDep(props.c))}`, sub: inDial(toGo.value) ? '' : inWords(toGo.value), dial: inDial(toGo.value) ? toGo.value : 0 }
})
const first = computed(() => props.c.legs[0])
const alerts = computed(() => notices.forConnection(props.c))
const saved = computed(() => journeys.has(props.c))
const notifying = computed(() => !!journeys.list.find((j) => j.id === journeys.idOf(props.c))?.notify)

// postoje odcinka: wsiadanie, stacje pośrednie (zwinięte), wysiadanie
const open = ref(new Set<string>())
const toggle = (k: string) => { const s = new Set(open.value); if (!s.delete(k)) s.add(k); open.value = s }
const stops = (l: Leg) => (l.stops ?? []).filter((s) => !s.skipped)
const past = (iso: string, d: number | null | undefined) => new Date(iso).getTime() + (d ?? 0) * 60_000 < props.now
const at = (iso: string, d: number | null | undefined) => hm(new Date(new Date(iso).getTime() + (d ?? 0) * 60_000).toISOString())
const wait = (i: number) => Math.round((new Date(props.c.legs[i].departure).getTime() - new Date(props.c.legs[i - 1].arrival).getTime()) / 60_000)

function watchJourney() {
  if (saved.value) {
    const removed = journeys.remove(journeys.idOf(props.c))
    ui.notify('Nie obserwujesz już tej podróży.', removed ? { label: 'Cofnij', run: () => journeys.restore(removed) } : undefined)
  } else {
    journeys.add(props.c)
    ui.notify('Dodano do Moich podróży.')
  }
}
</script>

<template>
  <div class="kol" style="gap: 10px">
    <div class="detal-gl">
      <button type="button" class="kolo wroc" aria-label="Wróć do listy połączeń" @click="emit('close')"><v-icon icon="arrow_back" /></button>
      <b>{{ short(c.legs[0].from.name) }} → {{ short(c.legs.at(-1)!.to.name) }}</b>
      <button type="button" class="kolo" aria-label="Udostępnij" @click="shareConnection(c)"><v-icon icon="share" /></button>
    </div>

    <section class="blok kol" style="gap: 6px">
      <template v-if="mdAndUp">
        <p class="wielkie num">{{ hm(expDep(c)) }} → {{ hm(expArr(c)) }}</p>
        <p>{{ lead.gl }}{{ lead.sub ? `, ${lead.sub}` : toGo >= 0 && day === today ? `, pociąg odjeżdża ${inWords(toGo)}` : '' }}</p>
      </template>
      <div v-else class="wiersz" style="gap: 16px">
        <Dial v-if="lead.dial" :minutes="lead.dial" />
        <div style="min-width: 0"><p class="wielkie num">{{ lead.gl }}</p><p v-if="lead.sub">{{ lead.sub }}</p></div>
      </div>
      <p class="dr maly">
        {{ day !== today ? 'Opóźnienia pokażemy w dniu podróży.' : delay ? `Opóźnienie ${delay} min` : 'Na czas' }}{{ mdAndUp ? '' : ` · przyjazd o ${hm(expArr(c))}` }}
      </p>
      <div class="kafle" style="margin-top: 8px">
        <div v-if="first.platform" class="kafel"><span>peron</span><b>{{ first.platform }}<small v-if="first.track"> · tor {{ first.track }}</small></b></div>
        <div class="kafel"><span>czas jazdy</span><b>{{ dur(c.durationMinutes) }}</b></div>
        <div v-if="c.distanceKm" class="kafel"><span>odległość</span><b>{{ c.distanceApprox ? 'ok. ' : '' }}{{ Math.round(c.distanceKm) }} km</b></div>
      </div>
    </section>

    <p v-for="n in alerts" :key="n.id" class="kpas">
      <span class="kzn m" :class="n.severity === 'info' ? 'info' : n.severity === 'danger' ? 'pow' : 'utr'" aria-hidden="true">{{ n.severity === 'info' ? 'i' : '!' }}</span><b>{{ n.title }}</b>
    </p>

    <template v-for="(l, i) in c.legs" :key="l.key">
      <div v-if="i" class="przes"><v-icon icon="directions_walk" size="18" />Przesiadka na stacji {{ short(l.from.name) }} · {{ wait(i) }} min</div>
      <section class="plyta kol" style="gap: 10px">
        <div class="kol" style="gap: 2px; padding: 0 2px">
          <div class="wiersz zawin" style="gap: 4px 10px">
            <span class="lin" :style="{ '--c': lineOf(l).color }" />
            <b class="poc">{{ trainShort(l) }}</b>
          </div>
          <span v-if="trainName(l.number)" class="nazwa-p">„{{ trainName(l.number) }}”</span>
          <span class="dr maly">Przewoźnik: {{ lineOf(l).company }}.{{ lineOf(l).line ? ` Linia ${lineOf(l).line}.` : '' }} Kierunek: {{ short(l.headsign) }}.</span>
          <span v-if="l.agency === 'IC'" class="dr maly">Bilety KW i POLREGIO tu nie obowiązują, potrzebny bilet PKP Intercity.</span>
          <span v-else-if="l.agency === 'PR' && l.kwTickets === false" class="dr maly">Na tym odcinku potrzebny bilet POLREGIO.</span>
        </div>
        <div>
          <div class="os gl p" :class="{ byl: past(l.departure, l.departureDelay) }" :style="{ '--c': lineOf(l).color }">
            <time>{{ at(l.departure, l.departureDelay) }}</time><div class="sz"><i /></div>
            <div class="n"><span>{{ short(l.from.name) }}</span><small v-if="l.platform">peron {{ l.platform }}{{ l.track ? ` · tor ${l.track}` : '' }}</small></div>
          </div>
          <template v-if="stops(l).length">
            <div class="os" :style="{ '--c': lineOf(l).color }">
              <span /><div class="sz" />
              <button type="button" class="chip" style="justify-self: start; height: 36px" :aria-expanded="open.has(l.key)" @click="toggle(l.key)">
                {{ stops(l).length }} {{ plural(stops(l).length, 'przystanek', 'przystanki', 'przystanków') }} po drodze <v-icon :icon="open.has(l.key) ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" size="14" />
              </button>
            </div>
            <div v-if="open.has(l.key)">
              <div v-for="s in stops(l)" :key="s.id" class="os" :class="{ byl: past(s.departure, s.delay) }" :style="{ '--c': lineOf(l).color }">
                <time>{{ at(s.departure, s.delay) }}</time><div class="sz"><i /></div><div class="n"><span>{{ short(s.name) }}</span><small v-if="s.requestOnly">na żądanie</small></div>
              </div>
            </div>
          </template>
          <div class="os gl k" :class="{ byl: past(l.arrival, l.arrivalDelay) }" :style="{ '--c': lineOf(l).color }">
            <time>{{ at(l.arrival, l.arrivalDelay) }}</time><div class="sz"><i /></div>
            <div class="n"><span>{{ short(l.to.name) }}</span><small v-if="l.arrivalPlatform">peron {{ l.arrivalPlatform }}</small></div>
          </div>
        </div>
      </section>
    </template>

    <div class="strony">
      <button type="button" class="drugi" @click="downloadIcs(c, connectionUrl(c))"><v-icon icon="calendar_month" size="18" />Do kalendarza</button>
      <button type="button" class="drugi" :class="{ wlaczony: notifying }" :aria-pressed="notifying" @click="notifying ? journeys.setNotify(journeys.idOf(c), false) : journeys.notifyFor(c)">
        <v-icon icon="notifications" size="18" />{{ notifying ? 'Powiadomienia włączone' : 'Powiadom mnie' }}
      </button>
    </div>
    <div class="cta">
      <button type="button" class="glowny" @click="watchJourney">{{ saved ? 'Obserwujesz podróż' : 'Obserwuj podróż' }}</button>
    </div>
  </div>
</template>

<style scoped>
.poc { font-size: 17px; font-weight: 700; }
.kpas { margin: 0; padding: 0 4px; }
</style>
