<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { api } from '@/api/client'
import type { BoardRow } from '@/api/types'
import { useStations } from '@/stores/data'
import { useFavorites } from '@/stores/favorites'
import { useUi } from '@/stores/ui'
import { clock, minutesUntil, relative } from '@/utils/format'
import { vHscroll } from '@/utils/hscroll'
import StatusTag from './StatusTag.vue'

/** Najbliższe odjazdy z ulubionych stacji (po 3 na stację, odświeżane co minutę). */
const props = defineProps<{ now: number }>()
const favorites = useFavorites()
const stations = useStations()
const ui = useUi()
const rows = ref<Record<string, BoardRow[] | 'error'>>({})

const list = computed(() => favorites.ids.map((id) => ({ id, name: stations.byId.get(id)?.name ?? '', rows: rows.value[id] })))

async function refresh() {
  await Promise.all(favorites.ids.map(async (id) => {
    try { rows.value[id] = (await api.board(id, 'dep', 3)).rows } catch { rows.value[id] ??= 'error' }
  }))
}

const late = (r: BoardRow) => (r.delay ?? 0) >= 2
const soon = (r: BoardRow) => {
  const m = minutesUntil((late(r) ? r.expected : null) ?? r.scheduled, props.now)
  return m < 60 ? relative(m) : ''
}

let timer: number | undefined
onMounted(() => {
  void stations.load()
  void refresh()
  timer = window.setInterval(() => void refresh(), 60_000)
})
onBeforeUnmount(() => window.clearInterval(timer))
watch(() => favorites.ids.join(), () => void refresh())
</script>

<template>
  <div v-hscroll class="fav-list">
    <article v-for="s in list" :key="s.id" class="fav-station card">
      <router-link :to="{ name: 'board', params: { stationId: s.id } }" class="fav-head">
        <v-icon icon="star-fill" color="primary" size="20" />
        <h3 class="fav-name ellipsis">{{ s.name }}</h3>
        <v-icon icon="chevron_right" class="muted ml-auto" size="20" />
      </router-link>
      <v-skeleton-loader v-if="!s.rows" type="text@2" color="transparent" class="px-4" />
      <p v-else-if="s.rows === 'error'" class="text-body-small muted fav-note">Nie udało się wczytać odjazdów.</p>
      <p v-else-if="!s.rows.length" class="text-body-small muted fav-note">Brak odjazdów KW w najbliższym czasie.</p>
      <template v-else>
        <button
          v-for="r in s.rows"
          :key="r.key + r.scheduled"
          type="button"
          class="fav-row"
          :class="{ cancelled: r.cancelled }"
          @click="ui.openTrain({ key: r.key })"
        >
          <span class="t tnum" :class="{ late: late(r) }">{{ clock(late(r) ? r.expected : r.scheduled) }}</span>
          <span class="fav-main">
            <span class="dest ellipsis">{{ r.destination }}</span>
            <span class="text-body-small muted ellipsis">{{ r.isBus ? 'ZKA' : r.route?.short ?? 'KW' }}<template v-if="r.platform"> · peron {{ r.platform }}</template></span>
          </span>
          <StatusTag v-if="r.cancelled || late(r)" :delay="r.delay" :source="r.delaySource" :cancelled="r.cancelled" />
          <span v-else class="countdown text-body-small">{{ soon(r) }}</span>
        </button>
      </template>
    </article>
  </div>
</template>

<style scoped>
/* na telefonie karty stacji obok siebie (przewijane w bok), szerzej — jedna pod drugą; z myszą widoczny pasek przewijania, bez przyciągania */
.fav-list { display: flex; gap: 12px; overflow-x: auto; margin: 0 -16px; padding: 0 16px 4px; scroll-snap-type: x mandatory; }
@media (hover: none), (pointer: coarse) {
  .fav-list { scrollbar-width: none; }
  .fav-list::-webkit-scrollbar { display: none; }
}
@media (hover: hover) and (pointer: fine) {
  .fav-list { scroll-snap-type: none; padding-bottom: 8px; }
  .fav-list::-webkit-scrollbar-track { margin: 0 12px; }
}
.fav-station { flex: none; width: min(300px, 82vw); padding-bottom: 6px; scroll-snap-align: start; }
.fav-list:has(> :only-child) .fav-station { width: 100%; }
@media (min-width: 600px) {
  .fav-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); overflow: visible; margin: 0; padding: 0; }
  .fav-station { width: auto; }
}
.fav-head { display: flex; align-items: center; gap: 8px; padding: 14px 16px 6px; color: inherit; text-decoration: none; }
.fav-name { font-size: 16px; font-weight: 800; margin: 0; min-width: 0; }
.fav-head:hover .fav-name { text-decoration: underline; }
.fav-head:focus-visible { outline: 3px solid rgb(var(--v-theme-primary)); outline-offset: -3px; border-radius: var(--kw-r-l); }
.fav-row {
  display: grid; grid-template-columns: 50px minmax(0, 1fr) auto; gap: 10px; align-items: center; min-height: 48px;
  width: 100%; padding: 6px 16px; border: 0; border-top: 1px solid rgb(var(--v-theme-outline-variant)); background: transparent;
  text-align: left; color: inherit; font: inherit; cursor: pointer;
}
.fav-row:hover { background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 6%, transparent); }
.fav-row:focus-visible { outline: 3px solid rgb(var(--v-theme-primary)); outline-offset: -3px; }
.fav-row .t { font-size: 16px; font-weight: 800; }
.fav-main { display: grid; min-width: 0; }
.dest { font-size: 15px; font-weight: 600; }
.cancelled .t, .cancelled .dest { text-decoration: line-through; color: rgb(var(--v-theme-on-surface-variant)); }
.fav-note { padding: 4px 16px 12px; }
</style>
