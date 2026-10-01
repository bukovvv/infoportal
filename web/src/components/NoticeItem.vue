<script setup lang="ts">
import type { Notice } from '@/api/types'
import { dateTime } from '@/utils/format'
import TrainChip from './TrainChip.vue'

defineProps<{ notice: Notice; compact?: boolean }>()
const icon = { danger: 'cancel-fill', warning: 'warning-fill', info: 'info-fill' } as const
const label = { danger: 'Poważne utrudnienie', warning: 'Utrudnienie', info: 'Informacja' } as const
</script>

<template>
  <article class="notice">
    <span class="notice-ic" :class="notice.severity"><v-icon :icon="icon[notice.severity]" /></span>
    <div class="notice-body min-w-0">
      <div class="text-label-medium muted d-flex flex-wrap ga-2">
        <span>{{ label[notice.severity] }}</span><span aria-hidden="true">·</span><span>{{ notice.line }}</span>
        <span aria-hidden="true">·</span><time :datetime="notice.updatedAt">{{ dateTime(notice.updatedAt) }}</time>
      </div>
      <h3 class="text-title-medium">{{ notice.title }}</h3>
      <p class="text-body-medium muted notice-text" :class="{ clamp: compact }">{{ notice.body }}</p>
      <div v-if="notice.trains.length" class="d-flex flex-wrap ga-2 mt-1">
        <TrainChip v-for="n in notice.trains" :key="n" :number="n" />
      </div>
    </div>
  </article>
</template>

<style scoped>
.notice { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 4px 16px; padding: 16px; }
.notice + .notice { border-top: 1px solid rgb(var(--v-theme-outline-variant)); }
.notice-body { display: grid; gap: 6px; }
.notice-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; }
.notice-ic.danger { background: rgb(var(--v-theme-error-container)); color: rgb(var(--v-theme-on-error-container)); }
.notice-ic.warning { background: rgb(var(--v-theme-warning-container)); color: rgb(var(--v-theme-on-warning-container)); }
.notice-ic.info { background: rgb(var(--v-theme-surface-container-highest)); color: rgb(var(--v-theme-on-surface-variant)); }
.notice-text { white-space: pre-line; }
.clamp { display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
</style>
