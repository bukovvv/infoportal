<script setup lang="ts">
// Pole godziny MD3: tarcza VTimePicker (24 h) w oknie z Anuluj/OK. Wartość: 'GG:MM'.
import { ref, watch } from 'vue'
import { warsawNow } from '@/utils/format'

// klasy i style z rodzica trafiają na pole, nie na okno
defineOptions({ inheritAttrs: false })
const model = defineModel<string>({ required: true })
defineProps<{ label: string; density?: 'default' | 'comfortable' | 'compact' }>()
const open = ref(false)
const draft = ref(model.value)

watch(open, (isOpen) => { if (isOpen) draft.value = model.value })
function save() {
  if (draft.value) model.value = draft.value.slice(0, 5)
  open.value = false
}
</script>

<template>
  <v-dialog v-model="open" width="auto">
    <template #activator="{ props: act }">
      <v-text-field
        v-bind="{ ...$attrs, ...act }"
        :model-value="model"
        :label="label"
        :density="density"
        prepend-inner-icon="schedule"
        readonly
        hide-details
        class="picker-field"
        @keydown.enter.prevent="open = true"
        @keydown.space.prevent="open = true"
      />
    </template>
    <v-card>
      <v-time-picker v-model="draft" format="24hr" title="Wybierz godzinę" color="primary" />
      <v-card-actions>
        <v-btn variant="text" @click="draft = warsawNow().time">Teraz</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="open = false">Anuluj</v-btn>
        <v-btn variant="text" @click="save">OK</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.picker-field :deep(input) { cursor: pointer; }
</style>
