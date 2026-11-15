<script setup lang="ts">
import { computed } from 'vue'
import type { VehicleInfo, VehicleType } from '@/api/types'
import { unitLabel as label, VEHICLE_KINDS, vehicleAmenities, vehicleTitle } from '@/utils/vehicle'

/** vehicle — skład z vagonWEB (wyłączony do zgody serwisu), type — rodzaj pojazdu z rozkładu KW */
const props = defineProps<{ vehicle?: VehicleInfo | null; type?: VehicleType | null }>()

const v = computed(() => props.vehicle ?? null)
const kind = computed(() => (props.type ? VEHICLE_KINDS[props.type.kind] : null))
const units = computed(() => v.value?.vehicles.filter((u) => u.image) ?? [])
const title = computed(() => (v.value ? vehicleTitle(v.value) : kind.value?.name ?? ''))
const amenities = computed(() => (props.type ? vehicleAmenities(props.type) : []))
</script>

<template>
  <section class="vehicle" aria-labelledby="vehicle-title">
    <div class="vehicle-head">
      <span v-if="kind" class="vehicle-icon" :class="type!.kind" aria-hidden="true"><v-icon :icon="kind.icon" size="22" /></span>
      <div>
        <h3 id="vehicle-title" class="text-title-small"><span class="muted">Możesz spodziewać się pojazdu:</span> {{ title }}</h3>
        <p v-if="kind && !v" class="text-body-small muted">{{ kind.hint }}</p>
      </div>
    </div>
    <ul v-if="amenities.length" class="amenities">
      <li v-for="a in amenities" :key="a.icon" class="text-label-medium" :class="{ off: !a.on }">
        <v-icon :icon="a.icon" size="18" />{{ a.label }}
      </li>
    </ul>
    <component
      :is="v.url ? 'a' : 'div'"
      v-if="v && units.length"
      class="drawing"
      v-bind="v.url ? { href: v.url, target: '_blank', rel: 'noopener noreferrer', title: 'Zestawienie i rysunek: vagonWEB.cz' } : {}"
    >
      <img
        v-for="(u, i) in units"
        :key="i"
        :src="u.image!"
        :width="u.width ?? undefined"
        :height="u.height ?? undefined"
        :alt="`Rysunek pojazdu ${label(u)}`"
        loading="lazy"
      >
    </component>
  </section>
</template>

<style scoped>
.vehicle { display: grid; gap: 12px; padding: 16px 24px 20px; }
.vehicle-head { display: flex; align-items: flex-start; gap: 12px; }
.vehicle-head p { margin-top: 2px; }
.vehicle-icon {
  flex: none; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%;
  background: rgb(var(--v-theme-secondary-container)); color: rgb(var(--v-theme-on-secondary-container));
}
.vehicle-icon.steam { background: rgb(var(--v-theme-tertiary-container)); color: rgb(var(--v-theme-on-tertiary-container)); }
.amenities { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; padding: 0 0 0 52px; }
.amenities li {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px;
  background: rgb(var(--v-theme-surface-container-high)); color: rgb(var(--v-theme-on-surface));
}
.amenities li.off { color: rgb(var(--v-theme-on-surface-variant)); }
.drawing { display: flex; align-items: flex-end; gap: 2px; overflow-x: auto; padding-bottom: 4px; }
.drawing img { flex: none; display: block; max-width: none; height: auto; }
</style>
