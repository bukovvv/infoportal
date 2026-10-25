<script setup lang="ts">
// Data i godzina publikacji komunikatu: 'RRRR-MM-DDTGG:MM' albo '' (bez granicy). Pola MD3 (DateField + TimeField), nie natywne.
import { computed } from 'vue'
import DateField from '@/components/DateField.vue'
import TimeField from '@/components/TimeField.vue'
import { localStamp } from '@/utils/noticeText'

const model = defineModel<string>({ required: true })
const props = defineProps<{ label: string; emptyText: string; defaultTime?: string }>()

const date = computed({
  get: () => model.value.slice(0, 10),
  set: (v: string) => { model.value = `${v}T${model.value.slice(11, 16) || props.defaultTime || '00:00'}` },
})
const time = computed({
  get: () => model.value.slice(11, 16),
  set: (v: string) => { model.value = `${model.value.slice(0, 10)}T${v}` },
})
function set() {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  model.value = props.defaultTime ? `${localStamp(d).slice(0, 10)}T${props.defaultTime}` : localStamp(d)
}
</script>

<template>
  <fieldset class="stamp">
    <legend class="text-label-large muted">{{ label }}</legend>
    <div v-if="model" class="row">
      <DateField v-model="date" label="Dzień" density="comfortable" class="d" />
      <TimeField v-model="time" label="Godzina" density="comfortable" class="t" />
      <v-btn icon="close" variant="text" size="small" :aria-label="`${label}: usuń datę`" @click="model = ''" />
    </div>
    <div v-else class="row">
      <span class="empty text-body-large">{{ emptyText }}</span>
      <v-btn variant="outlined" size="small" prepend-icon="calendar_month" @click="set">Ustaw datę</v-btn>
    </div>
  </fieldset>
</template>

<style scoped>
.stamp { border: 0; margin: 0; padding: 0; min-width: 0; display: grid; gap: 6px; }
.row { display: flex; align-items: center; gap: 8px; min-height: 48px; }
.d { flex: 3 1 140px; }
.t { flex: 2 1 100px; }
.empty { flex: 1; }
</style>
