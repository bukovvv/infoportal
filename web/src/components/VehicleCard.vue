<script setup lang="ts">
import { computed } from 'vue'
import type { VehicleInfo } from '@/api/types'
import { plural } from '@/utils/format'

const props = defineProps<{ vehicle: VehicleInfo }>()

/** Piktogramy vagonWEB → ikona i opis; pozostałe (klasa, rodzaj miejsc) pomijamy. */
const FEATURES: Record<string, { icon: string; label: string }> = {
  klima: { icon: 'ac_unit', label: 'Klimatyzacja' },
  inv: { icon: 'accessible', label: 'Dla osób z niepełnosprawnościami' },
  kolo: { icon: 'pedal_bike', label: 'Miejsca na rowery' },
  wifi: { icon: 'wifi', label: 'Wi-Fi' },
  '230V': { icon: 'power', label: 'Gniazdka 230 V' },
  wc: { icon: 'wc', label: 'Toaleta' },
}

const dateFmt = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })

const v = computed(() => props.vehicle)
const seen = computed(() => dateFmt.format(new Date(v.value.date + 'T12:00:00')))
const units = computed(() => v.value.vehicles.filter((u) => u.image))
const features = computed(() => {
  const all = new Set(v.value.vehicles.flatMap((u) => u.features))
  return Object.entries(FEATURES).filter(([key]) => all.has(key)).map(([, f]) => f)
})
const seats = computed(() => {
  const counts = v.value.vehicles.map((u) => u.seats)
  return counts.every((n) => n !== null) ? counts.reduce((a, b) => a! + b!, 0) : null
})
const label = (u: VehicleInfo['vehicles'][number]) => (u.name ? `${u.name} (${u.series})` : u.series)
const title = computed(() => {
  const names = v.value.vehicles.map(label)
  return names.every((n) => n === names[0]) && names.length > 1 ? `${names.length} × ${names[0]}` : names.join(' + ')
})
</script>

<template>
  <section class="vehicle" aria-labelledby="vehicle-title">
    <h3 id="vehicle-title" class="text-title-small muted">Możesz spodziewać się pojazdu</h3>
    <div v-if="units.length" class="drawing">
      <img
        v-for="(u, i) in units"
        :key="i"
        :src="u.image!"
        :width="u.width ?? undefined"
        :height="u.height ?? undefined"
        :alt="`Rysunek pojazdu ${label(u)}`"
        loading="lazy"
      >
    </div>
    <div class="d-grid ga-2">
      <p class="text-title-medium">{{ title }}<span v-if="seats" class="text-body-medium muted"> · {{ seats }} {{ plural(seats, 'miejsce siedzące', 'miejsca siedzące', 'miejsc siedzących') }}</span></p>
      <div v-if="features.length" class="d-flex flex-wrap ga-2">
        <span v-for="f in features" :key="f.icon" class="tag tag-neutral"><v-icon :icon="f.icon" />{{ f.label }}</span>
      </div>
      <p class="text-body-small muted">
        Skład zaobserwowany {{ seen }}<template v-if="v.section"> na odcinku {{ v.section }}</template>.
        <template v-if="v.alsoSeen.length">Bywa też: {{ v.alsoSeen.join(', ') }}.</template>
        Pojazd może być inny. Zestawienie i rysunki:
        <a :href="v.url" target="_blank" rel="noopener noreferrer" class="text-primary">vagonWEB.cz</a>.
      </p>
    </div>
  </section>
</template>

<style scoped>
.vehicle { display: grid; gap: 12px; padding: 16px 24px 20px; }
.drawing { display: flex; align-items: flex-end; gap: 2px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: thin; }
.drawing img { flex: none; display: block; max-width: none; height: auto; }
</style>
