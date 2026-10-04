<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '@/api/client'
import type { Notice, Severity } from '@/api/types'
import { useAdmin } from '@/stores/admin'
import { useNotices } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { dateTime } from '@/utils/format'
import { buildNotice, requiredFields, templateKinds, type TemplateInput } from '@/utils/noticeTemplates'

const admin = useAdmin()
const ui = useUi()
const publicNotices = useNotices()
const list = ref<Notice[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const editingId = ref<number | null>(null)
const toDelete = ref<Notice | null>(null)

const empty = () => ({ title: '', body: '', line: 'Cała sieć KW', severity: 'warning' as Severity, trains: [] as string[], startsAt: '', endsAt: '', active: true })
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
onMounted(load)

function edit(n: Notice) {
  editingId.value = n.id
  Object.assign(form, { title: n.title, body: n.body, line: n.line, severity: n.severity, trains: [...n.trains], startsAt: n.startsAt ?? '', endsAt: n.endsAt ?? '', active: n.active })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
function reset() {
  editingId.value = null
  Object.assign(form, empty())
  error.value = null
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
          <v-textarea v-model="form.body" label="Treść" counter="1200" maxlength="1200" rows="4" auto-grow hint="Podaj odcinek, możliwe opóźnienie i alternatywę dla pasażera." persistent-hint />
          <div class="two">
            <v-text-field v-model="form.line" label="Linia lub odcinek" hide-details />
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
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn variant="text" prepend-icon="edit" @click="edit(n)">Edytuj</v-btn>
            <v-btn variant="text" color="error" prepend-icon="delete" @click="toDelete = n">Usuń</v-btn>
          </v-card-actions>
        </v-card>
        <v-empty-state v-if="!list.length" icon="campaign" title="Brak komunikatów" text="Pierwszy komunikat przygotujesz w formularzu obok." />
      </div>
    </section>

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
.pre { white-space: pre-line; }
.notice-card { border-left: 4px solid rgb(var(--v-theme-outline-variant)); }
.notice-card.danger { border-left-color: rgb(var(--v-theme-error)); }
.notice-card.warning { border-left-color: rgb(var(--v-theme-warning)); }
</style>
