<script setup lang="ts">
import { computed } from 'vue'
import type { Notice } from '@/api/types'
import { useUi } from '@/stores/ui'
import { ago, dateTime, plural } from '@/utils/format'
import { noticeIcon, noticeLabel, plainBody } from '@/utils/notices'
import TrainChip from './TrainChip.vue'

// link: cały komunikat prowadzi do jego strony (tytuł jest linkiem rozciągniętym na kartę, chipy pociągów zostają osobnymi przyciskami)
// compact: skrót na starcie, tablicy, stronie pociągu — 2 linie treści i najwyżej 3 pociągi (reszta jako „+N”); first: te numery na początek
const props = defineProps<{ notice: Notice; compact?: boolean; link?: boolean; first?: string[] }>()
const ui = useUi()
const MAX_TRAINS = 3
const trains = computed(() => {
  const all = props.first?.length ? [...props.notice.trains].sort((a, b) => Number(!props.first!.includes(a)) - Number(!props.first!.includes(b))) : props.notice.trains
  return props.compact ? all.slice(0, MAX_TRAINS) : all
})
const more = computed(() => props.notice.trains.length - trains.value.length)
</script>

<template>
  <article class="notice" :class="{ linked: link, compact }">
    <span class="notice-ic" :class="notice.severity"><v-icon :icon="noticeIcon[notice.severity]" /></span>
    <div class="notice-body min-w-0">
      <div class="text-label-medium muted top">
        <span>{{ noticeLabel[notice.severity] }}</span><span aria-hidden="true">·</span>
        <time :datetime="notice.updatedAt" :title="`Aktualizacja: ${dateTime(notice.updatedAt)}`">{{ compact ? ago(notice.updatedAt) : dateTime(notice.updatedAt) }}</time>
      </div>
      <h3 class="text-title-medium">
        <router-link v-if="link" :to="{ name: 'notice', params: { id: notice.id } }" class="notice-link" @click="ui.closeTrain()">{{ notice.title }}</router-link>
        <template v-else>{{ notice.title }}</template>
      </h3>
      <p class="text-body-medium muted notice-text" :class="{ clamp: compact }">{{ plainBody(notice.body) }}</p>
      <div class="text-body-small muted scope" :title="notice.line"><v-icon icon="route" size="16" /><span class="ellipsis">{{ notice.line }}</span></div>
      <div v-if="notice.trains.length" class="trains">
        <TrainChip v-for="n in trains" :key="n" :number="n" class="above" />
        <span v-if="more > 0" class="more text-label-medium">+{{ more }} {{ plural(more, 'pociąg', 'pociągi', 'pociągów') }}</span>
      </div>
    </div>
    <v-icon v-if="link" icon="chevron_right" class="notice-go muted" aria-hidden="true" />
  </article>
</template>

<style scoped>
.notice { position: relative; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 4px 16px; padding: 16px; }
.notice.linked { grid-template-columns: auto minmax(0, 1fr) auto; transition: background-color 0.15s; }
.notice.linked:hover { background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 6%, transparent); }
.notice.linked:has(.notice-link:focus-visible) { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: -2px; }
.notice + .notice { border-top: 1px solid rgb(var(--v-theme-outline-variant)); }
.notice-body { display: grid; gap: 6px; }
.notice-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: var(--kw-r-m); }
.notice-ic.danger { background: rgb(var(--v-theme-error-container)); color: rgb(var(--v-theme-on-error-container)); }
.notice-ic.warning { background: rgb(var(--v-theme-warning-container)); color: rgb(var(--v-theme-on-warning-container)); }
.notice-ic.info { background: rgb(var(--v-theme-surface-container-highest)); color: rgb(var(--v-theme-on-surface-variant)); }
.notice-link { color: inherit; text-decoration: none; outline: none; }
.notice-link::after { content: ''; position: absolute; inset: 0; }
.notice-go { align-self: center; }
.top { display: flex; gap: 6px; white-space: nowrap; }
.scope { display: flex; align-items: center; gap: 6px; min-width: 0; }
.trains { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; margin-top: 2px; }
.more { color: rgb(var(--v-theme-on-surface-variant)); }
.above { position: relative; z-index: 1; }
.notice-text { white-space: pre-line; }
.clamp { display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
