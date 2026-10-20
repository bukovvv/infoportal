<script setup lang="ts">
import { computed } from 'vue'
import { bodyBlocks } from '@/utils/notices'

// Treść komunikatu: akapity i listy punktów (bodyBlocks) — zawsze jako tekst, bez v-html. Strona komunikatu i podgląd w panelu.
const props = defineProps<{ body: string }>()
const blocks = computed(() => bodyBlocks(props.body))
</script>

<template>
  <div class="notice-body-text">
    <template v-for="(b, i) in blocks" :key="i">
      <p v-if="b.kind === 'p'" class="text-body-large">{{ b.text }}</p>
      <ul v-else class="text-body-large">
        <li v-for="(item, j) in b.items" :key="j">{{ item }}</li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.notice-body-text { display: grid; gap: 12px; }
.notice-body-text p, .notice-body-text li { white-space: pre-line; text-wrap: pretty; }
.notice-body-text ul { display: grid; gap: 6px; margin: 0; padding-left: 22px; }
.notice-body-text li::marker { color: rgb(var(--v-theme-primary)); }
</style>
