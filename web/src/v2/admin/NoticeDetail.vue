<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Notice } from '@/api/types'
import { useAdmin } from '@/stores/admin'
import { useStations } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { noticeState, periodText, relativeText, STATE_LABEL } from '@/utils/adminNotices'
import { dateTime, plural } from '@/utils/format'
import { bodyBlocks, lineTitle, noticeLines } from '@/utils/notices'
import { EXTEND_OPTIONS, useNoticeActions } from '@/views/admin/noticeActions'
import { KZN } from './NoticeLine.vue'

// Komunikat w panelu: treść tak jak u pasażera, czego dotyczy, okres i akcje zależne od stanu.
const props = defineProps<{ notice: Notice; now: number }>()
const emit = defineEmits<{ deleted: [] }>()
const admin = useAdmin()
const ui = useUi()
const stations = useStations()
const act = useNoticeActions()

const state = computed(() => noticeState(props.notice, props.now))
const blocks = computed(() => bodyBlocks(props.notice.body))
const lines = computed(() => noticeLines(props.notice).map(lineTitle))
const stationNames = computed(() => props.notice.stations.map((id) => stations.byId.get(id)?.name ?? id))
const busy = computed(() => act.busy.value === props.notice.id)

const confirmDelete = ref(false)
async function remove() {
  confirmDelete.value = false
  try {
    await admin.deleteNotice(props.notice.id)
    ui.notify('Usunięto komunikat.')
    emit('deleted')
  } catch (e) {
    ui.notify((e as Error).message)
  }
}
</script>

<template>
  <article class="detal-adm" :aria-busy="busy">
    <div class="wiersz zawin" style="gap: 8px">
      <span class="kzn m" :class="KZN[notice.severity].cls" aria-hidden="true">{{ KZN[notice.severity].sign }}</span>
      <span class="dr maly">{{ KZN[notice.severity].label }}</span>
      <span class="znacz" :class="state">{{ STATE_LABEL[state] }}</span>
      <span v-if="notice.source === 'plk'" class="znacz plk">z PKP PLK</span>
    </div>
    <h2 class="detal-t">{{ notice.title }}</h2>
    <p class="dr">{{ notice.line }}</p>

    <!-- akcje: najpierw to, co zwykle robi się w tym stanie -->
    <div class="wiersz zawin akcje">
      <v-btn class="drugi-btn" prepend-icon="edit" @click="act.edit(notice)">Edytuj</v-btn>
      <template v-if="state === 'live'">
        <v-menu location="bottom start">
          <template #activator="{ props: menu }">
            <v-btn v-bind="menu" class="drugi-btn" prepend-icon="more_time" :loading="busy">Przedłuż</v-btn>
          </template>
          <div class="menu-adm">
            <button v-for="o in EXTEND_OPTIONS" :key="o.value" type="button" @click="act.extend(notice, o.value)">{{ o.label }}</button>
          </div>
        </v-menu>
        <v-btn class="drugi-btn" prepend-icon="visibility_off" :loading="busy" @click="act.hide(notice)">Ukryj</v-btn>
      </template>
      <v-btn v-else-if="state === 'plan'" class="drugi-btn" prepend-icon="visibility" :loading="busy" @click="act.showNow(notice)">Pokaż teraz</v-btn>
      <v-btn v-else-if="state === 'draft'" class="drugi-btn" prepend-icon="visibility" :loading="busy" @click="act.publish(notice)">Opublikuj</v-btn>
      <v-btn class="drugi-btn" prepend-icon="content_copy" @click="act.duplicate(notice)">{{ state === 'past' ? 'Użyj ponownie' : 'Duplikuj' }}</v-btn>
      <v-btn class="drugi-btn" icon="delete" aria-label="Usuń komunikat" @click="confirmDelete = true" />
    </div>

    <div class="tresc-adm">
      <template v-for="(b, i) in blocks" :key="i">
        <p v-if="b.kind === 'p'">{{ b.text }}</p>
        <ul v-else><li v-for="(item, j) in b.items" :key="j">{{ item }}</li></ul>
      </template>
    </div>

    <dl class="fakty-dl">
      <div><dt>Publikacja</dt><dd>{{ periodText(notice) }}<small class="dr"> · {{ relativeText(notice, now) }}</small></dd></div>
      <div v-if="lines.length"><dt>Linie</dt><dd>{{ lines.join(', ') }}</dd></div>
      <div v-if="stationNames.length"><dt>Stacje</dt><dd>{{ stationNames.join(', ') }}</dd></div>
      <div v-if="notice.trains.length"><dt>{{ plural(notice.trains.length, 'Pociąg', 'Pociągi', 'Pociągi') }}</dt><dd class="num">{{ notice.trains.join(', ') }}</dd></div>
      <div><dt>Zmieniony</dt><dd>{{ dateTime(notice.updatedAt) }}</dd></div>
    </dl>

    <v-dialog v-model="confirmDelete" max-width="420">
      <div class="okno-adm">
        <h2>Usunąć komunikat?</h2>
        <p class="dr">„{{ notice.title }}” zniknie z serwisu i z panelu. Tego nie da się cofnąć. Jeśli chcesz go tylko schować, użyj „Ukryj”.</p>
        <div class="wiersz zawin" style="justify-content: flex-end">
          <v-btn class="drugi-btn" @click="confirmDelete = false">Anuluj</v-btn>
          <v-btn class="glowny-btn" @click="remove">Usuń</v-btn>
        </div>
      </div>
    </v-dialog>
  </article>
</template>

<style scoped>
.detal-adm { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.detal-t { font-size: 24px !important; line-height: 1.2 !important; letter-spacing: -.02em; overflow-wrap: anywhere; }
.akcje { gap: 8px; margin: 6px 0 4px; }
.tresc-adm { display: grid; gap: 10px; font-size: 16px; line-height: 1.5; }
.tresc-adm p, .tresc-adm li { white-space: pre-line; overflow-wrap: anywhere; }
.tresc-adm ul { margin: 0; padding-left: 22px; display: grid; gap: 4px; }
.fakty-dl { display: grid; gap: 0; margin: 8px 0 0; }
.fakty-dl > div { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 12px; padding: 10px 0; border-top: 1px solid var(--kreska); font-size: 14px; }
.fakty-dl dt { color: var(--tusz-2); font-weight: 600; }
.fakty-dl dd { margin: 0; overflow-wrap: anywhere; }
</style>
