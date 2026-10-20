<script setup lang="ts">
import { computed } from 'vue'
import type { Notice } from '@/api/types'
import { plural } from '@/utils/format'
import { noticeIcon, noticeLabel } from '@/utils/notices'

// Komunikaty w karcie połączenia / podróży: po jednej linii (rodzaj + tytuł), każda prowadzi do strony komunikatu; najwyżej `max`, reszta — link do listy.
const props = withDefaults(defineProps<{ notices: Notice[]; max?: number }>(), { max: 2 })
const shown = computed(() => props.notices.slice(0, props.max))
const more = computed(() => props.notices.length - shown.value.length)
</script>

<template>
  <ul v-if="notices.length" class="strip" aria-label="Komunikaty o tym połączeniu">
    <li v-for="n in shown" :key="n.id">
      <router-link :to="{ name: 'notice', params: { id: n.id } }" class="row" :class="n.severity">
        <v-icon :icon="noticeIcon[n.severity]" size="18" class="ic" />
        <span class="sr-only">{{ noticeLabel[n.severity] }}: </span>
        <span class="title ellipsis">{{ n.title }}</span>
        <v-icon icon="chevron_right" size="18" class="go" />
      </router-link>
    </li>
    <li v-if="more > 0">
      <router-link :to="{ name: 'notices' }" class="row more text-body-small">i {{ more }} {{ plural(more, 'kolejny komunikat', 'kolejne komunikaty', 'kolejnych komunikatów') }}</router-link>
    </li>
  </ul>
</template>

<style scoped>
.strip { display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; }
.row {
  --c: var(--v-theme-surface-container-highest); --on: var(--v-theme-on-surface);
  display: flex; align-items: center; gap: 8px; min-height: 36px; padding: 6px 8px 6px 10px; border-radius: var(--kw-r-m);
  background: rgb(var(--c)); color: rgb(var(--on)); text-decoration: none; font-size: 14px; line-height: 20px; font-weight: 600;
}
.row.warning { --c: var(--v-theme-warning-container); --on: var(--v-theme-on-warning-container); }
.row.danger { --c: var(--v-theme-error-container); --on: var(--v-theme-on-error-container); }
.row:hover { filter: brightness(.97); }
.row:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
.ic, .go { flex: none; }
.go { opacity: .7; margin-left: auto; }
.title { min-width: 0; flex: 1; }
.more { min-height: 28px; background: transparent; color: rgb(var(--v-theme-on-surface-variant)); font-weight: 600; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
