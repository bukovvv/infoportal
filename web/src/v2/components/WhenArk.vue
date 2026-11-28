<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { warsawNow } from '@/utils/format'
import { addDays, dayChip, fullDate } from '../util'
import Ark from './Ark.vue'

// „Kiedy jedziesz?” z makiety: odjazd/przyjazd, dzień (dziś + 6 dni) i godzina w dwóch kolumnach ze strzałkami.
// Zmiany w kopii roboczej; „Pokaż połączenia” zapisuje je i szuka od nowa.
const open = defineModel<boolean>({ required: true })
const date = defineModel<string>('date', { required: true })
const time = defineModel<string>('time', { required: true })
const arriveBy = defineModel<boolean>('arriveBy', { required: true })
const emit = defineEmits<{ apply: [] }>()

const d = ref('')
const h = ref(0)
const m = ref(0)
const arr = ref(false)
const today = ref(warsawNow().date)
watch(open, (o) => {
  if (!o) return
  today.value = warsawNow().date
  d.value = date.value
  ;[h.value, m.value] = time.value.split(':').map(Number)
  arr.value = arriveBy.value
}, { immediate: true })

const days = computed(() => Array.from({ length: 7 }, (_, i) => addDays(today.value, i)))
const pad = (n: number) => String(n).padStart(2, '0')
const step = (k: 'h' | 'm', dir: 1 | -1) => {
  if (k === 'h') h.value = (h.value + dir + 24) % 24
  else m.value = (Math.round(m.value / 5) * 5 + dir * 5 + 60) % 60 // minuty co 5
}
function now() {
  const w = warsawNow()
  d.value = w.date
  ;[h.value, m.value] = w.time.split(':').map(Number)
  arr.value = false
}
function apply() {
  date.value = d.value
  time.value = `${pad(h.value)}:${pad(m.value)}`
  arriveBy.value = arr.value
  open.value = false
  emit('apply')
}
</script>

<template>
  <Ark v-model="open" title="Kiedy jedziesz?">
    <div class="na-papierze">
      <div class="seg" role="group" aria-label="Godzina odjazdu czy przyjazdu">
        <button type="button" :aria-pressed="!arr" @click="arr = false">Odjazd</button>
        <button type="button" :aria-pressed="arr" @click="arr = true">Przyjazd</button>
      </div>
    </div>
    <div class="kol" style="gap: 6px">
      <b>Dzień</b>
      <div class="dni na-papierze">
        <button v-for="x in days" :key="x" type="button" class="chip" :aria-pressed="d === x" @click="d = x">{{ dayChip(x, today) }}</button>
      </div>
      <p class="dr maly">{{ fullDate(d) }}</p>
    </div>
    <div class="kol" style="gap: 6px">
      <b>Godzina</b>
      <div class="zegar">
        <div class="slup">
          <button type="button" class="kolo" aria-label="Godzina: później" @click="step('h', 1)"><v-icon icon="keyboard_arrow_up" /></button>
          <b class="num" aria-live="polite">{{ pad(h) }}</b>
          <button type="button" class="kolo" aria-label="Godzina: wcześniej" @click="step('h', -1)"><v-icon icon="keyboard_arrow_down" /></button>
          <span>godzina</span>
        </div>
        <span class="dw" aria-hidden="true">:</span>
        <div class="slup">
          <button type="button" class="kolo" aria-label="Minuty: później" @click="step('m', 1)"><v-icon icon="keyboard_arrow_up" /></button>
          <b class="num" aria-live="polite">{{ pad(m) }}</b>
          <button type="button" class="kolo" aria-label="Minuty: wcześniej" @click="step('m', -1)"><v-icon icon="keyboard_arrow_down" /></button>
          <span>minuty</span>
        </div>
      </div>
    </div>
    <div class="strony">
      <button type="button" class="drugi" @click="now">Teraz</button>
      <button type="button" class="glowny" style="height: 48px; font-size: 15px" @click="apply">Pokaż połączenia</button>
    </div>
  </Ark>
</template>
