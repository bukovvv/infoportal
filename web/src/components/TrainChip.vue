<script setup lang="ts">
import { useUi } from '@/stores/ui'
import { agencyLabel, shortNumber } from '@/utils/agency'

// agency: KW, PR (POLREGIO) albo IC (PKP Intercity) — skrót przed numerem
const props = defineProps<{ number: string; tripKey?: string | null; bus?: boolean; agency?: string }>()
const ui = useUi()
const open = () => ui.openTrain(props.tripKey ? { key: props.tripKey } : { number: props.number.split('/')[0] })
</script>

<template>
  <v-chip
    variant="outlined"
    size="small"
    class="train-chip"
    :prepend-icon="bus ? 'directions_bus' : 'train'"
    :aria-label="`Szczegóły pociągu ${agencyLabel(agency)} ${number}`"
    @click.stop="open"
  >
    <span class="text-primary font-weight-bold mr-1">{{ agencyLabel(agency) }}</span>{{ shortNumber(number) }}
  </v-chip>
</template>

<style scoped>
.train-chip :deep(.v-chip__prepend .v-icon) { color: rgb(var(--v-theme-primary)); }
</style>
