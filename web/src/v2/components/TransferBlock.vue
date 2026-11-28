<script setup lang="ts">
import { computed } from 'vue'
import type { Leg } from '@/api/types'
import { hm, minutesBetween as minutes, short } from '../util'

// Przesiadka między dwoma pociągami: stacja, przyjazd i odjazd, zmiana peronu, ile minut zostaje (z opóźnieniami)
// i czy przesiadka jest zagrożona — tak jak powiadomienia o podróży (< 2 min = zagrożona).
const props = defineProps<{ from: Leg; to: Leg }>()

const arr = computed(() => props.from.expectedArrival ?? props.from.arrival)
const dep = computed(() => props.to.expectedDeparture ?? props.to.departure)
const planned = computed(() => minutes(props.from.arrival, props.to.departure))
const real = computed(() => minutes(arr.value, dep.value))
const state = computed(() => (real.value < 2 ? 'zle' : real.value < 5 ? 'malo' : 'ok'))
const platforms = computed(() => {
  const a = props.from.arrivalPlatform
  const b = props.to.platform
  if (a && b) return a === b ? `ten sam peron ${b}` : `z peronu ${a} na peron ${b}`
  return b ? `odjazd z peronu ${b}` : ''
})
const note = computed(() => {
  if (real.value === planned.value) return ''
  if (real.value < 0) return 'Przez opóźnienie pociąg przyjedzie po odjeździe następnego. Wybierz inne połączenie.'
  return `Przez opóźnienie na przesiadkę zostaje ${real.value} min (w rozkładzie ${planned.value} min).`
})
</script>

<template>
  <div class="przesiadka" :class="state">
    <span class="przes-ik" aria-hidden="true"><v-icon icon="directions_walk" size="20" /></span>
    <div class="min-w-0">
      <b>Przesiadka: {{ short(to.from.name) }}</b>
      <small class="dr">przyjazd {{ hm(arr) }} · odjazd {{ hm(dep) }}{{ platforms ? ` · ${platforms}` : '' }}</small>
      <small v-if="note" class="przes-uw">{{ note }}</small>
    </div>
    <div class="przes-czas num" :aria-label="`${Math.max(real, 0)} minut na przesiadkę`"><b>{{ Math.max(real, 0) }}</b><span>min</span></div>
  </div>
</template>

<style scoped>
.przesiadka { position: relative; display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; gap: 12px; align-items: center; margin: 0 10px; padding: 12px 14px; border-radius: var(--r-m); background: var(--plyta-2); }
/* kropkowany łącznik z płytami pociągów nad i pod przesiadką */
.przesiadka::before, .przesiadka::after { content: ''; position: absolute; left: 33px; width: 0; height: 10px; border-left: 3px dotted var(--kreska); }
.przesiadka::before { top: -10px; }
.przesiadka::after { bottom: -10px; }
.przes-ik { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: var(--papier); }
.przesiadka div { display: flex; flex-direction: column; gap: 2px; }
.przesiadka b { font-weight: 700; font-size: 15px; }
.przesiadka small { font-size: 13px; }
.przes-uw { font-weight: 600; color: var(--opoz); }
.przes-czas { min-width: 56px; padding: 6px 10px; border-radius: var(--r-m); background: var(--ok-tlo); color: var(--ok); text-align: center; }
.przes-czas b { display: block; font-size: 22px; line-height: 1; color: inherit; }
.przes-czas span { font-size: 11px; font-weight: 600; }
.przesiadka.malo .przes-czas { background: var(--opoz-tlo); color: var(--opoz); }
.przesiadka.zle .przes-czas { background: var(--opoz); color: var(--papier); }
.min-w-0 { min-width: 0; }
</style>
