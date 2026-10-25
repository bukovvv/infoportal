<script setup lang="ts">
import { computed } from 'vue'
import type { Notice } from '@/api/types'
import { useStations } from '@/stores/data'
import { lineColor, noticeState, periodText, relativeText, STATE_LABEL } from '@/utils/adminNotices'
import { plural } from '@/utils/format'
import { noticeIcon, noticeLabel, noticeLines } from '@/utils/notices'
import { EXTEND_OPTIONS, useNoticeActions } from '@/views/admin/noticeActions'

// Wiersz komunikatu w panelu: lista (z zaznaczaniem i wszystkimi akcjami) albo pulpit (compact: edycja i ukrycie).
const props = defineProps<{ notice: Notice; selectable?: boolean; selected?: boolean; compact?: boolean; now: number }>()
const emit = defineEmits<{ toggle: []; delete: [] }>()
const stations = useStations()
const actions = useNoticeActions()

const state = computed(() => noticeState(props.notice, props.now))
const lines = computed(() => noticeLines(props.notice).map((l) => ({ id: l.id, name: l.badge ?? l.name, color: lineColor(l.id) })))
const stationText = computed(() => {
  const names = props.notice.stations.map((id) => stations.byId.get(id)?.name ?? id)
  return names.length > 3 ? `${names.slice(0, 3).join(', ')} +${names.length - 3}` : names.join(', ')
})
const trainText = computed(() => {
  const t = props.notice.trains
  return t.length === 1 ? t[0] : t.length ? `${t.length} ${plural(t.length, 'pociąg', 'pociągi', 'pociągów')}` : ''
})
const tagClass: Record<string, string> = { live: 'tag-ontime', plan: 'tag-est', draft: 'tag-delay', past: 'tag-neutral' }
const busy = computed(() => actions.busy.value === props.notice.id)
</script>

<template>
  <div class="row-wrap">
    <div class="row" :class="{ sel: selected, compact, selectable }">
      <span v-if="selectable" class="check"><v-checkbox-btn :model-value="selected" density="comfortable" :aria-label="`Zaznacz: ${notice.title}`" @update:model-value="emit('toggle')" /></span>
      <span class="sev" :class="notice.severity" :title="noticeLabel[notice.severity]"><v-icon :icon="noticeIcon[notice.severity]" /></span>
      <div class="main">
        <router-link :to="{ name: 'admin-edit', params: { id: notice.id } }" class="title text-title-small">{{ notice.title }}</router-link>
        <div class="meta">
          <span v-for="l in lines" :key="l.id" class="mchip"><span class="sw" :style="{ background: l.color }" />{{ l.name }}</span>
          <span v-if="stationText" class="mchip">{{ stationText }}</span>
          <span v-if="trainText" class="mchip">{{ trainText }}</span>
          <span v-if="!lines.length && !stationText && !trainText" class="text-body-small muted">cała sieć</span>
          <span v-if="compact" class="text-body-small muted">{{ relativeText(notice, now) }}</span>
        </div>
      </div>
      <div class="side">
        <div v-if="!compact" class="when">
          <div class="text-label-large">{{ periodText(notice) }}</div>
          <div class="text-body-small muted">{{ relativeText(notice, now) }}</div>
        </div>
        <span v-if="!compact" class="state"><span class="tag" :class="tagClass[state]">{{ STATE_LABEL[state] }}</span></span>
        <div class="acts">
          <template v-if="state === 'live'">
            <v-menu v-if="notice.endsAt" location="bottom end">
              <template #activator="{ props: p }">
                <v-btn v-bind="p" icon="more_time" variant="text" size="small" :loading="busy" aria-label="Przedłuż" title="Przedłuż" />
              </template>
              <v-list density="compact" nav>
                <v-list-subheader>Przedłuż</v-list-subheader>
                <v-list-item v-for="o in EXTEND_OPTIONS" :key="String(o.value)" :title="o.label" @click="actions.extend(notice, o.value)" />
              </v-list>
            </v-menu>
            <v-btn icon="visibility_off" variant="text" size="small" aria-label="Ukryj" title="Ukryj (do szkiców)" :disabled="busy" @click="actions.hide(notice)" />
          </template>
          <template v-else-if="!compact">
            <v-btn v-if="state === 'plan'" variant="outlined" size="small" :loading="busy" @click="actions.showNow(notice)">Pokaż teraz</v-btn>
            <v-btn v-else-if="state === 'past'" variant="outlined" size="small" prepend-icon="content_copy" @click="actions.duplicate(notice)">Użyj ponownie</v-btn>
            <v-btn v-else variant="flat" color="secondary-container" size="small" @click="actions.edit(notice)">Dokończ</v-btn>
          </template>
          <v-btn icon="edit" variant="text" size="small" aria-label="Edytuj" title="Edytuj" :to="{ name: 'admin-edit', params: { id: notice.id } }" />
          <v-menu v-if="!compact" location="bottom end">
            <template #activator="{ props: p }">
              <v-btn v-bind="p" icon="more_vert" variant="text" size="small" aria-label="Więcej" />
            </template>
            <v-list density="compact" nav>
              <v-list-item prepend-icon="content_copy" title="Duplikuj" @click="actions.duplicate(notice)" />
              <v-list-item v-if="state === 'live'" prepend-icon="open_in_new" title="Zobacz na portalu" :href="`/komunikaty/${notice.id}`" target="_blank" />
              <v-list-item v-if="state === 'draft'" prepend-icon="visibility" title="Opublikuj" @click="actions.publish(notice)" />
              <v-list-item prepend-icon="delete" title="Usuń" base-color="error" @click="emit('delete')" />
            </v-list>
          </v-menu>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* siatka: na szerokiej liście kolumny (stan, okres, akcje), na wąskiej okres i akcje pod tytułem */
.row-wrap { container-type: inline-size; }
.row-wrap + .row-wrap .row { border-top: 1px solid rgb(var(--v-theme-outline-variant)); border-radius: 0; }
.row { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; align-items: center; gap: 10px 14px; padding: 12px; border-radius: var(--kw-r-m); }
.row.selectable { grid-template-columns: auto 40px minmax(0, 1fr) 150px 104px auto; }
.row.sel { background: rgb(var(--v-theme-surface-container)); border-radius: var(--kw-r-m); }
.side { display: contents; }
@container (max-width: 700px) {
  .row.selectable { grid-template-columns: auto 40px minmax(0, 1fr); }
  .row.selectable .side { grid-column: 3; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; }
  .row.selectable .acts { margin-left: auto; }
}
.sev { display: grid; place-items: center; width: 40px; height: 40px; flex: none; border-radius: var(--kw-r-s); }
.sev.danger { background: rgb(var(--v-theme-error-container)); color: rgb(var(--v-theme-on-error-container)); }
.sev.warning { background: rgb(var(--v-theme-warning-container)); color: rgb(var(--v-theme-on-warning-container)); }
.sev.info { background: rgb(var(--v-theme-info-container)); color: rgb(var(--v-theme-on-info-container)); }
.main { min-width: 0; }
.title { color: inherit; text-decoration: none; font-weight: 700; }
.title:hover { text-decoration: underline; }
.meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 6px; }
.mchip { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; border-radius: 999px; background: rgb(var(--v-theme-surface-container)); font-size: 12px; font-weight: 600; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.sw { width: 14px; height: 5px; border-radius: 3px; flex: none; }
.when { min-width: 0; }
.acts { display: flex; align-items: center; justify-content: flex-end; gap: 2px; }
</style>
