<script setup lang="ts">
import { computed } from 'vue'
import type { VehicleInfo } from '@/api/types'

const props = defineProps<{ vehicle: VehicleInfo }>()

const v = computed(() => props.vehicle)
const units = computed(() => v.value.vehicles.filter((u) => u.image))
const label = (u: VehicleInfo['vehicles'][number]) => (u.name ? `${u.name} (${u.series})` : u.series)
const title = computed(() => {
  const names = v.value.vehicles.map(label)
  return names.every((n) => n === names[0]) && names.length > 1 ? `${names.length} × ${names[0]}` : names.join(' + ')
})
</script>

<template>
  <section class="vehicle" aria-labelledby="vehicle-title">
    <h3 id="vehicle-title" class="text-title-small"><span class="muted">Możesz spodziewać się pojazdu:</span> {{ title }}</h3>
    <a v-if="units.length" :href="v.url" target="_blank" rel="noopener noreferrer" class="drawing" title="Zestawienie i rysunek: vagonWEB.cz">
      <img
        v-for="(u, i) in units"
        :key="i"
        :src="u.image!"
        :width="u.width ?? undefined"
        :height="u.height ?? undefined"
        :alt="`Rysunek pojazdu ${label(u)}`"
        loading="lazy"
      >
    </a>
  </section>
</template>

<style scoped>
.vehicle { display: grid; gap: 12px; padding: 16px 24px 20px; }
.drawing { display: flex; align-items: flex-end; gap: 2px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: thin; }
.drawing img { flex: none; display: block; max-width: none; height: auto; }
</style>
