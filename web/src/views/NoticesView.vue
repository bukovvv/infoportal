<script setup lang="ts">
import { computed, ref } from 'vue'
import NoticeItem from '@/components/NoticeItem.vue'
import { useNotices } from '@/stores/data'

const notices = useNotices()
const filter = ref<'all' | 'alert' | 'info'>('all')
const list = computed(() => notices.list.filter((n) => filter.value === 'all' || (filter.value === 'info' ? n.severity === 'info' : n.severity !== 'info')))
const filters = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'alert', label: 'Utrudnienia' },
  { value: 'info', label: 'Informacje' },
] as const
</script>

<template>
  <div class="page-narrow">
    <v-chip-group v-model="filter" mandatory selected-class="chip-on" class="py-2 mb-2" aria-label="Filtr komunikatów">
      <v-chip v-for="f in filters" :key="f.value" :value="f.value" variant="outlined" filter>{{ f.label }}</v-chip>
    </v-chip-group>
    <v-card color="surface-container-low">
      <v-skeleton-loader v-if="!notices.loaded" type="list-item-avatar-three-line@3" color="transparent" />
      <NoticeItem v-for="n in list" :key="n.id" :notice="n" />
      <v-empty-state v-if="notices.loaded && !list.length" icon="campaign" title="Brak komunikatów w tej kategorii" text="Gdy przewoźnik zgłosi utrudnienie, pojawi się tutaj i na ekranie startowym." />
    </v-card>
  </div>
</template>

<style scoped>
:deep(.chip-on) { background: rgb(var(--v-theme-secondary-container)); color: rgb(var(--v-theme-on-secondary-container)); border-color: transparent; }
</style>
