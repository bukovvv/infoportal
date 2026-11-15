<script setup lang="ts">
import { computed } from 'vue'
import type { VehicleType } from '@/api/types'
import { useUi } from '@/stores/ui'
import { VEHICLE_KINDS } from '@/utils/vehicle'
import { agencyLabel, shortNumber } from '@/utils/agency'

// agency: KW, PR (POLREGIO) albo IC (PKP Intercity) — skrót przed numerem
// vehicle: rodzaj pojazdu z rozkładu KW — wyróżniony ikoną tylko parowóz i lokomotywa spalinowa (szynobus i EZT jak zwykle)
const props = defineProps<{ number: string; tripKey?: string | null; bus?: boolean; agency?: string; vehicle?: VehicleType | null }>()
const special = computed(() => (props.vehicle && (props.vehicle.kind === 'steam' || props.vehicle.kind === 'diesel') ? VEHICLE_KINDS[props.vehicle.kind] : null))
const ui = useUi()
const open = () => ui.openTrain(props.tripKey ? { key: props.tripKey } : { number: props.number.split('/')[0] })
</script>

<template>
  <v-chip
    variant="outlined"
    size="small"
    class="train-chip"
    :prepend-icon="bus ? 'directions_bus' : special?.icon ?? 'train'"
    :title="special ? special.name : undefined"
    :aria-label="`Szczegóły pociągu ${agencyLabel(agency)} ${number}${special ? ', ' + special.name : ''}`"
    @click.stop="open"
  >
    <span class="text-primary font-weight-bold mr-1">{{ agencyLabel(agency) }}</span>{{ shortNumber(number) }}
  </v-chip>
</template>

<style scoped>
.train-chip :deep(.v-chip__prepend .v-icon) { color: rgb(var(--v-theme-primary)); }
</style>
