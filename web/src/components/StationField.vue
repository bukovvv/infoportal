<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Station } from '@/api/types'
import { useStations } from '@/stores/data'
import { useFavorites } from '@/stores/favorites'

const model = defineModel<string | null>({ default: null })
defineProps<{ label: string; icon?: string; hideDetails?: boolean; density?: 'default' | 'comfortable' | 'compact' }>()
const stations = useStations()
const favorites = useFavorites()
const query = ref('')

onMounted(() => { void stations.load() })

const items = computed<Station[]>(() => {
  const selected = model.value ? stations.byId.get(model.value) : undefined
  const q = selected && query.value === selected.name ? '' : query.value
  // bez wpisanego tekstu ulubione stacje na górze
  const fav = q ? [] : favorites.ids.flatMap((id) => stations.byId.get(id) ?? [])
  const list = [...fav, ...stations.search(q ?? '', 8).filter((s) => !fav.includes(s))]
  // wybrana stacja musi być na liście (pole pokazuje jej nazwę), ale przy wpisanym tekście na końcu — Enter wybiera pierwszą podpowiedź
  if (!selected || list.includes(selected)) return list
  return q ? [...list, selected] : [selected, ...list]
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
      <v-list-item v-bind="itemProps" :prepend-icon="favorites.has(item.id) ? 'star-fill' : 'signpost'" />
    </template>
  </v-autocomplete>
</template>
