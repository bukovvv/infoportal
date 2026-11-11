<script setup lang="ts">
// Mapa: utrudnienie po dotknięciu znaczka ⚠ — skrót komunikatu, linie, których dotyczy, i przejście do całości.
import { computed } from 'vue'
import type { Notice } from '@/api/types'
import NoticeItem from '@/components/NoticeItem.vue'
import { lineTitle, noticeLines } from '@/utils/notices'

const props = defineProps<{ notice: Notice; dark: boolean }>()
const emit = defineEmits<{ close: [] }>()
const lines = computed(() => noticeLines(props.notice))
</script>

<template>
  <section class="map-sheet" aria-label="Komunikat">
    <div class="head">
      <NoticeItem :notice="notice" compact class="item" />
      <v-btn icon="close" variant="tonal" size="40" aria-label="Zamknij" @click="emit('close')" />
    </div>
    <div v-if="lines.length" class="lines">
      <router-link v-for="l in lines" :key="l.id" :to="{ name: 'scheme', query: { linia: l.id } }" class="line" :style="{ background: dark && l.dark ? l.dark : l.color, color: dark && l.dark ? '#1A1111' : '#FFFFFF' }">{{ lineTitle(l) }}</router-link>
    </div>
    <div class="actions">
      <v-btn color="primary" variant="flat" :to="{ name: 'notice', params: { id: notice.id } }">Cały komunikat</v-btn>
    </div>
  </section>
</template>

<style scoped>
.head { display: flex; align-items: flex-start; gap: 4px; }
.item { flex: 1; min-width: 0; padding: 0; }
.lines { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.line { display: inline-flex; align-items: center; height: 22px; padding: 0 9px; border-radius: 999px; font-size: 12px; font-weight: 800; text-decoration: none; white-space: nowrap; }
.actions { display: flex; gap: 8px; margin-top: 14px; }
.actions .v-btn { flex: 1; }
</style>
