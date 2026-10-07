<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { api } from '@/api/client'
import type { BoardRow } from '@/api/types'
import { useStations } from '@/stores/data'
import { useFavorites } from '@/stores/favorites'
import { useUi } from '@/stores/ui'
import { clock, minutesUntil, relative } from '@/utils/format'
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
  <v-card color="surface-container-low" class="fav">
    <div v-for="s in list" :key="s.id" class="fav-station">
      <router-link :to="{ name: 'board', params: { stationId: s.id } }" class="fav-head">
        <v-icon icon="star-fill" color="primary" size="20" />
        <span class="text-title-small ellipsis">{{ s.name }}</span>
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
          <span class="ellipsis">{{ r.destination }}</span>
          <StatusTag v-if="r.cancelled || late(r)" :delay="r.delay" :source="r.delaySource" :cancelled="r.cancelled" />
          <span v-else class="text-body-small muted">{{ soon(r) }}</span>
        </button>
      </template>
    </div>
  </v-card>
</template>

<style scoped>
.fav-station + .fav-station { border-top: 1px solid rgb(var(--v-theme-outline-variant)); }
.fav-head { display: flex; align-items: center; gap: 8px; padding: 12px 16px 4px; color: inherit; text-decoration: none; }
.fav-head:hover .text-title-small { text-decoration: underline; }
.fav-head:focus-visible { outline: 3px solid rgb(var(--v-theme-secondary)); outline-offset: -3px; }
.fav-row {
  display: grid; grid-template-columns: 48px minmax(0, 1fr) auto; gap: 12px; align-items: center;
  width: 100%; padding: 6px 16px; border: 0; background: transparent; text-align: left; color: inherit; font: inherit; cursor: pointer;
}
.fav-row:last-child { padding-bottom: 12px; }
.fav-row:hover { background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 6%, transparent); }
.fav-row:focus-visible { outline: 3px solid rgb(var(--v-theme-secondary)); outline-offset: -3px; }
.fav-row .t { font-weight: 500; }
.cancelled .t, .cancelled .ellipsis { text-decoration: line-through; color: rgb(var(--v-theme-on-surface-variant)); }
.fav-note { padding: 4px 16px 12px; }
</style>
