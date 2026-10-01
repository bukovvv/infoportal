<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ route: { short: string; color: string | null; textColor: string | null } | null; bus?: boolean }>()
const style = computed(() => ({
  background: props.bus ? 'rgb(var(--v-theme-surface-container-highest))' : props.route?.color ?? 'rgb(var(--v-theme-primary))',
  color: props.bus ? 'rgb(var(--v-theme-on-surface-variant))' : props.route?.textColor ?? 'rgb(var(--v-theme-on-primary))',
}))
</script>

<template>
  <span v-if="route" class="route-badge" :style="style" :title="bus ? 'Zastępcza komunikacja autobusowa' : `Linia ${route.short}`">
    {{ bus ? 'ZKA' : route.short }}
  </span>
</template>
