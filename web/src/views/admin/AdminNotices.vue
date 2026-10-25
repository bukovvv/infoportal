<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { Notice, Severity } from '@/api/types'
import NoticeRow from '@/components/admin/NoticeRow.vue'
import { useAdmin } from '@/stores/admin'
import { useStations } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { noticeState, SEVERITY_OPTIONS, STATE_FILTERS, toForm, extendedEnd, type NoticeState } from '@/utils/adminNotices'
import { normalize, plural } from '@/utils/format'
import { NOTICE_LINES, lineTitle, noticeLines } from '@/utils/notices'

const admin = useAdmin()
const ui = useUi()
const stations = useStations()
onMounted(() => { void stations.load() })

// „teraz” odświeżane co minutę — stan komunikatu (zaplanowany → widoczny → wygasły) zmienia się sam
const now = ref(Date.now())
const timer = window.setInterval(() => { now.value = Date.now() }, 60_000)
onUnmounted(() => window.clearInterval(timer))

const filter = ref<NoticeState | 'all'>('all')
const query = ref('')
const severity = ref<Severity | null>(null)
const line = ref<string | null>(null)
const sort = ref<'updated' | 'end'>('updated')
const lineItems = NOTICE_LINES.map((l) => ({ value: l.id, title: lineTitle(l) }))
const sortItems = [{ value: 'updated', title: 'Ostatnio zmienione' }, { value: 'end', title: 'Najbliższy koniec' }]

const list = computed(() => admin.notices ?? [])
const counts = computed(() => {
  const c: Record<string, number> = { all: list.value.length, live: 0, plan: 0, draft: 0, past: 0 }
  for (const n of list.value) c[noticeState(n, now.value)]++
  return c
})

/** tekst do wyszukiwania: tytuł, treść, numery pociągów, nazwy stacji i linii */
const haystack = (n: Notice) => normalize([n.title, n.body, n.line, ...n.trains, ...n.stations.map((id) => stations.byId.get(id)?.name ?? ''), ...noticeLines(n).map(lineTitle)].join(' '))
const rows = computed(() => {
  const q = normalize(query.value ?? '')
  const out = list.value.filter((n) =>
    (filter.value === 'all' || noticeState(n, now.value) === filter.value)
    && (!severity.value || n.severity === severity.value)
    && (!line.value || n.lines.includes(line.value))
    && (!q || haystack(n).includes(q)),
  )
  if (sort.value === 'end') return [...out].sort((a, b) => (a.endsAt ?? '9999').localeCompare(b.endsAt ?? '9999'))
  return out
})

// zaznaczanie wielu
const selected = ref<number[]>([])
const picked = computed(() => list.value.filter((n) => selected.value.includes(n.id)))
const toggle = (id: number) => { selected.value = selected.value.includes(id) ? selected.value.filter((x) => x !== id) : [...selected.value, id] }
const allShownSelected = computed(() => rows.value.length > 0 && rows.value.every((n) => selected.value.includes(n.id)))
const toggleAll = () => { selected.value = allShownSelected.value ? [] : rows.value.map((n) => n.id) }
const bulkBusy = ref(false)

async function bulk(run: (n: Notice) => Promise<unknown>, message: string) {
  bulkBusy.value = true
  let failed = 0
  for (const n of picked.value) {
    try { await run(n) } catch { failed++ }
  }
  bulkBusy.value = false
  selected.value = []
  ui.notify(failed ? `${message} Nie udało się: ${failed}.` : message)
}
const extendable = computed(() => picked.value.filter((n) => n.endsAt && noticeState(n, now.value) !== 'draft'))
const bulkExtend = () => bulk((n) => (n.endsAt && noticeState(n, now.value) !== 'draft' ? admin.saveNotice(toForm(n, { endsAt: extendedEnd(n, 24) }), n.id) : Promise.resolve()), 'Przedłużono o dzień.')
const bulkHide = () => bulk((n) => (n.active ? admin.saveNotice(toForm(n, { active: false }), n.id) : Promise.resolve()), 'Ukryto zaznaczone komunikaty.')

// usuwanie: jednego albo zaznaczonych
const toDelete = ref<Notice[] | null>(null)
async function confirmDelete() {
  const items = toDelete.value ?? []
  toDelete.value = null
  let failed = 0
  for (const n of items) {
    try { await admin.deleteNotice(n.id) } catch { failed++ }
  }
  selected.value = selected.value.filter((id) => !items.some((n) => n.id === id))
  ui.notify(failed ? `Nie udało się usunąć ${failed}.` : items.length === 1 ? 'Usunięto komunikat.' : `Usunięto ${items.length} ${plural(items.length, 'komunikat', 'komunikaty', 'komunikatów')}.`)
}

const summary = computed(() => {
  const c = counts.value
  return [`${c.live} ${plural(c.live, 'widoczny', 'widoczne', 'widocznych')} dla pasażerów`, c.plan ? `${c.plan} ${plural(c.plan, 'zaplanowany', 'zaplanowane', 'zaplanowanych')}` : '', c.draft ? `${c.draft} ${plural(c.draft, 'szkic', 'szkice', 'szkiców')}` : '']
    .filter(Boolean).join(' · ')
})
const filtered = computed(() => !!(query.value || severity.value || line.value))
function clearFilters() {
  query.value = ''
  severity.value = null
  line.value = null
  filter.value = 'all'
}
</script>

<template>
  <div class="d-grid">
    <header class="head">
      <div class="grow">
        <h1 class="text-headline-medium font-weight-bold">Komunikaty</h1>
        <p class="muted">{{ admin.notices ? summary : 'Wczytywanie…' }}</p>
      </div>
      <v-btn variant="flat" color="secondary-container" prepend-icon="content_paste" :to="{ name: 'admin-paste' }">Wklej od przewoźnika</v-btn>
      <v-btn prepend-icon="add" :to="{ name: 'admin-new' }">Nowy komunikat</v-btn>
    </header>

    <div class="tools">
      <v-text-field
        v-model="query"
        class="search"
        prepend-inner-icon="search"
        placeholder="Szukaj w tytułach, treści, numerach pociągów i stacjach"
        aria-label="Szukaj komunikatów"
        variant="solo-filled"
        flat
        density="comfortable"
        hide-details
        clearable
      />
      <v-select v-model="severity" :items="SEVERITY_OPTIONS" item-title="title" item-value="value" label="Rodzaj" density="comfortable" variant="outlined" hide-details clearable class="pick" />
      <v-autocomplete v-model="line" :items="lineItems" label="Linia" density="comfortable" variant="outlined" hide-details clearable class="pick" />
      <v-select v-model="sort" :items="sortItems" label="Kolejność" density="comfortable" variant="outlined" hide-details class="pick" />
    </div>

    <div class="pills" role="group" aria-label="Stan komunikatu">
      <button v-for="f in STATE_FILTERS" :key="f.value" type="button" class="pill" :aria-pressed="filter === f.value" @click="filter = f.value">
        {{ f.label }}<span class="count">{{ counts[f.value] }}</span>
      </button>
    </div>

    <div v-if="picked.length" class="bulk" role="region" aria-label="Zaznaczone komunikaty">
      <span class="grow font-weight-bold">Zaznaczono {{ picked.length }} {{ plural(picked.length, 'komunikat', 'komunikaty', 'komunikatów') }}</span>
      <v-btn variant="tonal" prepend-icon="more_time" :disabled="!extendable.length || bulkBusy" @click="bulkExtend">Przedłuż o dzień</v-btn>
      <v-btn variant="tonal" prepend-icon="visibility_off" :disabled="bulkBusy" @click="bulkHide">Ukryj</v-btn>
      <v-btn variant="tonal" prepend-icon="delete" :disabled="bulkBusy" @click="toDelete = picked">Usuń</v-btn>
      <v-btn variant="text" @click="selected = []">Odznacz</v-btn>
    </div>

    <v-alert v-if="admin.noticesError" color="error-container" icon="error">{{ admin.noticesError }}</v-alert>
    <section class="card list" aria-label="Lista komunikatów">
      <v-skeleton-loader v-if="!admin.notices" type="list-item-two-line@4" color="transparent" />
      <template v-else-if="rows.length">
        <div class="list-head">
          <v-checkbox-btn :model-value="allShownSelected" :indeterminate="!!selected.length && !allShownSelected" density="comfortable" class="flex-0-0" aria-label="Zaznacz wszystkie widoczne na liście" @update:model-value="toggleAll" />
          <span class="text-label-large muted">{{ rows.length }} z {{ list.length }}</span>
        </div>
        <NoticeRow v-for="n in rows" :key="n.id" :notice="n" :now="now" selectable :selected="selected.includes(n.id)" @toggle="toggle(n.id)" @delete="toDelete = [n]" />
      </template>
      <v-empty-state v-else-if="list.length" icon="search" title="Nic nie pasuje" text="Zmień wyszukiwanie albo filtr stanu.">
        <template #actions><v-btn variant="text" @click="clearFilters">Wyczyść filtry</v-btn></template>
      </v-empty-state>
      <v-empty-state v-else icon="campaign" title="Brak komunikatów" text="Pierwszy komunikat napiszesz w edytorze albo wkleisz z aktualności przewoźnika." />
      <p v-if="filter === 'past' && rows.length && !filtered" class="foot text-body-small muted">Wygasłe komunikaty zostają na liście, dopóki ich nie usuniesz — przydają się jako wzór („Użyj ponownie”).</p>
    </section>

    <v-dialog :model-value="!!toDelete" max-width="440" @update:model-value="toDelete = null">
      <v-card color="surface-container-high">
        <v-card-item prepend-icon="delete">
          <v-card-title>{{ toDelete?.length === 1 ? 'Usunąć komunikat?' : `Usunąć ${toDelete?.length} komunikaty?` }}</v-card-title>
        </v-card-item>
        <v-card-text>
          <template v-if="toDelete?.length === 1">„{{ toDelete[0].title }}” zniknie na stałe. Jeśli chcesz zachować go jako wzór, ukryj go zamiast usuwać.</template>
          <template v-else>Zaznaczone komunikaty znikną na stałe. Jeśli chcesz zachować je jako wzór, ukryj je zamiast usuwać.</template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="toDelete = null">Anuluj</v-btn>
          <v-btn variant="text" color="error" @click="confirmDelete">Usuń</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.d-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
.head { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px 16px; }
.grow { flex: 1 1 auto; min-width: 0; }
.tools { display: flex; flex-wrap: wrap; gap: 10px; }
.search { flex: 999 1 320px; }
.search :deep(.v-field) { border-radius: 999px; }
.pick { flex: 1 1 170px; max-width: 240px; }
.pills { display: flex; flex-wrap: wrap; gap: 8px; }
.pill {
  display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 16px; border-radius: 999px; border: 0; cursor: pointer;
  font: inherit; font-weight: 700; background: rgb(var(--v-theme-surface)); color: rgb(var(--v-theme-on-surface));
  box-shadow: inset 0 0 0 1px rgb(var(--v-theme-outline-variant));
}
.pill .count { display: grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; box-sizing: border-box; border-radius: 999px; font-size: 12px; background: rgb(var(--v-theme-surface-container-high)); color: rgb(var(--v-theme-on-surface-variant)); }
.pill[aria-pressed='true'] { background: rgb(var(--v-theme-inverse-surface)); color: rgb(var(--v-theme-on-inverse-surface)); box-shadow: none; }
.pill[aria-pressed='true'] .count { background: color-mix(in srgb, rgb(var(--v-theme-on-inverse-surface)) 18%, transparent); color: inherit; }
.bulk {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 12px 8px 20px; border-radius: 999px;
  background: rgb(var(--v-theme-inverse-surface)); color: rgb(var(--v-theme-on-inverse-surface));
}
.list { padding: 8px; }
.list-head { display: flex; align-items: center; gap: 8px; padding: 0 12px 4px; }
.foot { padding: 8px 12px 4px; margin: 0; }
@media (max-width: 599px) {
  .pick { max-width: none; }
  .bulk { border-radius: var(--kw-r-l); }
}
</style>
