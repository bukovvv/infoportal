<script setup lang="ts">
import { computed } from 'vue'
import type { DelaySource } from '@/api/types'

const props = defineProps<{
  delay: number | null | undefined
  source?: DelaySource | 'est' | 'schedule'
  cancelled?: boolean
  skipped?: boolean
  estimated?: boolean
}>()

const tag = computed(() => {
  if (props.cancelled) return { cls: 'tag-error', icon: 'block', text: 'Odwołany' }
  if (props.skipped) return { cls: 'tag-error', icon: 'do_not_disturb_on', text: 'Bez postoju' }
  if (props.delay === null || props.delay === undefined) {
    return props.estimated
      ? { cls: 'tag-est', icon: 'route', text: 'Estymowana' }
      : { cls: 'tag-neutral', icon: 'schedule', text: 'Rozkład' }
  }
  if (props.delay >= 2) return { cls: 'tag-delay', icon: 'schedule', text: `+${props.delay} min` }
  return { cls: 'tag-ontime', icon: 'check', text: props.delay <= -2 ? `${props.delay} min` : 'Planowo' }
})
const title = computed(() => (props.source === 'rt' ? 'Dane z systemu PKP PLK' : props.source === 'gps' ? 'Dane z pozycji GPS' : undefined))
</script>

<template>
  <span class="tag" :class="tag.cls" :title="title">
    <v-icon :icon="tag.icon" />{{ tag.text }}
  </span>
</template>
