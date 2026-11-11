<script setup lang="ts">
// Mapa: stacja po dotknięciu — linie, komunikaty i najbliższe odjazdy (mini-tablica), dalej pełna tablica albo wyszukiwarka od tej stacji.
import { computed, ref, watch } from 'vue'
import { api } from '@/api/client'
import type { BoardRow, Station } from '@/api/types'
import NoticeStrip from '@/components/NoticeStrip.vue'
import RouteBadge from '@/components/RouteBadge.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useNotices } from '@/stores/data'
import { agencyLabel, shortNumber } from '@/utils/agency'
import { clock } from '@/utils/format'
import { lineTitle, NOTICE_LINES } from '@/utils/notices'
import { linesAt } from '@/utils/scheme'

const props = defineProps<{ station: Station; dark: boolean }>()
const emit = defineEmits<{ close: []; train: [key: string] }>()
const notices = useNotices()

const rows = ref<BoardRow[] | null>(null)
const error = ref<string | null>(null)
const lines = computed(() => linesAt(props.station.name, NOTICE_LINES))
const stationNotices = computed(() => notices.forStation(props.station))

watch(() => props.station.id, async (id) => {
  rows.value = null
  error.value = null
  try {
    const board = await api.board(id, 'dep', 5)
    if (id === props.station.id) rows.value = board.rows
  } catch (e) {
    if (id === props.station.id) error.value = (e as Error).message
  }
}, { immediate: true })
</script>

<template>
  <section class="map-sheet" :aria-label="`Stacja ${station.name}`">
    <div class="head">
      <div class="grow">
        <h2 class="text-title-large name">{{ station.name }}</h2>
        <div v-if="lines.length" class="lines">
          <span v-for="l in lines" :key="l.id" class="line" :style="{ background: dark && l.dark ? l.dark : l.color, color: dark && l.dark ? '#1A1111' : '#FFFFFF' }" :title="lineTitle(l)">{{ l.badge ?? l.name }}</span>
        </div>
      </div>
      <v-btn icon="close" variant="tonal" size="40" aria-label="Zamknij" @click="emit('close')" />
    </div>

    <NoticeStrip v-if="stationNotices.length" :notices="stationNotices" :max="1" class="mt-3" />

    <h3 class="text-label-large muted mt-3">Najbliższe odjazdy</h3>
    <ul v-if="rows?.length" class="rows">
      <li v-for="r in rows" :key="r.key">
        <button type="button" class="row" @click="emit('train', r.key)">
          <span class="time" :class="{ gone: r.cancelled }">{{ clock(r.scheduled) }}</span>
          <span class="what">
            <span class="dest ellipsis">{{ r.destination }}</span>
            <span class="no text-body-small muted"><RouteBadge :route="r.route" :bus="r.isBus" />{{ agencyLabel(r.agency) }} {{ shortNumber(r.number) }}<template v-if="r.platform"> · peron {{ r.platform }}</template></span>
          </span>
          <StatusTag :delay="r.delay" :source="r.delaySource" :cancelled="r.cancelled" :skipped="r.skipped" />
        </button>
      </li>
    </ul>
    <p v-else-if="error" class="text-body-medium muted mt-2">{{ error }}</p>
    <p v-else-if="rows" class="text-body-medium muted mt-2">W najbliższych godzinach brak odjazdów.</p>
    <div v-else class="rows"><v-skeleton-loader v-for="i in 3" :key="i" type="list-item-two-line" /></div>

    <div class="actions">
      <v-btn color="primary" variant="flat" :to="{ name: 'board', params: { stationId: station.id } }">Pełna tablica</v-btn>
      <v-btn variant="outlined" :to="{ name: 'start', query: { z: station.id }, hash: '#szukaj' }">Połączenie stąd</v-btn>
    </div>
  </section>
</template>

<style scoped>
.head { display: flex; align-items: flex-start; gap: 8px; }
.grow { flex: 1; min-width: 0; }
.name { margin: 0; font-weight: 800; }
.lines { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.line { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: 999px; font-size: 11px; font-weight: 800; white-space: nowrap; }
.rows { display: grid; margin: 4px 0 0; padding: 0; list-style: none; }
.row {
  display: grid; grid-template-columns: 52px minmax(0, 1fr) auto; align-items: center; gap: 10px; width: 100%; padding: 8px 4px; border: 0;
  border-top: 1px solid rgb(var(--v-theme-outline-variant)); background: none; color: inherit; font: inherit; text-align: left; cursor: pointer;
}
li:first-child .row { border-top: 0; }
.row:hover { background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 5%, transparent); }
.row:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: -2px; }
.time { font-size: 17px; font-weight: 800; font-variant-numeric: tabular-nums; }
.time.gone { text-decoration: line-through; opacity: .6; }
.what { display: grid; gap: 2px; min-width: 0; }
.dest { font-weight: 700; }
.no { display: flex; align-items: center; gap: 6px; }
/* przyciski przyklejone do dołu panelu (na telefonie lista odjazdów się przewija) */
.actions { position: sticky; bottom: -16px; display: flex; gap: 8px; margin: 4px -16px -16px; padding: 12px 16px 16px; background: rgb(var(--v-theme-surface)); }
.actions .v-btn { flex: 1; }
</style>
