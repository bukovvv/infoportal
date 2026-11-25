<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { Notice, Severity } from '@/api/types'
import { noticeState, periodText, relativeText, STATE_LABEL, stampMs } from '@/utils/adminNotices'
import { plural } from '@/utils/format'

// Jeden komunikat w panelu: kółko rodzaju, tytuł, czego dotyczy, okres publikacji. Link do listy z wybranym komunikatem.
const props = defineProps<{ notice: Notice; current?: boolean; showState?: boolean; now?: number }>()

const state = computed(() => noticeState(props.notice, props.now))
const end = computed(() => stampMs(props.notice.endsAt))
const soon = computed(() => state.value === 'live' && end.value !== null && end.value - (props.now ?? Date.now()) < 6 * 3_600_000)
const trains = computed(() => props.notice.trains.length)
// na liście filtr zostaje w adresie (?stan=), z pulpitu — sam wybór
const route = useRoute()
const to = computed(() => ({ name: 'admin-notices', query: { ...(route.name === 'admin-notices' ? route.query : {}), k: String(props.notice.id) } }))
</script>

<script lang="ts">
/** Kółko rodzaju jak w części pasażerskiej 2.0: „i” informacja, „!” utrudnienie, „!” na pełnym bursztynie poważne. */
export const KZN: Record<Severity, { cls: string; sign: string; label: string }> = {
  info: { cls: 'info', sign: 'i', label: 'Informacja' },
  warning: { cls: 'utr', sign: '!', label: 'Utrudnienie' },
  danger: { cls: 'pow', sign: '!', label: 'Poważne utrudnienie' },
}
</script>

<template>
  <RouterLink :to="to" class="akom" :aria-current="current ? 'true' : undefined">
    <span class="kzn" :class="KZN[notice.severity].cls" :title="KZN[notice.severity].label" aria-hidden="true">{{ KZN[notice.severity].sign }}</span>
    <span class="min-w-0">
      <span class="t">{{ notice.title }}</span>
      <span class="z">
        <span v-if="showState" class="znacz" :class="state">{{ STATE_LABEL[state] }}</span>
        <span v-if="notice.source === 'plk'" class="znacz plk">z PKP PLK</span>
        <span>{{ notice.line }}</span>
        <span v-if="trains">· {{ trains }} {{ plural(trains, 'pociąg', 'pociągi', 'pociągów') }}</span>
      </span>
    </span>
    <span class="kiedy num" :class="{ blisko: soon }">{{ periodText(notice) }}<small>{{ relativeText(notice, now) }}</small></span>
  </RouterLink>
</template>
