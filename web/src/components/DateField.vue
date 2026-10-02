<script setup lang="ts">
// Pole daty MD3: czytelna data w polu, kalendarz VDatePicker w oknie. Wartość: 'RRRR-MM-DD'.
import { computed, ref } from 'vue'

// klasy i style z rodzica trafiają na pole, nie na okno
defineOptions({ inheritAttrs: false })
const model = defineModel<string>({ required: true })
defineProps<{ label: string; min?: string; max?: string; density?: 'default' | 'comfortable' | 'compact' }>()
const open = ref(false)

const pad = (n: number) => String(n).padStart(2, '0')
// data lokalna bez przesunięć strefy: 'RRRR-MM-DD' ↔ Date o północy
const picked = computed({
  get: () => {
    const [y, m, d] = model.value.split('-').map(Number)
    return new Date(y, m - 1, d)
  },
  set: (v: Date | null) => {
    if (!v) return
    model.value = `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`
    open.value = false
  },
})
// krótko, żeby zmieściło się obok godziny na telefonie: „pt., 2 paź”
const short = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', weekday: 'short', day: 'numeric', month: 'short' })
const text = computed(() => (model.value ? short.format(new Date(`${model.value}T12:00:00`)) : ''))
</script>

<template>
  <v-dialog v-model="open" width="auto">
    <template #activator="{ props: act }">
      <v-text-field
        v-bind="{ ...$attrs, ...act }"
        :model-value="text"
        :label="label"
        :density="density"
        prepend-inner-icon="calendar_today"
        readonly
        hide-details
        class="picker-field"
        @keydown.enter.prevent="open = true"
        @keydown.space.prevent="open = true"
      />
    </template>
    <v-date-picker
      v-model="picked"
      :min="min"
      :max="max"
      :first-day-of-week="1"
      title="Wybierz dzień"
      color="primary"
      show-adjacent-months
    />
  </v-dialog>
</template>

<style scoped>
.picker-field :deep(input) { cursor: pointer; }
</style>
