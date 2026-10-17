<script setup lang="ts">
// Lista przewoźników z przełącznikami (opcje wyszukiwarki, filtr mapy). Co najmniej jeden zostaje włączony.
import { AGENCIES } from '@/utils/searchOptions'

const selected = defineModel<string[]>({ required: true })
/** notes: krótki dopisek pod nazwą przewoźnika (np. o biletach) */
defineProps<{ notes?: Partial<Record<string, string>> }>()

function toggle(code: string, on: boolean | null) {
  const next = AGENCIES.map((a) => a.code).filter((c) => (c === code ? !!on : selected.value.includes(c)))
  if (next.length) selected.value = next
}
</script>

<template>
  <ul class="agencies" role="list">
    <li v-for="a in AGENCIES" :key="a.code" class="agency" :class="{ off: !selected.includes(a.code) }">
      <span class="mono" :data-code="a.code" aria-hidden="true">{{ a.code }}</span>
      <span class="name">
        <span class="text-body-large font-weight-bold">{{ a.label }}</span>
        <span v-if="notes?.[a.code]" class="text-body-small muted">{{ notes[a.code] }}</span>
      </span>
      <v-switch
        :model-value="selected.includes(a.code)"
        :disabled="selected.length === 1 && selected.includes(a.code)"
        :aria-label="a.label"
        color="primary"
        inset
        density="compact"
        hide-details
        @update:model-value="toggle(a.code, $event)"
      />
    </li>
  </ul>
</template>

<style scoped>
.agencies { list-style: none; margin: 0; padding: 0; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-surface-container)); overflow: hidden; }
.agency { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; align-items: center; gap: 12px; min-height: 64px; padding: 6px 8px 6px 12px; }
.agency + .agency { border-top: 1px solid rgb(var(--v-theme-outline-variant)); }
.name { display: grid; min-width: 0; }
.agency.off .name, .agency.off .mono { opacity: .55; }
/* skrót przewoźnika jak przed numerem pociągu (KW 77600) */
.mono {
  display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%;
  font-size: 13px; font-weight: 800; letter-spacing: .3px;
  background: rgb(var(--v-theme-primary-container)); color: rgb(var(--v-theme-on-primary-container));
}
.mono[data-code='PR'] { background: rgb(var(--v-theme-inverse-surface)); color: rgb(var(--v-theme-on-inverse-surface)); }
.mono[data-code='IC'] { background: rgb(var(--v-theme-warning-container)); color: rgb(var(--v-theme-on-warning-container)); }
.agency :deep(.v-switch) { flex: none; }
</style>
