<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { Severity } from '@/api/types'
import { useStations } from '@/stores/data'
import { readDraft, SEVERITY_OPTIONS, writeDraft, type NoticeForm } from '@/utils/adminNotices'
import { plural } from '@/utils/format'
import { analyzeNotice, publishBefore, publishUntil, segments, type NoticeAnalysis } from '@/utils/noticeText'
import { NOTICE_LINES, lineTitle, noticeIcon, scopeText } from '@/utils/notices'
import { checkTrains, trainChecks } from './trainCheck'

const router = useRouter()
const stations = useStations()
const STORE = 'kw_admin_paste'

// wklejony tekst zostaje na czas karty (powrót z edytora „Wróć do wklejki”)
const readStored = () => { try { return sessionStorage.getItem(STORE) ?? '' } catch { return '' } }
const text = ref(readStored())
const editing = ref(!text.value)
watch(text, (v) => { try { sessionStorage.setItem(STORE, v) } catch { /* bez pamięci karty — trudno */ } })

const analysis = ref<NoticeAnalysis<{ id: string; name: string }> | null>(null)
const title = ref('')
const severity = ref<Severity>('info')
const pickedStations = ref<string[]>([])
const pickedTrains = ref<string[]>([])
const pickedLines = ref<string[]>([])

/** Rozbiór tekstu i domyślne wybory: wszystko poza węzłem Poznań Gł. */
function analyze() {
  if (!text.value.trim()) return
  const a = analyzeNotice(text.value, stations.all)
  analysis.value = a
  title.value = a.title
  severity.value = a.severity.value
  pickedStations.value = a.stations.filter((s) => !s.hub).map((s) => s.station.id)
  pickedTrains.value = [...a.trains]
  pickedLines.value = [...a.lines]
  checkTrains(a.trains)
  editing.value = false
}
onMounted(async () => {
  await stations.load().catch(() => undefined)
  if (text.value.trim()) analyze()
})
function onPaste() {
  // po wklejeniu od razu rozbiór (tekst trafia do modelu w następnym takcie)
  window.setTimeout(analyze, 0)
}
function clearAll() {
  text.value = ''
  analysis.value = null
  editing.value = true
}

const parts = computed(() => (analysis.value ? segments(text.value, analysis.value.marks) : []))
const flip = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
const lineOf = (id: string) => NOTICE_LINES.find((l) => l.id === id)!
const dayText = (iso: string) => new Date(`${iso}T12:00`).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' })
const publishFrom = computed(() => (analysis.value?.period ? publishBefore(analysis.value.period.from, 2) : ''))
const publishText = computed(() => {
  if (!publishFrom.value) return 'pokaże się od razu po zapisaniu'
  const d = new Date(publishFrom.value)
  return `pokaże się 2 dni wcześniej: ${d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'numeric' })}, 18:00`
})

// przeniesienie do edytora (krok 2) jako wersja robocza nowego komunikatu
const replaceAsk = ref(false)
function transfer(force = false) {
  const a = analysis.value
  if (!a) return
  if (!force && readDraft('new') && readDraft('new')?.origin !== 'paste') {
    replaceAsk.value = true
    return
  }
  const stationNames = pickedStations.value.map((id) => stations.byId.get(id)?.name ?? id)
  const form: NoticeForm = {
    title: title.value.trim().slice(0, 160),
    body: a.body,
    line: scopeText(pickedLines.value, stationNames) || 'Cała sieć KW',
    severity: severity.value,
    trains: pickedTrains.value,
    stations: pickedStations.value,
    lines: pickedLines.value,
    startsAt: publishFrom.value,
    endsAt: a.period?.to ? publishUntil(a.period.to) : '',
    active: true,
  }
  writeDraft('new', { form, step: 2, savedAt: new Date().toISOString(), origin: 'paste' })
  void router.push({ name: 'admin-new' })
}
</script>

<template>
  <div class="paste">
    <header class="head">
      <div class="grow">
        <nav class="crumb text-label-large muted" aria-label="Okruszki">
          <router-link :to="{ name: 'admin-notices' }">Komunikaty</router-link>
          <v-icon icon="chevron_right" size="18" />
          <span>Wklej od przewoźnika</span>
        </nav>
        <h1 class="text-headline-medium font-weight-bold">Wklej od przewoźnika</h1>
      </div>
      <ol class="flow" aria-label="Postęp">
        <li :class="analysis ? 'done' : 'on'"><span class="num"><v-icon v-if="analysis" icon="check" size="16" /><template v-else>1</template></span>Wklej</li>
        <li :class="{ on: analysis }"><span class="num">2</span>Sprawdź</li>
        <li><span class="num">3</span>Edytor</li>
      </ol>
    </header>

    <div class="cols">
      <section class="card left" aria-labelledby="h-text">
        <div class="d-flex flex-wrap align-center ga-2">
          <h2 id="h-text" class="text-title-large font-weight-bold grow">Tekst aktualności</h2>
          <v-btn v-if="analysis && !editing" variant="outlined" size="small" prepend-icon="edit" @click="editing = true">Popraw tekst</v-btn>
          <v-btn v-if="text" variant="text" size="small" @click="clearAll">Wyczyść</v-btn>
        </div>
        <template v-if="editing">
          <v-textarea
            v-model="text"
            label="Wklej tutaj treść aktualności przewoźnika"
            rows="12"
            auto-grow
            hide-details
            autofocus
            @paste="onPaste"
          />
          <div class="d-flex flex-wrap align-center ga-3">
            <v-btn prepend-icon="wand_stars" :disabled="!text.trim()" :loading="!stations.loaded && !!text.trim()" @click="analyze">Rozpoznaj</v-btn>
            <span class="text-body-small muted">Pierwszy wiersz zostanie tytułem. Rozpoznamy daty, numery pociągów i stacje — także odmienione („z Konina”, „w Kole”).</span>
          </div>
        </template>
        <template v-else-if="analysis">
          <div class="legend text-label-large" aria-hidden="true">
            <span><i class="m-date" />daty</span><span><i class="m-train" />pociągi</span><span><i class="m-station" />stacje</span><span><span class="m-skip">podkreślone</span> — pominięte</span>
          </div>
          <div class="paper text-body-large"><template v-for="(p, i) in parts" :key="i"><mark v-if="p.kind" :class="`m-${p.kind}`">{{ p.text }}</mark><template v-else>{{ p.text }}</template></template></div>
        </template>
      </section>

      <section class="card right" aria-labelledby="h-found">
        <h2 id="h-found" class="text-title-large font-weight-bold">Rozpoznane</h2>
        <p v-if="!analysis" class="muted">Wklej tekst po lewej — tu pojawi się tytuł, okres, rodzaj, linie, stacje i pociągi do sprawdzenia.</p>
        <template v-else>
          <div class="grp">
            <v-text-field v-model="title" label="Tytuł" counter="160" maxlength="160" density="comfortable" />
            <span class="from">z pierwszego wiersza{{ /na odcinku/i.test(text) ? ', bez „na odcinku”' : '' }}</span>
          </div>
          <div class="grp">
            <div class="glabel">Okres utrudnień</div>
            <template v-if="analysis.period">
              <div class="val">{{ dayText(analysis.period.from) }}{{ analysis.period.to && analysis.period.to !== analysis.period.from ? ` – ${dayText(analysis.period.to)}` : analysis.period.to ? '' : ' – do odwołania' }}</div>
              <div class="from">z „{{ analysis.period.text }}” · {{ publishText }}</div>
            </template>
            <div v-else class="from">Nie znaleziono dat — ustawisz je w edytorze (krok 3).</div>
          </div>
          <div class="grp">
            <div class="glabel">Rodzaj</div>
            <div class="pills">
              <button v-for="o in SEVERITY_OPTIONS" :key="o.value" type="button" class="pill" :aria-pressed="severity === o.value" @click="severity = o.value">
                <v-icon :icon="noticeIcon[o.value]" size="18" />{{ o.title }}
              </button>
            </div>
            <div v-if="analysis.severity.reason" class="from">z „{{ analysis.severity.reason }}”</div>
          </div>
          <div v-if="analysis.lines.length" class="grp">
            <div class="glabel">Linia</div>
            <div class="toggles">
              <button v-for="id in analysis.lines" :key="id" type="button" class="tg" :aria-pressed="pickedLines.includes(id)" @click="pickedLines = flip(pickedLines, id)">
                <span class="bx"><v-icon v-if="pickedLines.includes(id)" icon="check" size="16" /></span>
                <span class="sw" :style="{ background: lineOf(id).color }" />
                <span><span class="nm">{{ lineTitle(lineOf(id)) }}</span><span class="sub">rozpoznane stacje leżą na tej linii</span></span>
              </button>
            </div>
          </div>
          <div class="grp">
            <div class="glabel">Stacje · {{ pickedStations.length }} z {{ analysis.stations.length }}</div>
            <div v-if="analysis.stations.length" class="toggles">
              <button v-for="s in analysis.stations" :key="s.station.id" type="button" class="tg" :aria-pressed="pickedStations.includes(s.station.id)" @click="pickedStations = flip(pickedStations, s.station.id)">
                <span class="bx"><v-icon v-if="pickedStations.includes(s.station.id)" icon="check" size="16" /></span>
                <span><span class="nm">{{ s.station.name }}</span><span class="sub">{{ s.hub ? 'węzeł, zwykle tylko cel pociągów' : s.forms.map((f) => `„${f}”`).join(', ') }}</span></span>
              </button>
            </div>
            <div v-else class="from">Nie znaleziono nazw stacji.</div>
          </div>
          <div class="grp">
            <div class="glabel">Pociągi · {{ pickedTrains.length }}</div>
            <div v-if="analysis.trains.length" class="toggles">
              <button v-for="t in analysis.trains" :key="t" type="button" class="tg" :aria-pressed="pickedTrains.includes(t)" @click="pickedTrains = flip(pickedTrains, t)">
                <span class="bx"><v-icon v-if="pickedTrains.includes(t)" icon="check" size="16" /></span>
                <span>
                  <span class="nm">{{ t }}</span>
                  <span class="sub">
                    <template v-if="trainChecks.get(t)?.state === 'ok'">{{ (trainChecks.get(t) as { text: string }).text }}</template>
                    <template v-else-if="trainChecks.get(t)?.state === 'missing'">brak w rozkładzie na dziś i jutro</template>
                    <template v-else-if="trainChecks.get(t)?.state === 'checking'">sprawdzam w rozkładzie…</template>
                  </span>
                </span>
              </button>
            </div>
            <div v-else class="from">Nie znaleziono numerów pociągów.</div>
            <div v-if="analysis.skipped.length" class="skipped">
              <span class="from">Pominięto:</span>
              <span v-for="s in analysis.skipped" :key="s.text + s.why" class="from"><s>{{ s.text }}</s> ({{ s.why }})</span>
            </div>
          </div>
          <div class="foot">
            <v-btn append-icon="arrow_forward" :disabled="!title.trim() || !analysis.body.trim()" @click="transfer()">Przenieś do edytora</v-btn>
            <span class="from">Treść trafi do edytora bez zmian (listy zostaną listami) — wszystko można jeszcze poprawić.</span>
          </div>
          <p v-if="!analysis.body.trim()" class="from text-warning">Pod tytułem nie ma treści — dopisz ją w tekście po lewej.</p>
          <p class="from">{{ pickedStations.length + pickedLines.length ? `Komunikat pokaże się przy ${pickedLines.length ? `${pickedLines.length} ${plural(pickedLines.length, 'linii', 'liniach', 'liniach')} i ` : ''}${pickedStations.length} ${plural(pickedStations.length, 'stacji', 'stacjach', 'stacjach')}` : 'Bez stacji i linii komunikat pokaże się tylko na starcie i liście komunikatów' }}{{ pickedTrains.length ? ` oraz ${pickedTrains.length} ${plural(pickedTrains.length, 'pociągu', 'pociągach', 'pociągach')}.` : '.' }}</p>
        </template>
      </section>
    </div>

    <v-dialog v-model="replaceAsk" max-width="440">
      <v-card color="surface-container-high">
        <v-card-item prepend-icon="draft"><v-card-title>Zastąpić niezapisany komunikat?</v-card-title></v-card-item>
        <v-card-text>W edytorze czeka niezapisany nowy komunikat. Wklejka go zastąpi.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :to="{ name: 'admin-new' }">Otwórz tamten</v-btn>
          <v-btn variant="text" color="primary" @click="replaceAsk = false; transfer(true)">Zastąp</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.paste { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
.head { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px 16px; }
.grow { flex: 1 1 auto; min-width: 0; }
.crumb { display: flex; align-items: center; gap: 4px; }
.crumb a { color: inherit; }
.flow { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
.flow li { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px 0 6px; border-radius: 999px; background: rgb(var(--v-theme-surface)); font-weight: 700; color: rgb(var(--v-theme-on-surface-variant)); }
.flow .num { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 999px; background: rgb(var(--v-theme-surface-container-high)); font-size: 13px; }
.flow .done .num { background: rgb(var(--v-theme-success-container)); color: rgb(var(--v-theme-on-success-container)); }
.flow .on { background: rgb(var(--v-theme-inverse-surface)); color: rgb(var(--v-theme-on-inverse-surface)); }
.flow .on .num { background: rgb(var(--v-theme-primary)); color: rgb(var(--v-theme-on-primary)); }
.cols { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
.left { flex: 999 1 480px; min-width: 0; padding: 24px; display: grid; gap: 16px; }
.right { flex: 1 1 400px; min-width: 0; padding: 24px; display: grid; gap: 0; }
.legend { display: flex; flex-wrap: wrap; gap: 14px; }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.legend i { display: block; width: 14px; height: 14px; border-radius: 4px; }
.paper { white-space: pre-wrap; padding: 20px 22px; border-radius: var(--kw-r-m); box-shadow: inset 0 0 0 1px rgb(var(--v-theme-outline-variant)); line-height: 1.65; overflow-wrap: anywhere; }
mark { border-radius: 5px; padding: 1px 3px; font-weight: 600; color: inherit; }
.m-date { background: rgb(var(--v-theme-warning-container)); color: rgb(var(--v-theme-on-warning-container)); }
.m-train { background: rgb(var(--v-theme-info-container)); color: rgb(var(--v-theme-on-info-container)); }
.m-station { background: rgb(var(--v-theme-success-container)); color: rgb(var(--v-theme-on-success-container)); }
mark.m-skip, .m-skip { background: none; padding: 0; font-weight: inherit; text-decoration: underline dotted rgb(var(--v-theme-outline)); text-underline-offset: 4px; }
.grp { display: grid; gap: 8px; padding: 16px 0; border-top: 1px solid rgb(var(--v-theme-outline-variant)); }
.grp:first-of-type { border-top: 0; padding-top: 8px; }
.glabel { font-size: 13px; font-weight: 800; color: rgb(var(--v-theme-on-surface-variant)); letter-spacing: .2px; text-transform: uppercase; }
.val { font-size: 16px; font-weight: 700; }
.from { font-size: 12px; line-height: 16px; color: rgb(var(--v-theme-on-surface-variant)); margin: 0; }
.pills { display: flex; flex-wrap: wrap; gap: 8px; }
.pill { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 14px 0 10px; border: 0; border-radius: 999px; font: inherit; font-weight: 600; cursor: pointer; background: rgb(var(--v-theme-surface)); color: rgb(var(--v-theme-on-surface)); box-shadow: inset 0 0 0 1px rgb(var(--v-theme-outline-variant)); }
.pill[aria-pressed='true'] { background: rgb(var(--v-theme-inverse-surface)); color: rgb(var(--v-theme-on-inverse-surface)); box-shadow: none; }
.toggles { display: flex; flex-wrap: wrap; gap: 8px; }
.tg { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 6px 14px 6px 8px; border: 0; border-radius: 14px; font: inherit; text-align: left; cursor: pointer; background: rgb(var(--v-theme-surface-container)); color: rgb(var(--v-theme-on-surface)); }
.tg .bx { display: grid; place-items: center; width: 20px; height: 20px; flex: none; border-radius: 6px; box-shadow: inset 0 0 0 2px rgb(var(--v-theme-outline)); }
.tg[aria-pressed='true'] { background: rgb(var(--v-theme-secondary-container)); color: rgb(var(--v-theme-on-secondary-container)); }
.tg[aria-pressed='true'] .bx { background: rgb(var(--v-theme-primary)); color: rgb(var(--v-theme-on-primary)); box-shadow: none; }
.tg .nm { display: block; font-weight: 700; line-height: 18px; }
.tg .sub { display: block; font-size: 12px; line-height: 15px; opacity: .85; }
.sw { width: 14px; height: 5px; border-radius: 3px; flex: none; }
.skipped { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; }
.foot { display: grid; gap: 8px; justify-items: start; padding-top: 16px; border-top: 1px solid rgb(var(--v-theme-outline-variant)); }
</style>
