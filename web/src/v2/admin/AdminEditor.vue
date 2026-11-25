<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Notice, Severity } from '@/api/types'
import StampField from '@/components/admin/StampField.vue'
import { useAdmin } from '@/stores/admin'
import { useStations } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { clearDraft, emptyForm, readDraft, reach, SEVERITY_OPTIONS, stampMs, toForm, writeDraft, type NoticeForm } from '@/utils/adminNotices'
import { clock, plural } from '@/utils/format'
import { analyzeNotice, findPeriod, HUB_STATION, publishBefore, publishUntil, suggestLines, type NoticeAnalysis } from '@/utils/noticeText'
import { bodyBlocks, NOTICE_LINES, lineTitle, noticeLabel, noticeTrain, noticeTrainInput, parseNoticeTrain, scopeText } from '@/utils/notices'
import { checkTrains, trainChecks } from '@/views/admin/trainCheck'
import { KZN } from './NoticeLine.vue'

// Edytor 2.0: wszystko na jednej stronie (treść, rodzaj, czego dotyczy, kiedy), obok podgląd, zasięg i zapis
// na jedynej ciemnej płycie. Logika jak w edytorze 1.0: wersja robocza w przeglądarce, rozbiór treści, sprawdzanie pociągów.
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
    lineManual.value = !lineIsAutoText(form)
    restoredAt.value = d.savedAt
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
}

// --- wersja robocza: zapis w przeglądarce chwilę po każdej zmianie
const dirty = computed(() => JSON.stringify(form) !== base.value)
let saveTimer = 0
watch(() => JSON.stringify(form), () => {
  if (!ready.value || leaving) return
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    if (leaving) return
    if (!dirty.value) return clearDraft(draftKey.value)
    const savedAt = new Date().toISOString()
    writeDraft(draftKey.value, { form: JSON.parse(JSON.stringify(form)), step: 1, savedAt })
    draftSavedAt.value = savedAt
  }, 600)
})
onUnmounted(() => window.clearTimeout(saveTimer))

// --- treść
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

// --- rozbiór treści (podpowiedzi zakresu, rodzaju i dat), z opóźnieniem przy pisaniu
const analysis = ref<NoticeAnalysis<{ id: string; name: string }> | null>(null)
let analyzeTimer = 0
watch([() => form.title, () => form.body, () => stations.loaded], () => {
  window.clearTimeout(analyzeTimer)
  analyzeTimer = window.setTimeout(() => { analysis.value = analyzeNotice(`${form.title}\n${form.body}`, stations.all) }, 300)
}, { immediate: true })
const period = computed(() => findPeriod(`${form.title}\n${form.body}`))

// --- czego dotyczy
const stationName = (id: string) => stations.byId.get(id)?.name ?? id
const lineItems = NOTICE_LINES.map((l) => ({ value: l.id, title: lineTitle(l), color: l.color }))
const stationItems = computed(() => [...stations.all].sort((a, b) => a.name.localeCompare(b.name, 'pl')).map((s) => ({ value: s.id, title: s.name })))
watch(() => form.trains.join(), () => {
  form.trains = [...new Set(form.trains.flatMap((t) => noticeTrainInput(String(t)) ?? []))].slice(0, 40)
  checkTrains(form.trains)
}, { immediate: true })
// sam numer znaleziony tylko u POLREGIO / PKP Intercity → „PR 85724” (inaczej pociąg liczyłby się jako KW)
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

// --- rodzaj i daty
const severityHint = computed(() => analysis.value?.severity)
const setSeverity = (s: Severity) => { form.severity = s }
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
  if (!form.active) return { warn: false, text: 'Zapiszesz szkic. Pasażerowie go nie zobaczą, dopóki go nie opublikujesz.' }
  const now = Date.now()
  const s = stampMs(form.startsAt)
  const e = stampMs(form.endsAt)
  if (e !== null && e < now) return { warn: true, text: 'Koniec publikacji już minął: komunikat od razu trafi do wygasłych.' }
  const from = s !== null && s > now ? `Pojawi się ${shortStamp(form.startsAt)}` : 'Pojawi się od razu po zapisaniu'
  const to = e !== null ? `, zniknie ${shortStamp(form.endsAt)}` : ' i zostanie, dopóki go nie ukryjesz'
  return { warn: false, text: `${from}${to}.` }
})
const endMissing = computed(() => form.active && !form.endsAt)

// --- podgląd i zasięg
const previewMode = ref<'short' | 'page'>('short')
const preview = computed(() => ({
  title: form.title.trim() || 'Tytuł komunikatu',
  body: form.body.trim() || 'Treść komunikatu',
  line: form.line.trim() || NETWORK,
}))
const previewBlocks = computed(() => bodyBlocks(preview.value.body))
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
const titleField = ref<{ focus: () => void } | null>(null)
async function save(asDraft = false) {
  error.value = null
  if (!form.title.trim() || !form.body.trim()) {
    error.value = 'Tytuł i treść komunikatu są wymagane.'
    titleField.value?.focus()
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
    await router.push({ name: 'admin-notices', query: { k: String(saved.id) } })
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    saving.value = false
  }
}
const savedText = computed(() => {
  if (!dirty.value) return editingId.value ? 'Bez zmian' : null
  return draftSavedAt.value ? `Wersja robocza z ${clock(draftSavedAt.value)}` : 'Niezapisane zmiany'
})
</script>

<template>
  <header class="adm-gl">
    <div>
      <RouterLink :to="{ name: 'admin-notices' }" class="adm-link"><v-icon icon="arrow_back" size="18" />Komunikaty</RouterLink>
      <h1>{{ editingId ? 'Edytuj komunikat' : 'Nowy komunikat' }}</h1>
    </div>
    <span v-if="savedText" class="znacz zapis"><v-icon :icon="dirty ? 'save' : 'check'" size="16" />{{ savedText }}</span>
  </header>

  <p v-if="missing" class="plyta podp uwaga" role="alert">Nie ma takiego komunikatu, mógł zostać usunięty. <RouterLink :to="{ name: 'admin-notices' }">Wróć do listy</RouterLink></p>
  <div v-else-if="!ready" class="adm-laduje" aria-busy="true" />
  <template v-else>
    <div v-if="restoredAt" class="plyta wiersz rozsun zawin przywr">
      <span>Przywrócono niezapisaną wersję z {{ clock(restoredAt) }} (z tej przeglądarki).</span>
      <v-btn class="drugi-btn" @click="discardDraft">Odrzuć ją</v-btn>
    </div>

    <div class="edytor">
      <div class="kol">
        <!-- treść -->
        <section class="plyta kol sekcja" aria-labelledby="h-tresc">
          <h2 id="h-tresc">Treść</h2>
          <v-text-field ref="titleField" v-model="form.title" label="Tytuł" counter="160" maxlength="160" class="tytul" />
          <div class="kol" style="gap: 8px">
            <div class="wiersz zawin" style="gap: 6px">
              <button type="button" class="chip" @click="insert('\n\n')">¶ Nowy akapit</button>
              <button type="button" class="chip" @click="insert('\n- ')"><v-icon icon="format_list_bulleted" size="18" />Punkt listy</button>
            </div>
            <v-textarea ref="bodyField" v-model="form.body" label="Treść" counter="5000" maxlength="5000" rows="7" auto-grow hide-details="auto" />
            <span class="podp">Pusta linia zaczyna akapit, wiersz od „- ” to punkt listy.</span>
          </div>
        </section>

        <!-- rodzaj -->
        <section class="plyta kol sekcja" aria-labelledby="h-rodzaj">
          <h2 id="h-rodzaj">Jak ważne</h2>
          <div class="rodzaje" role="group" aria-label="Rodzaj komunikatu">
            <button v-for="o in SEVERITY_OPTIONS" :key="o.value" type="button" class="rodzaj" :aria-pressed="form.severity === o.value" @click="setSeverity(o.value)">
              <span class="kzn" :class="KZN[o.value].cls" aria-hidden="true">{{ KZN[o.value].sign }}</span>
              <span><b>{{ o.title }}</b><small class="dr">{{ o.text }}</small></span>
            </button>
          </div>
          <span v-if="severityHint?.reason" class="podp">
            Z treści: „{{ severityHint.reason }}” → {{ noticeLabel[severityHint.value].toLowerCase() }}.
            <button v-if="severityHint.value !== form.severity" type="button" @click="setSeverity(severityHint.value)">Ustaw</button>
          </span>
        </section>

        <!-- czego dotyczy -->
        <section class="plyta kol sekcja" aria-labelledby="h-dot">
          <div>
            <h2 id="h-dot">Czego dotyczy</h2>
            <p class="podp">Od tego zależy, gdzie komunikat zobaczą pasażerowie (obok: „Gdzie się pokaże”).</p>
          </div>
          <v-autocomplete v-model="form.lines" :items="lineItems" label="Linie" multiple chips closable-chips clear-on-select hide-details>
            <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps">
                <template #prepend><span class="pasek" :style="{ background: item.color }" /></template>
              </v-list-item>
            </template>
          </v-autocomplete>
          <v-autocomplete v-model="form.stations" :items="stationItems" label="Stacje" multiple chips closable-chips clear-on-select :loading="!stations.loaded" hide-details />
          <div class="kol" style="gap: 6px">
            <v-combobox v-model="form.trains" label="Pociągi (numery)" multiple chips closable-chips hide-details>
              <template #chip="{ props: chipProps, item }">
                <v-chip v-bind="chipProps" :title="checkText(chipValue(item))">
                  <template #prepend>
                    <v-icon v-if="trainChecks.get(chipValue(item))?.state === 'ok'" icon="check" size="16" class="mr-1 ok-ik" />
                    <v-icon v-else-if="trainChecks.get(chipValue(item))?.state === 'missing'" icon="warning" size="16" class="mr-1 opoz-ik" />
                  </template>
                  {{ chipValue(item) }}
                </v-chip>
              </template>
            </v-combobox>
            <span class="podp" :class="{ uwaga: missingTrains.length }">
              <template v-if="missingTrains.length">Nie ma w rozkładzie na dziś i jutro: {{ missingTrains.join(', ') }}. Sprawdź numer (pociąg może kursować tylko w inne dni).</template>
              <template v-else>Wpisz numer i naciśnij Enter. Numery sprawdzamy w rozkładzie; POLREGIO i PKP Intercity dostaną skrót PR / IC.</template>
            </span>
          </div>

          <div v-if="hasSuggestions" class="podpowiedzi">
            <div class="wiersz rozsun"><b>W treści jest jeszcze</b><button type="button" class="adm-link" @click="addAll">Dodaj wszystkie</button></div>
            <div class="wiersz zawin" style="gap: 6px">
              <button v-for="l in suggestions.lines" :key="l.id" type="button" class="sg" @click="addLine(l.id)"><v-icon icon="add" size="16" /><span class="pasek maly-p" :style="{ background: l.color }" />{{ lineTitle(l) }}</button>
              <button v-for="s in suggestions.stations" :key="s.station.id" type="button" class="sg" @click="addStation(s.station.id)">
                <v-icon icon="add" size="16" />{{ s.station.name }}<span v-if="s.forms.some((f) => f !== s.station.name)" class="dr">({{ s.forms.filter((f) => f !== s.station.name).map((f) => `„${f}”`).join(', ') }})</span>
              </button>
              <button v-for="t in suggestions.trains" :key="t" type="button" class="sg" @click="addTrain(t)"><v-icon icon="add" size="16" />{{ t }}</button>
            </div>
            <span v-if="suggestions.stations.some((s) => s.hub)" class="podp">{{ HUB_STATION }} to zwykle tylko cel pociągów. Dodaj go, tylko jeśli utrudnienie dotyczy tej stacji.</span>
          </div>

          <div class="kol" style="gap: 6px">
            <v-text-field v-model="form.line" label="Dotyczy (opis pod tytułem)" maxlength="120" hide-details @update:model-value="onLineInput">
              <template v-if="!lineManual" #append-inner><span class="znacz">auto</span></template>
            </v-text-field>
            <span class="podp">Uzupełnia się z linii i stacji, dopóki nie wpiszesz własnego.</span>
          </div>
        </section>

        <!-- kiedy -->
        <section class="plyta kol sekcja" aria-labelledby="h-kiedy">
          <h2 id="h-kiedy">Kiedy</h2>
          <div class="kol" style="gap: 8px">
            <b class="maly">Pokaż pasażerom</b>
            <div class="wiersz zawin" style="gap: 6px">
              <button type="button" class="chip" :aria-pressed="!form.startsAt" @click="form.startsAt = ''">Od razu</button>
              <button v-for="o in beforeOptions" :key="o.days" type="button" class="chip" :aria-pressed="form.startsAt === o.value" @click="form.startsAt = o.value">{{ o.label }}: {{ shortStamp(o.value) }}</button>
            </div>
            <span v-if="period" class="podp">Utrudnienia z treści: „{{ period.text }}”.</span>
          </div>
          <div class="dwa-pola">
            <StampField v-model="form.startsAt" label="Publikuj od" empty-text="Od razu" default-time="18:00" />
            <StampField v-model="form.endsAt" label="Publikuj do" empty-text="Bez końca" default-time="23:59" />
          </div>
          <span v-if="period?.to && form.endsAt !== publishUntil(period.to)" class="podp">
            <button type="button" @click="form.endsAt = publishUntil(period.to!)">Ustaw koniec na ostatni dzień utrudnień ({{ period.to.split('-').reverse().slice(0, 2).join('.') }}, 23:59)</button>
          </span>
          <span v-else-if="endMissing" class="podp uwaga">Bez końca komunikat zostanie, dopóki go nie ukryjesz. Przy utrudnieniach lepiej ustawić datę.</span>
          <div class="przel-rz">
            <span><b>Widoczny dla pasażerów</b><small class="dr">wyłączony = szkic, widzisz go tylko w panelu</small></span>
            <button type="button" class="przel" role="switch" :aria-checked="form.active" aria-label="Widoczny dla pasażerów" @click="form.active = !form.active"><i /></button>
          </div>
        </section>
      </div>

      <aside class="kol bok" aria-label="Zapis, podgląd i zasięg">
        <!-- jedyna ciemna płyta: decyzja o publikacji -->
        <section class="blok kol zapis-blok" aria-label="Zapis">
          <p :class="{ 'zapis-uwaga': timing.warn }">{{ timing.text }}</p>
          <p v-if="error" class="zapis-blad" role="alert">{{ error }}</p>
          <v-btn class="glowny-btn" block :loading="saving" @click="save()">{{ primaryLabel }}</v-btn>
          <v-btn v-if="form.active" class="drugi-btn" block :disabled="saving" @click="save(true)">Zapisz jako szkic</v-btn>
        </section>

        <section class="plyta kol" style="gap: 12px" aria-labelledby="h-podglad">
          <h2 id="h-podglad">Tak zobaczy pasażer</h2>
          <div class="aseg" role="group" aria-label="Rodzaj podglądu">
            <button type="button" :aria-pressed="previewMode === 'short'" @click="previewMode = 'short'">Na liście</button>
            <button type="button" :aria-pressed="previewMode === 'page'" @click="previewMode = 'page'">Strona komunikatu</button>
          </div>
          <div v-if="previewMode === 'short'" class="kom podglad-kom">
            <span class="kzn" :class="KZN[form.severity].cls" aria-hidden="true">{{ KZN[form.severity].sign }}</span>
            <span class="min-w-0">
              <span class="t">{{ preview.title }}</span>
              <span class="o">{{ preview.body }}</span>
              <span class="meta"><span class="lin">{{ preview.line }}</span><span v-if="form.trains.length">· {{ form.trains.slice(0, 3).join(', ') }}{{ form.trains.length > 3 ? ` +${form.trains.length - 3}` : '' }}</span></span>
            </span>
          </div>
          <div v-else class="podglad-str">
            <div class="wiersz" style="gap: 8px"><span class="kzn m" :class="KZN[form.severity].cls" aria-hidden="true">{{ KZN[form.severity].sign }}</span><span class="dr maly">{{ KZN[form.severity].label }}</span></div>
            <h3>{{ preview.title }}</h3>
            <p class="dr maly">{{ preview.line }}</p>
            <template v-for="(b, i) in previewBlocks" :key="i">
              <p v-if="b.kind === 'p'" class="pre">{{ b.text }}</p>
              <ul v-else><li v-for="(item, j) in b.items" :key="j" class="pre">{{ item }}</li></ul>
            </template>
          </div>
        </section>

        <section class="plyta kol" style="gap: 0" aria-labelledby="h-gdzie">
          <h2 id="h-gdzie" style="margin-bottom: 4px">Gdzie się pokaże</h2>
          <div v-if="where.boards.length" class="gdzie"><v-icon icon="location_on" /><span><b>Tablice odjazdów: {{ where.boards.length }} {{ plural(where.boards.length, 'stacja', 'stacje', 'stacji') }}</b><small class="dr">{{ boardsText }}</small></span></div>
          <div v-if="where.trains || where.boards.length" class="gdzie"><v-icon icon="train" /><span><b>Przy pociągach i w wynikach wyszukiwania</b><small class="dr">{{ where.trains ? `${where.trains} ${plural(where.trains, 'wybrany pociąg', 'wybrane pociągi', 'wybranych pociągów')}` : '' }}{{ where.trains && where.boards.length ? ' oraz ' : '' }}{{ where.boards.length ? 'kursy zatrzymujące się na tych stacjach' : '' }}</small></span></div>
          <div v-if="where.lines.length" class="gdzie"><v-icon icon="route" /><span><b>Schemat połączeń</b><small class="dr">{{ where.lines.join(', ') }}</small></span></div>
          <div class="gdzie"><v-icon icon="campaign" /><span><b>Start i lista komunikatów</b><small class="dr">{{ form.active ? 'zawsze, gdy widoczny' : 'nie, to szkic' }}</small></span></div>
          <p v-if="!where.boards.length && !where.trains" class="podp" style="margin-top: 8px">Przypnij linię, stację albo pociąg, żeby komunikat pojawiał się przy pociągach i na tablicach.</p>
          <p v-if="form.severity === 'info'" class="podp" style="margin-top: 8px">Informacje pasażer może ukryć w ustawieniach; utrudnienia widzi zawsze.</p>
          <div v-if="where.hubViaLine" class="wezel">
            <b>Pokaże się też na tablicy Poznania Gł.</b>
            <span class="maly">Linia zaczyna się w Poznaniu. Jeśli to zbędne, zostaw same stacje.</span>
            <v-btn class="drugi-btn" @click="dropHubLines">{{ form.stations.length ? 'Zostaw tylko wybrane stacje' : 'Zamień linię na jej stacje' }}</v-btn>
          </div>
        </section>
      </aside>
    </div>
  </template>
</template>

<style scoped>
.zapis { height: 32px; padding: 0 12px; border-radius: 16px; gap: 6px; }
.przywr { gap: 8px 16px; padding: 12px 12px 12px 20px; }
.edytor { display: grid; gap: 20px; align-items: start; }
@media (min-width: 1000px) {
  .edytor { grid-template-columns: minmax(0, 1fr) 380px; gap: 28px; }
  .bok { position: sticky; top: 88px; max-height: calc(100dvh - 104px); overflow: auto; }
}
.sekcja { gap: 14px; padding: 20px; }
.tytul :deep(input) { font-size: 18px; font-weight: 700; }
.rodzaje { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; }
.rodzaj { display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: 12px; align-items: start; padding: 14px; border-radius: var(--r-m); background: var(--papier); text-align: left; }
.rodzaj span { display: flex; flex-direction: column; gap: 2px; }
.rodzaj small { font-size: 13px; line-height: 1.35; }
.rodzaj[aria-pressed='true'] { box-shadow: inset 0 0 0 2px var(--tusz); }
.pasek { display: inline-block; width: 24px; height: 6px; margin-right: 12px; border-radius: 3px; flex: none; }
.pasek.maly-p { width: 14px; height: 5px; margin-right: 0; }
.podpowiedzi { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: var(--r-m); background: var(--papier); }
.sg { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 4px 12px 4px 8px; border-radius: 17px; box-shadow: inset 0 0 0 1px var(--kreska); font-size: 13px; font-weight: 600; }
.sg:hover { background: var(--plyta); }
.ok-ik { color: var(--ok); }
.opoz-ik { color: var(--opoz); }
.chip[aria-pressed='false'] { background: var(--papier); }
.dwa-pola { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
.przel-rz { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-top: 4px; }
.przel-rz span { display: flex; flex-direction: column; }
.przel-rz small { font-size: 13px; }
.zapis-blok { gap: 10px; padding: 20px; }
.zapis-blok p { font-size: 15px; line-height: 1.45; }
.zapis-uwaga { color: #F2B95C; font-weight: 600; }
.zapis-blad { color: #FF8084; font-weight: 600; }
.podglad-kom { background: var(--papier); cursor: default; }
.podglad-kom:hover { background: var(--papier); }
.podglad-kom .t, .podglad-kom .o, .podglad-kom .meta { overflow-wrap: anywhere; }
.podglad-str { display: flex; flex-direction: column; gap: 8px; padding: 16px; border-radius: var(--r-m); background: var(--papier); }
.podglad-str h3 { font-size: 20px; line-height: 1.25; overflow-wrap: anywhere; }
.podglad-str ul { margin: 0; padding-left: 20px; display: grid; gap: 4px; }
.pre { white-space: pre-line; overflow-wrap: anywhere; }
.gdzie { display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 12px; padding: 10px 0; border-top: 1px solid var(--kreska); font-size: 14px; }
.gdzie:first-of-type { border-top: 0; }
.gdzie span { display: flex; flex-direction: column; gap: 2px; }
.gdzie small { font-size: 13px; }
.wezel { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; margin-top: 10px; padding: 14px; border-radius: var(--r-m); background: var(--opoz-tlo); color: var(--opoz); }
</style>
