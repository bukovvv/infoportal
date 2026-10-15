<script setup lang="ts">
// Wyszukiwarka: jeden chip „Dziś, 14:05 · odjazd” zamiast pól daty, godziny i przełącznika — szczegóły w oknie.
import { computed, ref } from 'vue'
import { warsawNow } from '@/utils/format'
import DateField from './DateField.vue'
import TimeField from './TimeField.vue'

const date = defineModel<string>('date', { required: true })
const time = defineModel<string>('time', { required: true })
const mode = defineModel<'dep' | 'arr'>('mode', { required: true })
defineProps<{ min?: string; max?: string }>()
/** okno zamknięte (Gotowe albo kliknięcie obok) — rodzic odświeża wyniki */
const emit = defineEmits<{ done: [] }>()
const open = ref(false)
const short = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', weekday: 'short', day: 'numeric', month: 'short' })

const day = computed(() => {
  const today = warsawNow()
  const tomorrow = warsawNow(new Date(Date.now() + 86_400_000))
  if (date.value === today.date) return 'Dziś'
  if (date.value === tomorrow.date) return 'Jutro'
  return short.format(new Date(`${date.value}T12:00:00`))
})
const label = computed(() => `${day.value}, ${time.value} · ${mode.value === 'arr' ? 'przyjazd' : 'odjazd'}`)

function now() {
  const n = warsawNow()
  date.value = n.date
  time.value = n.time
  mode.value = 'dep'
}
function close() {
  open.value = false
}
</script>

<template>
  <v-dialog v-model="open" max-width="420" @after-leave="emit('done')">
    <template #activator="{ props: act }">
      <button type="button" class="when-chip" v-bind="act" :aria-label="`${mode === 'arr' ? 'Przyjazd do' : 'Odjazd od'}: ${day}, ${time}. Zmień dzień i godzinę`">
        <v-icon icon="schedule" size="17" /><span class="ellipsis">{{ label }}</span>
      </button>
    </template>
    <v-card title="Kiedy jedziesz?">
      <v-card-text class="when-body">
        <v-btn-toggle v-model="mode" mandatory variant="outlined" divided density="comfortable" class="when-mode" aria-label="Godzina oznacza">
          <v-btn value="dep" :prepend-icon="mode === 'dep' ? 'check' : undefined">Odjazd</v-btn>
          <v-btn value="arr" :prepend-icon="mode === 'arr' ? 'check' : undefined">Przyjazd</v-btn>
        </v-btn-toggle>
        <div class="when-fields">
          <DateField v-model="date" label="Data" :min="min" :max="max" variant="solo-filled" flat />
          <TimeField v-model="time" :label="mode === 'arr' ? 'Przyjazd do' : 'Odjazd od'" variant="solo-filled" flat />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn variant="text" prepend-icon="update" @click="now">Teraz</v-btn>
        <v-spacer />
        <v-btn variant="flat" color="primary" @click="close">Gotowe</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.when-chip {
  display: inline-flex; align-items: center; gap: 5px; max-width: 100%; height: 32px; padding: 0 10px 0 8px;
  border: 1px solid rgb(var(--v-theme-outline)); border-radius: 999px; background: transparent; color: inherit;
  font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
}
.when-chip:hover { background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 6%, transparent); }
.when-chip:focus-visible { outline: 3px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
.when-chip .v-icon:first-child { color: rgb(var(--v-theme-primary)); }
.when-body { display: grid; gap: 16px; }
.when-mode { justify-self: start; }
.when-fields { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 8px; }
.when-fields :deep(.v-field--variant-solo-filled) { background: rgb(var(--v-theme-surface-container)); }
</style>
