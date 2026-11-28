<script setup lang="ts">
import { computed } from 'vue'
import { useDisplay } from 'vuetify'
import type { Connection } from '@/api/types'
import { useNotices } from '@/stores/data'
import { useJourneys } from '@/stores/journeys'
import { useUi } from '@/stores/ui'
import { warsawNow } from '@/utils/format'
import { downloadIcs } from '@/utils/ics'
import { connectionUrl, shareConnection } from '@/utils/share'
import { addDays, depDelay, dur, expArr, expDep, fullDate, hm, inDial, inWords, minutesFrom, short } from '../util'
import Dial from './Dial.vue'
import LegPlate from './LegPlate.vue'
import TransferBlock from './TransferBlock.vue'

// Szczegóły połączenia (makieta: rDetal): ciemna płyta z godzinami, kafle, komunikaty, każdy pociąg na własnej płycie
// z postojami, „Do kalendarza”, „Powiadom mnie” i „Obserwuj podróż”. Na telefonie na całym ekranie, na komputerze obok listy.
const props = defineProps<{ c: Connection; now: number; back?: boolean }>()
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
      <button type="button" class="kolo wroc" :class="{ zawsze: back }" :aria-label="back ? 'Wróć' : 'Wróć do listy połączeń'" @click="emit('close')"><v-icon icon="arrow_back" /></button>
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
        <div class="kafel"><span>przesiadki</span><b>{{ c.legs.length - 1 || 'brak' }}</b></div>
        <div v-if="c.distanceKm" class="kafel"><span>odległość</span><b>{{ c.distanceApprox ? 'ok. ' : '' }}{{ Math.round(c.distanceKm) }} km</b></div>
      </div>
    </section>

    <p v-for="n in alerts" :key="n.id" class="kpas">
      <span class="kzn m" :class="n.severity === 'info' ? 'info' : n.severity === 'danger' ? 'pow' : 'utr'" aria-hidden="true">{{ n.severity === 'info' ? 'i' : '!' }}</span><b>{{ n.title }}</b>
    </p>

    <template v-for="(l, i) in c.legs" :key="l.key">
      <TransferBlock v-if="i" :from="c.legs[i - 1]" :to="l" />
      <LegPlate :leg="l" :now="now" />
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
.detal-gl:has(.wroc.zawsze) { grid-template-columns: 44px minmax(0, 1fr) 44px; }
.detal-gl .wroc.zawsze { display: grid; }
.kpas { margin: 0; padding: 0 4px; }
</style>
