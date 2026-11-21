<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Notice, Severity } from '@/api/types'
import StampField from '@/components/admin/StampField.vue'
import NoticeBody from '@/components/NoticeBody.vue'
import NoticeItem from '@/components/NoticeItem.vue'
import TimeField from '@/components/TimeField.vue'
import { useAdmin } from '@/stores/admin'
import { useStations } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { clearDraft, emptyForm, readDraft, reach, SEVERITY_OPTIONS, stampMs, toForm, writeDraft, type NoticeForm } from '@/utils/adminNotices'
import { clock, plural } from '@/utils/format'
import { buildNotice, requiredFields, templateKinds, type TemplateInput } from '@/utils/noticeTemplates'
import { analyzeNotice, findPeriod, HUB_STATION, publishBefore, publishUntil, suggestLines, type NoticeAnalysis } from '@/utils/noticeText'
import { NOTICE_LINES, lineTitle, noticeIcon, noticeLabel, noticeTrain, noticeTrainInput, parseNoticeTrain, scopeText } from '@/utils/notices'
import { checkTrains, trainChecks } from './trainCheck'

const route = useRoute()
const router = useRouter()
const admin = useAdmin()
const ui = useUi()
const stations = useStations()

const NETWORK = 'Cała sieć KW'
const editingId = computed(() => (route.name === 'admin-edit' ? Number(route.params.id) : null))
const draftKey = computed(() => (editingId.value ? String(editingId.value) : 'new'))
const form = reactive<NoticeForm>(emptyForm())
/** stan formularza po wczytaniu (bez zmian użytkownika) — do wykrycia, czy jest co zapisywać w wersji roboczej */
const base = ref(JSON.stringify(emptyForm()))
const step = ref(1)
const start = ref<'blank' | 'tpl'>('blank')
const fromPaste = ref(false)
const restoredAt = ref<string | null>(null)
const draftSavedAt = ref<string | null>(null)
const ready = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
let leaving = false

const original = computed<Notice | null>(() => (editingId.value ? admin.notices?.find((n) => n.id === editingId.value) ?? null : null))
const missing = computed(() => editingId.value !== null && admin.notices !== null && !original.value)

function load() {
  if (ready.value) return
  if (editingId.value && !original.value) return
  let initial = emptyForm()
  const dup = route.query.z ? admin.notices?.find((n) => n.id === Number(route.query.z)) : null
  if (original.value) initial = toForm(original.value)
  else if (dup) initial = toForm(dup, { startsAt: '', endsAt: '', active: true })
  Object.assign(form, initial)
  base.value = JSON.stringify(initial)
  lineManual.value = !lineIsAutoText(form)
  // wersja robocza z tej przeglądarki: nowsza niż zapisany komunikat (albo nowy formularz bez duplikowania)
  const d = readDraft(draftKey.value)
  if (d && !dup && (!original.value || new Date(d.savedAt).getTime() > new Date(original.value.updatedAt).getTime())) {
    Object.assign(form, d.form)
    step.value = d.step
    fromPaste.value = d.origin === 'paste'
    lineManual.value = !lineIsAutoText(form)
    if (d.origin === 'paste' && !editingId.value && JSON.stringify(d.form) !== base.value) base.value = '' // świeża wklejka — od razu „niezapisane”
    if (d.origin !== 'paste') restoredAt.value = d.savedAt
    draftSavedAt.value = d.savedAt
  }
  if (dup) ui.notify('Skopiowano komunikat. Sprawdź treść i ustaw nowe daty.')
  ready.value = true
}
onMounted(() => {
  void stations.load()
  if (!admin.notices) void admin.loadNotices()
  load()
})
watch(() => admin.notices, load)

function discardDraft() {
  clearDraft(draftKey.value)
  restoredAt.value = null
  draftSavedAt.value = null
  const initial = original.value ? toForm(original.value) : emptyForm()
  Object.assign(form, initial)
  base.value = JSON.stringify(initial)
  lineManual.value = !lineIsAutoText(form)
  step.value = 1
}

// --- wersja robocza: zapis w przeglądarce chwilę po każdej zmianie
const dirty = computed(() => JSON.stringify(form) !== base.value)
let saveTimer = 0
watch([() => JSON.stringify(form), step], () => {
  if (!ready.value || leaving) return
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    if (leaving) return
    if (!dirty.value) return clearDraft(draftKey.value)
    const savedAt = new Date().toISOString()
    writeDraft(draftKey.value, { form: JSON.parse(JSON.stringify(form)), step: step.value, savedAt, origin: fromPaste.value ? 'paste' : undefined })
    draftSavedAt.value = savedAt
  }, 600)
})
onUnmounted(() => window.clearTimeout(saveTimer))

// --- kroki
const STEPS = [
  { n: 1, label: 'Treść', sub: 'tytuł i opis' },
  { n: 2, label: 'Czego dotyczy', sub: 'linie, stacje, pociągi' },
  { n: 3, label: 'Kiedy i jak ważne', sub: 'rodzaj i daty' },
]
const stepTop = ref<HTMLElement | null>(null)
function go(n: number) {
  step.value = Math.min(3, Math.max(1, n))
  void nextTick(() => stepTop.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
}

// --- krok 1: szablon i treść
const tpl = reactive<TemplateInput>({ kind: 'bus', train: '', delay: null, origin: '', departure: '', destination: '', arrival: '', newDestination: '', station: '', eventTime: '', platform: '', track: '', reason: 'z przyczyn technicznych', replacement: false })
const tplError = ref<string | null>(null)
const shows = (field: keyof TemplateInput) => requiredFields(tpl.kind).includes(field) || (field === 'track' && tpl.kind === 'platform') || (field === 'reason' && tpl.kind !== 'platform')
function generate() {
  try {
    const out = buildNotice(tpl)
    Object.assign(form, { title: out.title, body: out.body, severity: out.severity, trains: [...new Set([...form.trains, ...out.trains])] })
    if (out.line && !lineManual.value) {
      form.line = out.line
      lineManual.value = true
    }
    tplError.value = null
    ui.notify('Wstawiono tytuł i treść z szablonu.')
  } catch (e) {
    tplError.value = (e as Error).message
  }
}
const bodyField = ref<{ $el: HTMLElement } | null>(null)
/** Wstawia tekst w miejscu kursora w treści (przyciski „Nowy akapit”, „Punkt listy”). */
function insert(text: string) {
  const el = bodyField.value?.$el.querySelector('textarea')
  const at = el?.selectionStart ?? form.body.length
  form.body = form.body.slice(0, at) + text + form.body.slice(el?.selectionEnd ?? at)
  void nextTick(() => {
    el?.focus()
    el?.setSelectionRange(at + text.length, at + text.length)
  })
}

// --- rozbiór treści (podpowiedzi w krokach 2 i 3), z opóźnieniem przy pisaniu
const analysis = ref<NoticeAnalysis<{ id: string; name: string }> | null>(null)
let analyzeTimer = 0
watch([() => form.title, () => form.body, () => stations.loaded], () => {
  window.clearTimeout(analyzeTimer)
  analyzeTimer = window.setTimeout(() => { analysis.value = analyzeNotice(`${form.title}\n${form.body}`, stations.all) }, 300)
}, { immediate: true })
const period = computed(() => findPeriod(`${form.title}\n${form.body}`))

// --- krok 2: zakres
const stationName = (id: string) => stations.byId.get(id)?.name ?? id
const lineItems = NOTICE_LINES.map((l) => ({ value: l.id, title: lineTitle(l), color: l.color }))
const stationItems = computed(() => [...stations.all].sort((a, b) => a.name.localeCompare(b.name, 'pl')).map((s) => ({ value: s.id, title: s.name })))
watch(() => form.trains.join(), () => {
  form.trains = [...new Set(form.trains.flatMap((t) => noticeTrainInput(String(t)) ?? []))].slice(0, 40)
  checkTrains(form.trains)
}, { immediate: true })
// sam numer znaleziony tylko u POLREGIO / PKP Intercity → „PR 85724” (inaczej chip pokazywałby KW)
watch(() => form.trains.map((t) => { const c = trainChecks.get(t); return c?.state === 'ok' ? c.agency : '' }).join(), () => {
  const fixed = form.trains.map((t) => {
    const c = trainChecks.get(t)
    if (c?.state !== 'ok' || parseNoticeTrain(t).number !== t) return t
    const token = noticeTrain(c.agency, t)
    if (token !== t) trainChecks.set(token, c)
    return token
  })
  if (fixed.some((t, i) => t !== form.trains[i])) form.trains = fixed
})
const hasTrain = (n: string) => form.trains.some((t) => parseNoticeTrain(t).number === n)
/** wartość chipu w polu pociągów (Vuetify podaje sam tekst albo obiekt z `value`) */
const chipValue = (item: unknown) => String(item && typeof item === 'object' ? ((item as { value?: unknown }).value ?? (item as { title?: unknown }).title) : item)
const checkText = (n: string) => {
  const c = trainChecks.get(n)
  return c?.state === 'ok' ? c.text : c?.state === 'missing' ? 'Brak w rozkładzie na dziś i jutro' : undefined
}
const missingTrains = computed(() => form.trains.filter((t) => trainChecks.get(t)?.state === 'missing'))

const suggestions = computed(() => {
  const a = analysis.value
  if (!a) return { stations: [], trains: [], lines: [] }
  const names = [...form.stations.map(stationName), ...a.stations.filter((s) => !s.hub).map((s) => s.station.name)]
  return {
    stations: a.stations.filter((s) => !form.stations.includes(s.station.id)),
    trains: a.trains.filter((t) => !hasTrain(t)),
    lines: suggestLines(names).filter((id) => !form.lines.includes(id)).map((id) => NOTICE_LINES.find((l) => l.id === id)!),
  }
})
const hasSuggestions = computed(() => suggestions.value.stations.length + suggestions.value.trains.length + suggestions.value.lines.length > 0)
const addStation = (id: string) => { if (!form.stations.includes(id)) form.stations = [...form.stations, id].slice(0, 40) }
const addTrain = (n: string) => { if (!hasTrain(n)) form.trains = [...form.trains, n] }
const addLine = (id: string) => { if (!form.lines.includes(id)) form.lines = [...form.lines, id] }
function addAll() {
  suggestions.value.stations.filter((s) => !s.hub).forEach((s) => addStation(s.station.id))
  suggestions.value.trains.forEach(addTrain)
  suggestions.value.lines.forEach((l) => addLine(l.id))
}

// „Dotyczy” podąża za liniami i stacjami, dopóki nie zostanie wpisane ręcznie
const lineManual = ref(false)
const autoScope = computed(() => scopeText(form.lines, form.stations.map(stationName)) || NETWORK)
function lineIsAutoText(f: NoticeForm) {
  return !f.line.trim() || f.line === NETWORK || f.line === scopeText(f.lines, f.stations.map(stationName))
}
watch(() => [form.lines.join(), form.stations.join()], () => { if (!lineManual.value) form.line = autoScope.value })
// nazwy stacji doczytane po otwarciu — opis zapisany automatycznie dalej jest automatyczny
watch(() => stations.loaded, () => { if (ready.value && !dirty.value) lineManual.value = !lineIsAutoText(form) })
const onLineInput = (v: string) => { lineManual.value = v.trim() !== '' && v !== autoScope.value }

// --- krok 3: rodzaj i daty
const severityHint = computed(() => analysis.value?.severity)
const PUBLISH_BEFORE = [{ days: 1, label: 'Dzień przed' }, { days: 2, label: '2 dni przed' }, { days: 7, label: 'Tydzień przed' }]
const beforeOptions = computed(() => {
  const p = period.value
  if (!p) return []
  return PUBLISH_BEFORE.map((o) => ({ ...o, value: publishBefore(p.from, o.days) })).filter((o) => o.value)
})
const shortStamp = (s: string) => {
  const d = new Date(s)
  return `${d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'numeric' })}, ${clock(d.toISOString())}`
}
const timing = computed(() => {
  if (!form.active) return { tone: 'neutral', text: 'Zapiszesz szkic — pasażerowie go nie zobaczą, dopóki go nie opublikujesz.' }
  const now = Date.now()
  const s = stampMs(form.startsAt)
  const e = stampMs(form.endsAt)
  if (e !== null && e < now) return { tone: 'warn', text: 'Koniec publikacji już minął — komunikat od razu trafi do wygasłych.' }
  const from = s !== null && s > now ? `Pojawi się ${shortStamp(form.startsAt)}` : 'Pojawi się od razu po zapisaniu'
  const to = e !== null ? `, zniknie ${shortStamp(form.endsAt)}` : ' i zostanie, dopóki go nie ukryjesz'
  return { tone: 'info', text: `${from}${to}.` }
})
const endMissing = computed(() => form.active && !form.endsAt)

// --- podgląd i zasięg
const previewMode = ref<'short' | 'page'>('short')
const preview = computed<Notice>(() => ({
  id: 0, title: form.title.trim() || 'Tytuł komunikatu', body: form.body.trim() || 'Treść komunikatu', line: form.line.trim() || NETWORK,
  severity: form.severity, trains: [...form.trains], stations: [...form.stations], lines: [...form.lines],
  startsAt: form.startsAt || null, endsAt: form.endsAt || null, active: form.active, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
}))
const where = computed(() => reach(form, stationName))
const boardsText = computed(() => {
  const b = where.value.boards
  return b.length > 4 ? `${b.slice(0, 4).join(', ')} i ${b.length - 4} ${plural(b.length - 4, 'inna', 'inne', 'innych')}` : b.join(', ')
})
/** Linia przez Poznań Gł. pokaże komunikat także na jego tablicy — zostaw stacje albo zamień linię na jej stacje bez węzła. */
function dropHubLines() {
  const viaHub = NOTICE_LINES.filter((l) => form.lines.includes(l.id) && l.stations.includes(HUB_STATION))
  if (!form.stations.length) {
    const byName = new Map(stations.all.map((s) => [s.name, s.id]))
    const ids = viaHub.flatMap((l) => l.stations.filter((n) => n !== HUB_STATION).map((n) => byName.get(n))).filter((id): id is string => !!id)
    form.stations = [...new Set([...form.stations, ...ids])].slice(0, 40)
  }
  form.lines = form.lines.filter((id) => !viaHub.some((l) => l.id === id))
}

// --- zapis
const primaryLabel = computed(() => {
  if (!form.active) return 'Zapisz szkic'
  if (editingId.value) return 'Zapisz zmiany'
  return (stampMs(form.startsAt) ?? 0) > Date.now() ? 'Zaplanuj publikację' : 'Opublikuj'
})
async function save(asDraft = false) {
  error.value = null
  if (!form.title.trim() || !form.body.trim()) {
    error.value = 'Tytuł i treść komunikatu są wymagane.'
    go(1)
    return
  }
  saving.value = true
  try {
    const payload: NoticeForm = { ...form, active: asDraft ? false : form.active, line: form.line.trim() || autoScope.value }
    const saved = await admin.saveNotice(payload, editingId.value ?? undefined)
    leaving = true
    window.clearTimeout(saveTimer)
    clearDraft(draftKey.value)
    ui.notify(asDraft || !saved.active ? 'Zapisano szkic.' : editingId.value ? 'Zapisano zmiany.' : (stampMs(saved.startsAt) ?? 0) > Date.now() ? 'Zaplanowano komunikat.' : 'Opublikowano komunikat.')
    await router.push({ name: 'admin-notices' })
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    saving.value = false
  }
}
const savedText = computed(() => {
  if (!dirty.value) return editingId.value ? 'Bez zmian' : null
  return draftSavedAt.value ? `Wersja robocza zapisana ${clock(draftSavedAt.value)}` : 'Niezapisane zmiany'
})
const setSeverity = (s: Severity) => { form.severity = s }
</script>

<template>
  <div class="editor">
    <header class="head">
      <div class="grow">
        <nav class="crumb text-label-large muted" aria-label="Okruszki">
          <router-link :to="{ name: 'admin-notices' }">Komunikaty</router-link>
          <v-icon icon="chevron_right" size="18" />
          <span>{{ editingId ? 'Edycja' : 'Nowy' }}</span>
        </nav>
        <h1 class="text-headline-medium font-weight-bold">{{ editingId ? 'Edytuj komunikat' : 'Nowy komunikat' }}</h1>
      </div>
      <span v-if="savedText" class="saved text-label-large"><v-icon :icon="dirty ? 'save' : 'check'" size="18" />{{ savedText }}</span>
    </header>

    <v-alert v-if="missing" color="error-container" icon="error">Nie ma takiego komunikatu — mógł zostać usunięty. <router-link :to="{ name: 'admin-notices' }">Wróć do listy</router-link></v-alert>
    <v-skeleton-loader v-else-if="!ready" type="article" color="transparent" />
    <template v-else>
      <v-alert v-if="restoredAt" color="info-container" icon="history" density="compact">
        Przywrócono niezapisaną wersję z {{ clock(restoredAt) }} (z tej przeglądarki).
        <template #append><v-btn variant="text" size="small" @click="discardDraft">Odrzuć ją</v-btn></template>
      </v-alert>

      <div ref="stepTop" class="steps" role="tablist" aria-label="Kroki">
        <button v-for="s in STEPS" :key="s.n" type="button" role="tab" class="step" :class="{ on: step === s.n, done: step > s.n }" :aria-selected="step === s.n" @click="go(s.n)">
          <span class="num"><v-icon v-if="step > s.n" icon="check" size="18" /><template v-else>{{ s.n }}</template></span>
          <span class="lbl"><span class="t">{{ s.label }}</span><span class="text-body-small d">{{ s.sub }}</span></span>
        </button>
      </div>

      <div class="cols">
        <section class="card form" :aria-label="STEPS[step - 1].label">
          <!-- krok 1 -->
          <template v-if="step === 1">
            <div v-if="fromPaste" class="note info">
              <v-icon icon="content_paste" />
              <div class="grow"><div class="text-title-small">Treść wklejona od przewoźnika</div><div class="text-body-small">Rozpoznane daty, pociągi i stacje są już wpisane w krokach 2 i 3 — sprawdź je.</div></div>
              <v-btn variant="outlined" size="small" :to="{ name: 'admin-paste' }">Wróć do wklejki</v-btn>
            </div>
            <div v-else-if="!editingId" class="field">
              <span class="flabel">Zacznij od</span>
              <div class="starts">
                <button type="button" class="start" :aria-pressed="start === 'blank'" @click="start = 'blank'"><span class="t">Pusty</span><span class="d">Piszesz od zera.</span></button>
                <button type="button" class="start" :aria-pressed="start === 'tpl'" @click="start = 'tpl'"><span class="t">Szablon</span><span class="d">Opóźnienie, odwołanie, autobusy, peron…</span></button>
                <router-link class="start" :to="{ name: 'admin-paste' }"><span class="t">Tekst przewoźnika</span><span class="d">Wklej aktualność — panel rozpozna resztę.</span></router-link>
              </div>
            </div>

            <div v-if="start === 'tpl' && !fromPaste && !editingId" class="sub">
              <div class="pills" role="group" aria-label="Rodzaj szablonu">
                <button v-for="k in templateKinds" :key="k.value" type="button" class="pill" :aria-pressed="tpl.kind === k.value" @click="tpl.kind = k.value; tplError = null">{{ k.title }}</button>
              </div>
              <div class="grid2">
                <v-text-field v-model="tpl.train" label="Numer pociągu" inputmode="numeric" density="comfortable" hide-details />
                <v-text-field v-if="shows('delay')" v-model.number="tpl.delay" type="number" min="1" max="1440" label="Opóźnienie" suffix="min" density="comfortable" hide-details />
                <template v-if="shows('origin')">
                  <v-text-field v-model="tpl.origin" label="Stacja początkowa" density="comfortable" hide-details />
                  <TimeField v-model="tpl.departure!" label="Odjazd" density="comfortable" />
                  <v-text-field v-model="tpl.destination" label="Planowa stacja końcowa" density="comfortable" hide-details />
                  <TimeField v-model="tpl.arrival!" label="Planowy przyjazd" density="comfortable" />
                </template>
                <v-text-field v-if="shows('newDestination')" v-model="tpl.newDestination" label="Nowa stacja końcowa" density="comfortable" class="span2" hide-details />
                <template v-if="shows('station')">
                  <v-text-field v-model="tpl.station" label="Stacja" density="comfortable" hide-details />
                  <TimeField v-model="tpl.eventTime!" label="Godzina odjazdu" density="comfortable" />
                  <v-text-field v-model="tpl.platform" label="Nowy peron" density="comfortable" hide-details />
                  <v-text-field v-model="tpl.track" label="Nowy tor" density="comfortable" hide-details />
                </template>
                <v-text-field v-if="shows('reason')" v-model="tpl.reason" label="Przyczyna" density="comfortable" class="span2" hide-details />
                <v-checkbox v-if="tpl.kind === 'delay' || tpl.kind === 'cancellation'" v-model="tpl.replacement" label="Podstawiono skład lub transport zastępczy" density="compact" class="span2" hide-details />
              </div>
              <div class="d-flex flex-wrap align-center ga-3">
                <v-btn variant="flat" color="secondary-container" prepend-icon="wand_stars" @click="generate">Wstaw tytuł i treść</v-btn>
                <span v-if="tplError" class="text-body-small text-error" role="alert">{{ tplError }}</span>
              </div>
            </div>

            <v-text-field v-model="form.title" label="Tytuł" counter="160" maxlength="160" class="title-field" />
            <div class="field">
              <div class="toolbar">
                <v-btn variant="flat" color="surface-container-high" size="small" @click="insert('\n\n')">¶ Nowy akapit</v-btn>
                <v-btn variant="flat" color="surface-container-high" size="small" prepend-icon="format_list_bulleted" @click="insert('\n- ')">Punkt listy</v-btn>
              </div>
              <v-textarea
                ref="bodyField"
                v-model="form.body"
                label="Treść"
                counter="5000"
                maxlength="5000"
                rows="7"
                auto-grow
                hint="Pusta linia zaczyna akapit, wiersz od „- ” to punkt listy."
                persistent-hint
              />
            </div>
          </template>

          <!-- krok 2 -->
          <template v-else-if="step === 2">
            <div>
              <h2 class="text-title-large font-weight-bold">Czego dotyczy</h2>
              <p class="muted mt-1">Od tego zależy, gdzie komunikat zobaczą pasażerowie — „Gdzie się pokaże” obok.</p>
            </div>
            <v-autocomplete v-model="form.lines" :items="lineItems" label="Linie" multiple chips closable-chips clear-on-select hide-details>
              <template #item="{ props: itemProps, item }">
                <v-list-item v-bind="itemProps">
                  <template #prepend><span class="swatch" :style="{ background: item.color }" /></template>
                </v-list-item>
              </template>
            </v-autocomplete>
            <v-autocomplete v-model="form.stations" :items="stationItems" label="Stacje" multiple chips closable-chips clear-on-select :loading="!stations.loaded" hide-details />
            <div class="field">
              <v-combobox v-model="form.trains" label="Pociągi (numery)" multiple chips closable-chips hide-details>
                <template #chip="{ props: chipProps, item }">
                  <v-chip v-bind="chipProps" :title="checkText(chipValue(item))">
                    <template #prepend>
                      <v-icon v-if="trainChecks.get(chipValue(item))?.state === 'ok'" icon="check" size="16" class="mr-1 text-success" />
                      <v-icon v-else-if="trainChecks.get(chipValue(item))?.state === 'missing'" icon="warning" size="16" class="mr-1 text-warning" />
                    </template>
                    {{ chipValue(item) }}
                  </v-chip>
                </template>
              </v-combobox>
              <span class="hint" :class="{ 'text-warning': missingTrains.length }">
                <template v-if="missingTrains.length">Nie ma w rozkładzie na dziś i jutro: {{ missingTrains.join(', ') }} — sprawdź numer (pociąg może kursować tylko w inne dni).</template>
                <template v-else>Wpisz numer i naciśnij Enter. Numery sprawdzamy w rozkładzie — POLREGIO i PKP Intercity dostaną skrót PR / IC.</template>
              </span>
            </div>

            <div v-if="hasSuggestions" class="sub">
              <div class="d-flex align-center ga-2">
                <span class="text-title-small grow">W treści jest jeszcze</span>
                <v-btn variant="text" size="small" @click="addAll">Dodaj wszystkie</v-btn>
              </div>
              <div class="sugg">
                <button v-for="l in suggestions.lines" :key="l.id" type="button" class="sg" @click="addLine(l.id)"><v-icon icon="add" size="16" /><span class="swatch" :style="{ background: l.color }" />{{ lineTitle(l) }}</button>
                <button v-for="s in suggestions.stations" :key="s.station.id" type="button" class="sg" @click="addStation(s.station.id)">
                  <v-icon icon="add" size="16" />{{ s.station.name }}<span v-if="s.forms.some((f) => f !== s.station.name)" class="muted">({{ s.forms.filter((f) => f !== s.station.name).map((f) => `„${f}”`).join(', ') }})</span>
                </button>
                <button v-for="t in suggestions.trains" :key="t" type="button" class="sg" @click="addTrain(t)"><v-icon icon="add" size="16" />{{ t }}</button>
              </div>
              <span v-if="suggestions.stations.some((s) => s.hub)" class="hint">{{ HUB_STATION }} to zwykle tylko cel pociągów — dodaj go, tylko jeśli utrudnienie dotyczy tej stacji.</span>
            </div>

            <div class="field">
              <v-text-field v-model="form.line" label="Dotyczy (opis pod tytułem)" maxlength="120" hide-details @update:model-value="onLineInput">
                <template v-if="!lineManual" #append-inner><span class="auto">AUTO</span></template>
              </v-text-field>
              <span class="hint">Uzupełnia się z linii i stacji, dopóki nie wpiszesz własnego.</span>
            </div>
          </template>

          <!-- krok 3 -->
          <template v-else>
            <h2 class="text-title-large font-weight-bold">Kiedy i jak ważne</h2>
            <div class="field">
              <span class="flabel">Rodzaj</span>
              <div class="sevs">
                <button v-for="o in SEVERITY_OPTIONS" :key="o.value" type="button" class="sevopt" :aria-pressed="form.severity === o.value" @click="setSeverity(o.value)">
                  <span class="sev" :class="o.value"><v-icon :icon="noticeIcon[o.value]" /></span>
                  <span><span class="t">{{ o.title }}</span><span class="text-body-small muted d">{{ o.text }}</span></span>
                </button>
              </div>
              <span v-if="severityHint?.reason" class="hint">
                Podpowiedź z treści: „{{ severityHint.reason }}” → {{ noticeLabel[severityHint.value].toLowerCase() }}.
                <a v-if="severityHint.value !== form.severity" href="#" @click.prevent="setSeverity(severityHint.value)">Ustaw</a>
              </span>
            </div>

            <div class="field">
              <span class="flabel">Pokaż pasażerom</span>
              <div class="pills">
                <button type="button" class="pill" :aria-pressed="!form.startsAt" @click="form.startsAt = ''">Od razu</button>
                <button v-for="o in beforeOptions" :key="o.days" type="button" class="pill" :aria-pressed="form.startsAt === o.value" @click="form.startsAt = o.value">{{ o.label }}: {{ shortStamp(o.value) }}</button>
              </div>
              <span v-if="period" class="hint">Utrudnienia z treści: „{{ period.text }}”.</span>
            </div>
            <div class="grid2">
              <StampField v-model="form.startsAt" label="Publikuj od" empty-text="Od razu" default-time="18:00" />
              <StampField v-model="form.endsAt" label="Publikuj do" empty-text="Bez końca" default-time="23:59" />
            </div>
            <div v-if="period?.to && form.endsAt !== publishUntil(period.to)" class="hint">
              <a href="#" @click.prevent="form.endsAt = publishUntil(period.to!)">Ustaw koniec na ostatni dzień utrudnień ({{ period.to.split('-').reverse().slice(0, 2).join('.') }}, 23:59)</a>
            </div>
            <span v-else-if="endMissing" class="hint">Bez końca komunikat zostanie, dopóki go nie ukryjesz — przy utrudnieniach lepiej ustawić datę.</span>
            <v-switch v-model="form.active" color="primary" inset hide-details label="Widoczny dla pasażerów" />
            <div class="note" :class="timing.tone"><v-icon :icon="timing.tone === 'warn' ? 'warning' : 'calendar_month'" /><span>{{ timing.text }}</span></div>
          </template>

          <v-alert v-if="error" color="error-container" icon="error" density="compact">{{ error }}</v-alert>
          <div class="foot">
            <v-btn v-if="step > 1" variant="outlined" prepend-icon="chevron_left" @click="go(step - 1)">Wstecz</v-btn>
            <span class="grow" />
            <v-btn v-if="form.active" variant="text" :loading="saving" @click="save(true)">Zapisz jako szkic</v-btn>
            <v-btn v-if="step < 3" append-icon="chevron_right" @click="go(step + 1)">Dalej</v-btn>
            <v-btn v-else :prepend-icon="form.active ? 'send' : 'draft'" :loading="saving" @click="save()">{{ primaryLabel }}</v-btn>
          </div>
        </section>

        <aside class="side" aria-label="Podgląd i zasięg">
          <section class="card pv-card">
            <h2 class="text-title-large font-weight-bold">Tak zobaczy pasażer</h2>
            <div class="seg" role="group" aria-label="Rodzaj podglądu">
              <button type="button" :aria-pressed="previewMode === 'short'" @click="previewMode = 'short'">Skrót</button>
              <button type="button" :aria-pressed="previewMode === 'page'" @click="previewMode = 'page'">Strona komunikatu</button>
            </div>
            <div v-if="previewMode === 'short'" class="pv"><NoticeItem :notice="preview" compact /></div>
            <div v-else class="pv pv-page">
              <span class="badge" :class="preview.severity"><v-icon :icon="noticeIcon[preview.severity]" size="18" />{{ noticeLabel[preview.severity] }}</span>
              <h3 class="text-headline-small">{{ preview.title }}</h3>
              <div class="text-body-medium muted"><v-icon icon="route" size="18" class="mr-1" />{{ preview.line }}</div>
              <NoticeBody :body="preview.body" />
            </div>
          </section>

          <section class="card reach">
            <h2 class="text-title-large font-weight-bold mb-1">Gdzie się pokaże</h2>
            <div v-if="where.boards.length" class="wrow"><v-icon icon="location_on" /><div><div class="text-title-small">Tablice odjazdów {{ where.boards.length }} {{ plural(where.boards.length, 'stacji', 'stacji', 'stacji') }}</div><div class="text-body-small muted">{{ boardsText }}</div></div></div>
            <div v-if="where.trains || where.boards.length" class="wrow"><v-icon icon="train" /><div><div class="text-title-small">Przy pociągach i w wynikach wyszukiwania</div><div class="text-body-small muted">{{ where.trains ? `${where.trains} ${plural(where.trains, 'wybrany pociąg', 'wybrane pociągi', 'wybranych pociągów')}` : '' }}{{ where.trains && where.boards.length ? ' oraz ' : '' }}{{ where.boards.length ? 'kursy zatrzymujące się na tych stacjach' : '' }}</div></div></div>
            <div v-if="where.lines.length" class="wrow"><v-icon icon="route" /><div><div class="text-title-small">Schemat połączeń</div><div class="text-body-small muted">{{ where.lines.join(', ') }}</div></div></div>
            <div class="wrow"><v-icon icon="campaign" /><div><div class="text-title-small">Start i lista komunikatów</div><div class="text-body-small muted">{{ form.active ? 'zawsze, gdy widoczny' : 'nie — to szkic' }}</div></div></div>
            <p v-if="!where.boards.length && !where.trains" class="text-body-small muted mb-0 mt-2">Przypnij linię, stację albo pociąg, żeby komunikat pojawiał się przy pociągach i na tablicach.</p>
            <div v-if="form.severity === 'info'" class="text-body-small muted mt-2">Informacje pasażer może ukryć w ustawieniach — utrudnienia widzi zawsze.</div>
            <div v-if="where.hubViaLine" class="note warn mt-3">
              <v-icon icon="warning" />
              <div class="grow">
                <div class="text-title-small">Pokaże się też na tablicy Poznania Gł.</div>
                <div class="text-body-small">Linia zaczyna się w Poznaniu. Jeśli to zbędne, zostaw same stacje.</div>
                <v-btn variant="outlined" size="small" class="mt-2" @click="dropHubLines">{{ form.stations.length ? 'Zostaw tylko wybrane stacje' : 'Zamień linię na jej stacje' }}</v-btn>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.editor { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
.head { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; }
.grow { flex: 1 1 auto; min-width: 0; }
.crumb { display: flex; align-items: center; gap: 4px; }
.crumb a { color: inherit; }
.saved { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 999px; background: rgb(var(--v-theme-surface-container-high)); color: rgb(var(--v-theme-on-surface-variant)); }
.steps { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px; border-radius: var(--kw-r-xl); background: rgb(var(--v-theme-surface)); box-shadow: 0 1px 2px rgb(0 0 0 / .06); scroll-margin-top: 80px; }
.step { flex: 1 1 180px; display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 6px 18px 6px 8px; border: 0; border-radius: 999px; background: transparent; font: inherit; color: rgb(var(--v-theme-on-surface-variant)); cursor: pointer; text-align: left; }
.step .num { display: grid; place-items: center; width: 36px; height: 36px; flex: none; border-radius: 999px; font-weight: 800; background: rgb(var(--v-theme-surface-container-high)); }
.step .lbl { display: grid; }
.step .t { font-weight: 700; color: rgb(var(--v-theme-on-surface)); }
.step.on { background: rgb(var(--v-theme-inverse-surface)); color: rgb(var(--v-theme-on-inverse-surface)); }
.step.on .t { color: inherit; }
.step.on .num { background: rgb(var(--v-theme-primary)); color: rgb(var(--v-theme-on-primary)); }
.step.done .num { background: rgb(var(--v-theme-success-container)); color: rgb(var(--v-theme-on-success-container)); }
.cols { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
.form { flex: 999 1 520px; min-width: 0; padding: 24px; display: grid; gap: 20px; }
.side { flex: 1 1 340px; min-width: 0; display: grid; gap: 16px; }
@media (min-width: 1280px) { .side { position: sticky; top: 88px; } }
.field { display: grid; gap: 8px; }
.flabel { font-size: 13px; font-weight: 700; color: rgb(var(--v-theme-on-surface-variant)); }
.hint { font-size: 12px; line-height: 16px; color: rgb(var(--v-theme-on-surface-variant)); }
.starts { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; }
.start { display: grid; gap: 4px; align-content: start; padding: 14px 16px; border: 0; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-surface-container)); color: rgb(var(--v-theme-on-surface)); font: inherit; text-align: left; cursor: pointer; text-decoration: none; }
.start .t { font-weight: 800; }
.start .d { font-size: 12px; line-height: 16px; opacity: .85; }
.start[aria-pressed='true'] { background: rgb(var(--v-theme-secondary-container)); color: rgb(var(--v-theme-on-secondary-container)); box-shadow: inset 0 0 0 2px rgb(var(--v-theme-primary)); }
.sub { display: grid; gap: 12px; padding: 16px; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-surface-container)); }
.grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.span2 { grid-column: 1 / -1; }
.pills { display: flex; flex-wrap: wrap; gap: 8px; }
.pill { min-height: 36px; padding: 0 14px; border: 0; border-radius: 999px; font: inherit; font-weight: 600; cursor: pointer; background: rgb(var(--v-theme-surface)); color: rgb(var(--v-theme-on-surface)); box-shadow: inset 0 0 0 1px rgb(var(--v-theme-outline-variant)); }
.pill[aria-pressed='true'] { background: rgb(var(--v-theme-inverse-surface)); color: rgb(var(--v-theme-on-inverse-surface)); box-shadow: none; }
.title-field :deep(input) { font-weight: 700; }
.toolbar { display: flex; flex-wrap: wrap; gap: 6px; }
.swatch { display: inline-block; width: 24px; height: 6px; margin-right: 12px; border-radius: 3px; flex: none; }
.sugg { display: flex; flex-wrap: wrap; gap: 8px; }
.sg { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 4px 12px 4px 8px; border: 1px dashed rgb(var(--v-theme-outline)); border-radius: 999px; background: transparent; font: inherit; font-size: 13px; font-weight: 600; color: rgb(var(--v-theme-on-surface)); cursor: pointer; }
.sg .swatch { width: 14px; height: 5px; margin-right: 0; }
.auto { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: 999px; background: rgb(var(--v-theme-info-container)); color: rgb(var(--v-theme-on-info-container)); font-size: 11px; font-weight: 800; letter-spacing: .3px; }
.sevs { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
.sevopt { display: flex; gap: 12px; align-items: flex-start; padding: 14px; border: 0; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-surface-container)); font: inherit; color: rgb(var(--v-theme-on-surface)); text-align: left; cursor: pointer; }
.sevopt[aria-pressed='true'] { background: rgb(var(--v-theme-surface)); box-shadow: inset 0 0 0 2px rgb(var(--v-theme-primary)); }
.sevopt .t { display: block; font-weight: 700; }
.sevopt .d { display: block; }
.sev { display: grid; place-items: center; width: 36px; height: 36px; flex: none; border-radius: var(--kw-r-s); }
.sev.danger { background: rgb(var(--v-theme-error-container)); color: rgb(var(--v-theme-on-error-container)); }
.sev.warning { background: rgb(var(--v-theme-warning-container)); color: rgb(var(--v-theme-on-warning-container)); }
.sev.info { background: rgb(var(--v-theme-info-container)); color: rgb(var(--v-theme-on-info-container)); }
.note { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-surface-container-high)); }
.note.info { background: rgb(var(--v-theme-info-container)); color: rgb(var(--v-theme-on-info-container)); }
.note.warn { background: rgb(var(--v-theme-warning-container)); color: rgb(var(--v-theme-on-warning-container)); }
.foot { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.pv-card, .reach { padding: 20px; display: grid; gap: 14px; }
.reach { gap: 0; }
.seg { display: flex; gap: 4px; padding: 4px; border-radius: 999px; background: rgb(var(--v-theme-surface-container)); }
.seg button { flex: 1; height: 36px; padding: 0 12px; border: 0; border-radius: 999px; background: transparent; font: inherit; font-weight: 700; color: rgb(var(--v-theme-on-surface-variant)); cursor: pointer; }
.seg button[aria-pressed='true'] { background: rgb(var(--v-theme-surface)); color: rgb(var(--v-theme-on-surface)); box-shadow: 0 1px 2px rgb(0 0 0 / .12); }
.pv { border-radius: var(--kw-r-m); background: rgb(var(--v-theme-background)); overflow: hidden; }
.pv-page { display: grid; gap: 12px; padding: 16px; }
.badge { justify-self: start; display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px 4px 8px; border-radius: 999px; font-size: 13px; font-weight: 600; background: rgb(var(--v-theme-surface-container-highest)); color: rgb(var(--v-theme-on-surface-variant)); }
.badge.warning { background: rgb(var(--v-theme-warning-container)); color: rgb(var(--v-theme-on-warning-container)); }
.badge.danger { background: rgb(var(--v-theme-error-container)); color: rgb(var(--v-theme-on-error-container)); }
.wrow { display: flex; gap: 12px; align-items: flex-start; padding: 10px 0; }
.wrow + .wrow { border-top: 1px solid rgb(var(--v-theme-outline-variant)); }
</style>
