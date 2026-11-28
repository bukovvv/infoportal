<script setup lang="ts">
import { ref, watch } from 'vue'
import { AGENCIES, DEFAULT_OPTIONS, MIN_TRANSFERS, type SearchOptions } from '@/utils/searchOptions'
import Ark from './Ark.vue'

// „Opcje wyszukiwania” z makiety: przesiadki jako kafle, najkrótszy czas na przesiadkę, przełączniki przewoźników.
const open = defineModel<boolean>({ required: true })
const options = defineModel<SearchOptions>('options', { required: true })
const emit = defineEmits<{ apply: [] }>()

const o = ref<SearchOptions>({ ...DEFAULT_OPTIONS })
watch(open, (v) => { if (v) o.value = { ...options.value, agencies: [...options.value.agencies] } }, { immediate: true })

const TRANSFERS = [
  { v: 0, t: 'Bez przesiadek', d: 'Tylko pociągi bezpośrednie' },
  { v: 1, t: 'Do 1 przesiadki', d: 'Także z jedną przesiadką' },
  { v: 2, t: 'Do 2 przesiadek', d: 'Najwięcej możliwości' },
] as const
function toggle(code: string) {
  const on = o.value.agencies.includes(code)
  if (on && o.value.agencies.length === 1) return // choć jeden przewoźnik musi zostać
  o.value.agencies = on ? o.value.agencies.filter((c) => c !== code) : AGENCIES.map((a) => a.code).filter((c) => c === code || o.value.agencies.includes(c))
}
function apply() {
  options.value = o.value
  open.value = false
  emit('apply')
}
</script>

<template>
  <Ark v-model="open" title="Opcje wyszukiwania">
    <div class="kol" style="gap: 6px">
      <b>Przesiadki</b>
      <div class="wybor wybor-3">
        <button v-for="x in TRANSFERS" :key="x.v" type="button" :aria-pressed="o.maxTransfers === x.v" @click="o.maxTransfers = x.v"><b>{{ x.t }}</b><span>{{ x.d }}</span></button>
      </div>
    </div>
    <div class="kol na-papierze" style="gap: 6px">
      <b>Najkrótszy czas na przesiadkę</b>
      <div class="seg" style="align-self: flex-start" role="group" aria-label="Najkrótszy czas na przesiadkę">
        <button v-for="v in MIN_TRANSFERS" :key="v" type="button" :aria-pressed="o.minTransfer === v" :disabled="o.maxTransfers === 0" :style="o.maxTransfers === 0 ? 'opacity: .4' : ''" @click="o.minTransfer = v">{{ v }} min</button>
      </div>
      <p v-if="o.maxTransfers === 0" class="dr maly">Nie dotyczy połączeń bez przesiadek.</p>
    </div>
    <div class="kol" style="gap: 6px">
      <b>Przewoźnicy</b>
      <div class="plyta" style="padding: 4px 16px">
        <div v-for="a in AGENCIES" :key="a.code" class="przel-rz">
          <span><b>{{ a.label }}</b><small v-if="a.code === 'IC'">osobny bilet</small></span>
          <button type="button" class="przel" role="switch" :aria-checked="o.agencies.includes(a.code)" :aria-label="a.label" @click="toggle(a.code)"><i /></button>
        </div>
      </div>
    </div>
    <div class="strony">
      <button type="button" class="drugi" @click="o = { ...DEFAULT_OPTIONS, agencies: [...DEFAULT_OPTIONS.agencies] }">Przywróć domyślne</button>
      <button type="button" class="glowny" style="height: 48px; font-size: 15px" @click="apply">Pokaż połączenia</button>
    </div>
  </Ark>
</template>

<style scoped>
.wybor-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
@media (max-width: 479px) { .wybor-3 { grid-template-columns: minmax(0, 1fr); } }
</style>
