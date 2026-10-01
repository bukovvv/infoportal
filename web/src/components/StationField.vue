<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Station } from '@/api/types'
import { useStations } from '@/stores/data'
import { plural } from '@/utils/format'

const model = defineModel<string | null>({ default: null })
defineProps<{ label: string; icon?: string; hideDetails?: boolean; density?: 'default' | 'comfortable' | 'compact' }>()
const stations = useStations()
const query = ref('')

onMounted(() => { void stations.load() })

const items = computed<Station[]>(() => {
  const selected = model.value ? stations.byId.get(model.value) : undefined
  const q = selected && query.value === selected.name ? '' : query.value
  const list = stations.search(q ?? '', 8)
  return selected && !list.includes(selected) ? [selected, ...list] : list
})
</script>

<template>
  <v-autocomplete
    v-model="model"
    v-model:search="query"
    :items="items"
    item-title="name"
    item-value="id"
    :label="label"
    :prepend-inner-icon="icon"
    :hide-details="hideDetails ?? 'auto'"
    :density="density"
    :no-filter="true"
    auto-select-first
    :loading="!stations.loaded"
    no-data-text="Brak takiej stacji w rozkładzie KW. Sprawdź pisownię."
    :menu-props="{ maxHeight: 360 }"
  >
    <template #item="{ props: itemProps, item }">
      <v-list-item v-bind="itemProps" prepend-icon="signpost">
        <template #subtitle>
          {{ item.daily }} {{ plural(item.daily, 'kurs', 'kursy', 'kursów') }} dziennie · {{ item.lines.filter((l: string) => l.startsWith('PKM')).join(', ') || 'KW' }}
        </template>
      </v-list-item>
    </template>
  </v-autocomplete>
</template>
