<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { api } from '@/api/client'
import type { Notice, Severity } from '@/api/types'
import NoticeBody from '@/components/NoticeBody.vue'
import NoticeItem from '@/components/NoticeItem.vue'
import { useAdmin } from '@/stores/admin'
import { useNotices, useStations } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { dateTime, plural } from '@/utils/format'
import { buildNotice, requiredFields, templateKinds, type TemplateInput } from '@/utils/noticeTemplates'
import { NOTICE_LINES, noticeIcon, noticeLabel, detectStations, detectTrains, lineTitle, noticeLines, scopeText } from '@/utils/notices'

const admin = useAdmin()
const ui = useUi()
const publicNotices = useNotices()
const stations = useStations()
const list = ref<Notice[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const editingId = ref<number | null>(null)
const toDelete = ref<Notice | null>(null)

const NETWORK = 'Cała sieć KW'
const empty = () => ({
  title: '', body: '', line: NETWORK, severity: 'warning' as Severity, trains: [] as string[], stations: [] as string[], lines: [] as string[],
  startsAt: '', endsAt: '', active: true,
})
const form = reactive(empty())
const tpl = reactive<TemplateInput>({ kind: 'delay', train: '', delay: null, origin: '', departure: '', destination: '', arrival: '', newDestination: '', station: '', eventTime: '', platform: '', track: '', reason: 'z przyczyn technicznych', replacement: false })
const tplMessage = ref<{ ok: boolean; text: string } | null>(null)
const shows = (field: keyof TemplateInput) => requiredFields(tpl.kind).includes(field) || (field === 'track' && tpl.kind === 'platform') || (field === 'reason' && tpl.kind !== 'platform')

const severities = [
  { value: 'info', title: 'Informacja' },
  { value: 'warning', title: 'Utrudnienie' },
  { value: 'danger', title: 'Poważne utrudnienie' },
]
const label = (s: Severity) => severities.find((x) => x.value === s)?.title ?? s
const lineItems = NOTICE_LINES.map((l) => ({ value: l.id, title: lineTitle(l), color: l.color }))
const stationItems = computed(() => [...stations.all].sort((a, b) => a.name.localeCompare(b.name, 'pl')).map((s) => ({ value: s.id, title: s.name })))
const stationName = (id: string) => stations.byId.get(id)?.name ?? id
const scopeOf = (n: Notice) => [...noticeLines(n).map(lineTitle), ...n.stations.map(stationName)].join(', ')

// „Linia lub odcinek” podąża za wybranymi liniami i stacjami, dopóki nie zostanie wpisane ręcznie
let autoLine = NETWORK
watch(() => [form.lines.join(), form.stations.join(), stations.loaded], () => {
  const auto = scopeText(form.lines, form.stations.map(stationName)) || NETWORK
  if (!form.line.trim() || form.line === autoLine || form.line === NETWORK) form.line = auto
  autoLine = auto
})

// podgląd: komunikat z formularza tak, jak zobaczy go pasażer (skrót na starcie / tablicy i strona komunikatu)
const previewOpen = ref(false)
const preview = computed<Notice>(() => ({
  id: 0, title: form.title.trim() || 'Tytuł komunikatu', body: form.body.trim() || 'Treść komunikatu', line: form.line.trim() || NETWORK,
  severity: form.severity, trains: form.trains.map(String), stations: [...form.stations], lines: [...form.lines],
  startsAt: form.startsAt || null, endsAt: form.endsAt || null, active: form.active,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
}))

/** Nowy komunikat na wzór istniejącego (np. kolejny etap tych samych prac) — bez dat publikacji, do sprawdzenia przed publikacją. */
function duplicate(n: Notice) {
  reset()
  Object.assign(form, {
    title: n.title, body: n.body, line: n.line, severity: n.severity, trains: [...n.trains], stations: [...n.stations], lines: [...n.lines],
    startsAt: '', endsAt: '', active: true,
  })
  autoLine = n.line
  ui.notify('Skopiowano do formularza. Zmień daty i treść, potem opublikuj.')
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const detectMessage = ref<string | null>(null)
/** Pociągi i stacje wymienione w tytule i treści (np. po wklejeniu aktualności przewoźnika) — dopisuje do wybranych. */
function detect() {
  const text = `${form.title}
${form.body}`
  const trains = detectTrains(text).filter((t) => !form.trains.includes(t))
  const found = detectStations(text, stations.all).map((s) => s.id).filter((id) => !form.stations.includes(id))
  form.trains = [...form.trains, ...trains].slice(0, 40)
  form.stations = [...form.stations, ...found].slice(0, 40)
  detectMessage.value = trains.length || found.length
    ? `Dodano: ${trains.length} pociągów, ${found.length} stacji. Sprawdź listy i usuń zbędne.`
    : 'Nie znaleziono nowych numerów pociągów ani nazw stacji.'
}
const counts = computed(() => ({ active: list.value.filter((n) => n.active).length, hidden: list.value.filter((n) => !n.active).length }))

async function load() {
  loading.value = true
  try {
    list.value = await admin.call(() => api.admin.notices())
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}
onMounted(() => { void load(); void stations.load() })

function edit(n: Notice) {
  editingId.value = n.id
  Object.assign(form, {
    title: n.title, body: n.body, line: n.line, severity: n.severity, trains: [...n.trains], stations: [...n.stations], lines: [...n.lines],
    startsAt: n.startsAt ?? '', endsAt: n.endsAt ?? '', active: n.active,
  })
  autoLine = n.line
  detectMessage.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
function reset() {
  editingId.value = null
  Object.assign(form, empty())
  autoLine = NETWORK
  error.value = null
  detectMessage.value = null
}

async function save() {
  saving.value = true
  error.value = null
  try {
    const saved = await admin.call(() => api.admin.saveNotice({ ...form, trains: form.trains.map(String) }, editingId.value ?? undefined))
    ui.notify(editingId.value ? 'Zapisano zmiany w komunikacie.' : saved.active ? 'Opublikowano komunikat.' : 'Zapisano ukryty komunikat.')
    reset()
    await load()
    void api.notices().then((n) => { publicNotices.list = n })
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  const n = toDelete.value
  if (!n) return
  toDelete.value = null
  try {
    await admin.call(() => api.admin.deleteNotice(n.id))
    ui.notify('Usunięto komunikat.')
    if (editingId.value === n.id) reset()
    await load()
  } catch (e) {
    ui.notify((e as Error).message)
  }
}

function generate() {
  try {
    const out = buildNotice(tpl)
    Object.assign(form, out)
    tplMessage.value = { ok: true, text: 'Gotowe. Sprawdź treść poniżej i opublikuj komunikat.' }
  } catch (e) {
    tplMessage.value = { ok: false, text: (e as Error).message }
  }
}
</script>

<template>
  <div class="admin-grid">
    <v-card color="surface-container-low" class="editor">
      <v-card-item :prepend-icon="editingId ? 'edit' : 'add'">
        <v-card-title>{{ editingId ? 'Edytuj komunikat' : 'Nowy komunikat' }}</v-card-title>
        <v-card-subtitle>{{ editingId ? 'Zmień treść lub okres publikacji' : 'Informacja widoczna dla pasażerów' }}</v-card-subtitle>
      </v-card-item>
      <v-card-text class="d-grid">
        <v-expansion-panels variant="accordion" class="mb-2">
          <v-expansion-panel bg-color="tertiary-container">
            <v-expansion-panel-title>
              <v-icon icon="wand_stars" class="mr-3" />
              <div><div class="text-title-small">Szybki generator</div><div class="text-body-small">Opóźnienie, odwołanie, ZKA, peron, skrócona relacja</div></div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="tpl-grid">
                <v-select v-model="tpl.kind" :items="templateKinds" label="Rodzaj komunikatu" density="compact" class="span-2" hide-details @update:model-value="tplMessage = null" />
                <v-text-field v-model="tpl.train" label="Numer pociągu" inputmode="numeric" density="compact" hide-details />
                <v-text-field v-if="shows('delay')" v-model.number="tpl.delay" type="number" min="1" max="1440" label="Opóźnienie" suffix="min" density="compact" hide-details />
                <template v-if="shows('origin')">
                  <v-text-field v-model="tpl.origin" label="Stacja początkowa" density="compact" hide-details />
                  <v-text-field v-model="tpl.departure" type="time" label="Odjazd" density="compact" hide-details />
                  <v-text-field v-model="tpl.destination" label="Planowa stacja końcowa" density="compact" hide-details />
                  <v-text-field v-model="tpl.arrival" type="time" label="Planowy przyjazd" density="compact" hide-details />
                </template>
                <v-text-field v-if="shows('newDestination')" v-model="tpl.newDestination" label="Nowa stacja końcowa" density="compact" class="span-2" hide-details />
                <template v-if="shows('station')">
                  <v-text-field v-model="tpl.station" label="Stacja" density="compact" hide-details />
                  <v-text-field v-model="tpl.eventTime" type="time" label="Godzina odjazdu" density="compact" hide-details />
                  <v-text-field v-model="tpl.platform" label="Nowy peron" density="compact" hide-details />
                  <v-text-field v-model="tpl.track" label="Nowy tor" density="compact" hide-details />
                </template>
                <v-text-field v-if="shows('reason')" v-model="tpl.reason" label="Przyczyna" density="compact" class="span-2" hide-details />
                <v-checkbox v-if="tpl.kind === 'delay' || tpl.kind === 'cancellation'" v-model="tpl.replacement" label="Podstawiono skład lub transport zastępczy" density="compact" class="span-2" hide-details />
              </div>
              <div class="d-flex align-center flex-wrap ga-3 mt-3">
                <v-btn variant="flat" color="secondary-container" prepend-icon="wand_stars" @click="generate">Utwórz treść</v-btn>
                <span v-if="tplMessage" class="text-body-small" :class="tplMessage.ok ? 'text-success' : 'text-error'" role="status">{{ tplMessage.text }}</span>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <v-form class="d-grid" @submit.prevent="save">
          <v-text-field v-model="form.title" label="Tytuł" counter="160" maxlength="160" />
          <v-textarea
            v-model="form.body"
            label="Treść"
            counter="5000"
            maxlength="5000"
            rows="5"
            auto-grow
            hint="Pusta linia zaczyna nowy akapit, wiersz od „- ” to punkt listy (np. kolejne pociągi ze zmienionym rozkładem)."
            persistent-hint
          />
          <div class="d-flex align-center flex-wrap ga-3">
            <v-btn variant="flat" color="secondary-container" prepend-icon="manage_search" :disabled="!form.title && !form.body" @click="detect">Wykryj pociągi i stacje z treści</v-btn>
            <span v-if="detectMessage" class="text-body-small muted" role="status">{{ detectMessage }}</span>
          </div>
          <v-autocomplete
            v-model="form.lines"
            :items="lineItems"
            label="Linie"
            multiple
            chips
            closable-chips
            clear-on-select
            hint="Komunikat pojawi się na tablicach stacji tej linii, przy pociągach, które nią jadą, i na schemacie."
            persistent-hint
          >
            <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps">
                <template #prepend><span class="swatch" :style="{ background: item.color }" /></template>
              </v-list-item>
            </template>
          </v-autocomplete>
          <v-autocomplete
            v-model="form.stations"
            :items="stationItems"
            label="Stacje"
            multiple
            chips
            closable-chips
            clear-on-select
            :loading="!stations.loaded"
            hint="Komunikat pojawi się na tablicy odjazdów stacji i przy pociągach, które się na niej zatrzymują."
            persistent-hint
          />
          <div class="two">
            <v-text-field v-model="form.line" label="Dotyczy (opis)" hide-details />
            <v-select v-model="form.severity" :items="severities" label="Rodzaj" hide-details />
          </div>
          <v-combobox v-model="form.trains" label="Pociągi (numery)" multiple chips closable-chips hint="Wpisz numer i naciśnij Enter. Komunikat pojawi się przy tych pociągach." persistent-hint />
          <div class="two">
            <v-text-field v-model="form.startsAt" type="datetime-local" label="Publikuj od" hide-details />
            <v-text-field v-model="form.endsAt" type="datetime-local" label="Publikuj do" hide-details />
          </div>
          <v-switch v-model="form.active" color="primary" inset hide-details label="Komunikat widoczny dla pasażerów" />
          <v-alert v-if="error" color="error-container" icon="error" density="compact">{{ error }}</v-alert>
          <div class="d-flex flex-wrap ga-2">
            <v-btn type="submit" prepend-icon="check" :loading="saving">{{ editingId ? 'Zapisz zmiany' : 'Opublikuj' }}</v-btn>
            <v-btn variant="outlined" prepend-icon="visibility" :disabled="!form.title && !form.body" @click="previewOpen = true">Podgląd</v-btn>
            <v-btn v-if="editingId" variant="outlined" @click="reset">Anuluj</v-btn>
          </div>
        </v-form>
      </v-card-text>
    </v-card>

    <section aria-labelledby="list-title">
      <div class="section-head">
        <h2 id="list-title" class="text-title-large">Wszystkie komunikaty</h2>
        <span class="text-body-small muted">{{ counts.active }} widocznych · {{ counts.hidden }} ukrytych</span>
      </div>
      <v-skeleton-loader v-if="loading" type="list-item-three-line@3" color="transparent" />
      <div v-else class="gap-grid">
        <v-card v-for="n in list" :key="n.id" color="surface-container-low" class="notice-card" :class="n.severity">
          <v-card-text class="d-grid ga-2">
            <div class="d-flex flex-wrap align-center ga-2">
              <span class="tag" :class="n.active ? 'tag-ontime' : 'tag-neutral'">{{ n.active ? 'Widoczny' : 'Ukryty' }}</span>
              <span class="tag" :class="n.severity === 'danger' ? 'tag-error' : n.severity === 'warning' ? 'tag-delay' : 'tag-neutral'">{{ label(n.severity) }}</span>
              <span class="text-body-small muted">{{ n.line }}</span>
            </div>
            <h3 class="text-title-medium">{{ n.title }}</h3>
            <p class="text-body-medium muted pre">{{ n.body }}</p>
            <div class="text-body-small muted">
              Aktualizacja {{ dateTime(n.updatedAt) }}<template v-if="n.endsAt"> · do {{ dateTime(n.endsAt) }}</template>
              <template v-if="n.trains.length"> · pociągi: {{ n.trains.join(', ') }}</template>
              <template v-if="n.lines.length || n.stations.length"> · przypięty do: {{ scopeOf(n) }}</template>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn variant="text" prepend-icon="edit" @click="edit(n)">Edytuj</v-btn>
            <v-btn variant="text" prepend-icon="content_copy" @click="duplicate(n)">Duplikuj</v-btn>
            <v-btn variant="text" color="error" prepend-icon="delete" @click="toDelete = n">Usuń</v-btn>
          </v-card-actions>
        </v-card>
        <v-empty-state v-if="!list.length" icon="campaign" title="Brak komunikatów" text="Pierwszy komunikat przygotujesz w formularzu obok." />
      </div>
    </section>

    <v-dialog v-model="previewOpen" max-width="640" scrollable>
      <v-card color="surface-container-high">
        <v-card-item prepend-icon="visibility">
          <v-card-title>Podgląd komunikatu</v-card-title>
          <v-card-subtitle>Tak zobaczy go pasażer{{ form.active ? '' : ' (komunikat ukryty — nie zostanie pokazany)' }}</v-card-subtitle>
        </v-card-item>
        <v-card-text class="d-grid">
          <div class="text-label-large muted">Na starcie, tablicy odjazdów i przy pociągu</div>
          <div class="preview-box"><NoticeItem :notice="preview" compact /></div>
          <div class="text-label-large muted">Strona komunikatu</div>
          <div class="preview-box preview-page">
            <span class="preview-badge" :class="preview.severity"><v-icon :icon="noticeIcon[preview.severity]" size="18" />{{ noticeLabel[preview.severity] }}</span>
            <h3 class="text-headline-small">{{ preview.title }}</h3>
            <div class="text-body-medium muted"><v-icon icon="route" size="18" class="mr-1" />{{ preview.line }}</div>
            <NoticeBody :body="preview.body" />
            <div v-if="preview.trains.length || preview.lines.length || preview.stations.length" class="text-body-small muted">
              Przypięty do: {{ [scopeOf(preview), preview.trains.length ? `${preview.trains.length} ${plural(preview.trains.length, 'pociąg', 'pociągi', 'pociągów')}` : ''].filter(Boolean).join(' · ') }}
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="previewOpen = false">Zamknij</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :model-value="!!toDelete" max-width="420" @update:model-value="toDelete = null">
      <v-card color="surface-container-high">
        <v-card-item prepend-icon="delete">
          <v-card-title>Usunąć komunikat?</v-card-title>
        </v-card-item>
        <v-card-text>
          „{{ toDelete?.title }}” zniknie na stałe. Jeśli chcesz zachować go w historii, wyłącz widoczność zamiast usuwać.
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
.admin-grid { display: grid; gap: 24px; grid-template-columns: minmax(0, 1fr); align-items: start; }
@media (min-width: 1145px) {
  .admin-grid { grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); }
  .editor { position: sticky; top: 80px; }
}
.d-grid { display: grid; gap: 16px; }
.two { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.tpl-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.span-2 { grid-column: 1 / -1; }
.pre { white-space: pre-line; display: -webkit-box; -webkit-line-clamp: 6; line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden; }
.preview-box { overflow: hidden; border-radius: var(--kw-r-l); background: rgb(var(--v-theme-surface-container-low)); }
.preview-page { display: grid; gap: 12px; justify-items: start; padding: 20px; }
.preview-page > * { justify-self: stretch; }
.preview-page > .preview-badge { justify-self: start; }
.preview-badge {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px 4px 8px; border-radius: 999px; font-size: 13px; font-weight: 600; line-height: 20px;
  background: rgb(var(--v-theme-surface-container-highest)); color: rgb(var(--v-theme-on-surface-variant));
}
.preview-badge.warning { background: rgb(var(--v-theme-warning-container)); color: rgb(var(--v-theme-on-warning-container)); }
.preview-badge.danger { background: rgb(var(--v-theme-error-container)); color: rgb(var(--v-theme-on-error-container)); }
.swatch { width: 24px; height: 6px; margin-right: 12px; border-radius: 3px; }
.notice-card { border-left: 4px solid rgb(var(--v-theme-outline-variant)); }
.notice-card.danger { border-left-color: rgb(var(--v-theme-error)); }
.notice-card.warning { border-left-color: rgb(var(--v-theme-warning)); }
</style>
