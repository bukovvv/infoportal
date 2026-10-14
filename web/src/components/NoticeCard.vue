<script setup lang="ts">
import type { Notice } from '@/api/types'
import { ago, clock, dateTime, dayLabel } from '@/utils/format'
import { noticeIcon, noticeLabel } from '@/utils/notices'
import TrainChip from './TrainChip.vue'

// Karta komunikatu na liście: cała prowadzi do strony komunikatu (link rozciągnięty na kartę), chipy pociągów zostają osobnymi przyciskami.
defineProps<{ notice: Notice; now: number }>()
</script>

<template>
  <article class="n-card" :class="notice.severity">
    <div class="n-top">
      <span class="n-badge"><v-icon :icon="noticeIcon[notice.severity]" size="18" />{{ noticeLabel[notice.severity] }}</span>
      <time class="text-label-medium muted" :datetime="notice.updatedAt" :title="`Aktualizacja: ${dateTime(notice.updatedAt)}`">{{ ago(notice.updatedAt, now) }}</time>
    </div>
    <h2 class="text-title-large n-title">
      <router-link :to="{ name: 'notice', params: { id: notice.id } }" class="n-link">{{ notice.title }}</router-link>
    </h2>
    <p class="text-body-medium muted n-text">{{ notice.body }}</p>
    <div class="n-meta text-body-small">
      <span><v-icon icon="route" size="18" />{{ notice.line }}</span>
      <span v-if="notice.endsAt"><v-icon icon="event" size="18" />do {{ dayLabel(notice.endsAt) }}, {{ clock(notice.endsAt) }}</span>
    </div>
    <div v-if="notice.trains.length" class="n-trains">
      <TrainChip v-for="n in notice.trains" :key="n" :number="n" />
    </div>
  </article>
</template>

<style scoped>
.n-card {
  --n-c: var(--v-theme-surface-container-highest); --n-on: var(--v-theme-on-surface-variant);
  position: relative; display: grid; gap: 10px; padding: 18px 20px 20px; border-radius: var(--kw-r-l);
  background: rgb(var(--v-theme-surface-container-low)); transition: background-color .15s;
}
.n-card.danger { --n-c: var(--v-theme-error-container); --n-on: var(--v-theme-on-error-container); }
.n-card.warning { --n-c: var(--v-theme-warning-container); --n-on: var(--v-theme-on-warning-container); }
.n-card:hover { background: rgb(var(--v-theme-surface-container)); }
.n-card:has(.n-link:focus-visible) { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
.n-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.n-badge {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px 4px 8px; border-radius: 999px;
  background: rgb(var(--n-c)); color: rgb(var(--n-on)); font-size: 13px; font-weight: 600; line-height: 20px;
}
.n-title { line-height: 1.3; }
.n-link { color: inherit; text-decoration: none; outline: none; }
.n-link::after { content: ''; position: absolute; inset: 0; border-radius: inherit; }
.n-text { text-wrap: pretty; white-space: pre-line; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.n-meta { display: flex; flex-wrap: wrap; gap: 6px 16px; color: rgb(var(--v-theme-on-surface-variant)); }
.n-meta span { display: inline-flex; align-items: center; gap: 6px; }
.n-trains { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 8px; padding-top: 2px; }
@media (max-width: 480px) { .n-card { padding: 16px; } }
</style>
