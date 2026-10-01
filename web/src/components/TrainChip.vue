<script setup lang="ts">
import { useUi } from '@/stores/ui'

const props = defineProps<{ number: string; tripKey?: string | null; bus?: boolean }>()
const ui = useUi()
const open = () => ui.openTrain(props.tripKey ? { key: props.tripKey } : { number: props.number.split('/')[0] })
</script>

<template>
  <v-chip
    variant="outlined"
    size="small"
    class="train-chip"
    :prepend-icon="bus ? 'directions_bus' : 'train'"
    :aria-label="`Szczegóły pociągu KW ${number}`"
    @click.stop="open"
  >
    <span class="text-primary font-weight-bold mr-1">KW</span>{{ number }}
  </v-chip>
</template>

<style scoped>
.train-chip :deep(.v-chip__prepend .v-icon) { color: rgb(var(--v-theme-primary)); }
</style>
