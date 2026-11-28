<script setup lang="ts">
import { computed } from 'vue'
import type { Connection } from '@/api/types'
import { useNotices } from '@/stores/data'
import { warsawNow } from '@/utils/format'
import { depDelay, dur, expArr, expDep, hm, inWords, lineOf, minutesFrom, plural, transfersText } from '../util'

// Połączenie na liście wyników (karta .pol z makiety): godziny, „za 12 min · +3 min”, linie, czas jazdy, przesiadki,
// peron, pierwszy komunikat o utrudnieniu na trasie.
const props = defineProps<{ c: Connection; selected?: boolean; now: number }>()
const notices = useNotices()

const delay = computed(() => depDelay(props.c))
const today = computed(() => props.c.departure.slice(0, 10) === warsawNow(new Date(props.now)).date)
const toGo = computed(() => minutesFrom(expDep(props.c), props.now))
const state = computed(() => {
  if (!today.value) return null
  if (toGo.value < 0) return { cls: 'neutr', text: 'odjechał' }
  return { cls: delay.value ? 'op' : toGo.value <= 60 ? 'ok' : 'neutr', text: inWords(toGo.value) + (delay.value ? ` · +${delay.value} min` : '') }
})
const alerts = computed(() => notices.forConnection(props.c).filter((n) => n.severity !== 'info'))
const platform = computed(() => props.c.legs[0].platform)
const separate = computed(() => props.c.legs.some((l) => l.agency === 'IC'))
</script>

<template>
  <button type="button" class="pol" :aria-current="selected">
    <span class="g">
      <span class="godz">
        <s v-if="delay">{{ hm(c.departure) }}</s>
        <span>{{ hm(expDep(c)) }}</span><em>→</em><span>{{ hm(expArr(c)) }}</span>
      </span>
      <span v-if="state" class="znak" :class="state.cls">{{ state.text }}</span>
    </span>
    <span class="meta">
      <span v-for="l in c.legs" :key="l.key" class="lin" :style="{ '--c': lineOf(l).color }">{{ lineOf(l).badge }}</span>
      <span>{{ dur(c.durationMinutes) }}</span>
      <span>{{ transfersText(c) }}</span>
      <span v-if="platform">peron {{ platform }}</span>
      <span v-if="separate">osobny bilet</span>
    </span>
    <span v-if="alerts.length" class="kpas">
      <span class="kzn m" :class="alerts[0].severity === 'danger' ? 'pow' : 'utr'" aria-hidden="true">!</span>
      <b>{{ alerts[0].title }}</b>
      <em v-if="alerts.length > 1">i {{ alerts.length - 1 }} {{ plural(alerts.length - 1, 'kolejny', 'kolejne', 'kolejnych') }}</em>
    </span>
  </button>
</template>
