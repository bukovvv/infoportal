<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { api } from '@/api/client'
import type { Punctuality } from '@/api/types'
import { plural } from '@/utils/format'

// Punktualność pociągu z ostatnich 30 dni (opóźnienie na stacji końcowej, na czas = do 5 min). Pokazujemy od MIN_RUNS kursów.
// trimmed: kurs POLREGIO / PKP Intercity przycięty do Wielkopolski — liczy się ostatnia stacja w województwie.
const props = defineProps<{ number: string; agency?: string; trimmed?: boolean }>()
const MIN_RUNS = 5
/** pasek ostatnich kursów: wysokość do LATE_CAP min opóźnienia */
const LATE_CAP = 30
const data = ref<Punctuality | null>(null)

/** numer bez nazwy pociągu, jak zapisuje serwer: „1804/5 Bolesław Prus” → „1804/5” */
const plainNumber = computed(() => /^\d+(?:\/\d+)*/.exec(props.number.trim())?.[0] ?? '')
watch([plainNumber, () => props.agency], async ([number, agency]) => {
  data.value = null
  if (!number) return
  try {
    data.value = await api.punctuality(number, agency ?? 'KW')
  } catch {
    data.value = null
  }
}, { immediate: true })

const p = computed(() => (data.value && data.value.runs >= MIN_RUNS ? data.value : null))
type Kind = 'ok' | 'late' | 'bad' | 'cancelled'
const kindOf = (r: Punctuality['recent'][number]): Kind => (r.cancelled ? 'cancelled' : (r.delay ?? 0) <= 5 ? 'ok' : (r.delay ?? 0) <= 20 ? 'late' : 'bad')
const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', timeZone: 'Europe/Warsaw' })
const bars = computed(() => (p.value?.recent ?? []).map((r) => {
  const kind = kindOf(r)
  const minutes = Math.min(LATE_CAP, r.delay ?? 0)
  return {
    kind,
    height: kind === 'cancelled' ? 100 : 8 + (minutes / LATE_CAP) * 92,
    label: `${day(r.date)}: ${r.cancelled ? 'odwołany' : r.delay ? `+${r.delay} min` : 'na czas'}`,
  }
}))
const facts = computed(() => {
  const d = p.value
  if (!d) return []
  return [
    d.avgDelay !== null ? `średnio +${d.avgDelay} min` : '',
    d.maxDelay ? `najwięcej +${d.maxDelay} min` : '',
    d.cancelled ? `${d.cancelled} ${plural(d.cancelled, 'odwołany', 'odwołane', 'odwołanych')}` : '',
    `${d.runs} ${plural(d.runs, 'kurs', 'kursy', 'kursów')}`,
  ].filter(Boolean)
})
const legend = computed(() => {
  const kinds = new Set(bars.value.map((b) => b.kind))
  return ([['ok', 'na czas'], ['late', '6–20 min'], ['bad', 'ponad 20 min'], ['cancelled', 'odwołany']] as const).filter(([k]) => kinds.has(k))
})
const summary = computed(() => (p.value ? `Ostatnie ${bars.value.length} kursów: ${bars.value.map((b) => b.label).join(', ')}` : ''))
</script>

<template>
  <section v-if="p" class="punct" aria-labelledby="punct-title">
    <h3 id="punct-title" class="text-title-small">Punktualność <span class="muted">· ostatnie {{ p.days }} dni</span></h3>
    <div class="hero">
      <span class="share tnum">{{ p.share }}%</span>
      <span class="hero-text">
        <span class="text-body-large">kursów na czas</span>
        <span class="text-body-small muted">do 5 min opóźnienia na {{ trimmed ? 'ostatniej stacji w Wielkopolsce' : 'stacji końcowej' }}</span>
      </span>
    </div>
    <p class="text-body-small muted tnum">{{ facts.join(' · ') }}</p>
    <div class="chart" :style="{ '--n': bars.length }">
      <div class="bars" role="img" :aria-label="summary">
        <span v-for="(b, i) in bars" :key="i" class="bar" :class="b.kind" :style="{ height: `${b.height}%` }" :title="b.label" />
      </div>
      <div class="axis text-label-small muted tnum" aria-hidden="true">
        <span>{{ day(p.recent[0].date) }}</span><span>{{ day(p.recent[p.recent.length - 1].date) }}</span>
      </div>
    </div>
    <ul class="legend text-label-small" aria-hidden="true">
      <li v-for="[k, text] in legend" :key="k"><span class="sw" :class="k" />{{ text }}</li>
    </ul>
  </section>
</template>

<style scoped>
.punct { display: grid; gap: 8px; padding: 16px 24px 20px; }
.hero { display: flex; align-items: center; gap: 14px; }
.share { font-size: 40px; line-height: 44px; font-weight: 800; letter-spacing: -0.5px; }
.hero-text { display: grid; }
/* ostatnie kursy: słupek = opóźnienie na końcu (do 30 min), kolor = stan; przerwa 2 px, zaokrąglony wierzch, wspólna linia bazowa */
.bars {
  display: flex; align-items: flex-end; gap: 2px; height: 44px; margin-top: 4px; padding-bottom: 1px;
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
}
.chart { display: grid; gap: 4px; width: min(100%, calc(var(--n) * 18px)); min-width: 160px; }
.bar { flex: 1 1 0; min-width: 3px; border-radius: 4px 4px 0 0; }
.ok, .sw.ok { background: rgb(var(--v-theme-success)); }
.late, .sw.late { background: rgb(var(--v-theme-warning)); }
.bad, .sw.bad { background: rgb(var(--v-theme-error)); }
/* odwołany: pełna wysokość w ukośne paski — nie tylko kolor */
.cancelled, .sw.cancelled {
  background: repeating-linear-gradient(135deg, rgb(var(--v-theme-error)) 0 3px, transparent 3px 6px);
  box-shadow: inset 0 0 0 1px rgb(var(--v-theme-error));
}
.axis { display: flex; justify-content: space-between; }
.legend { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 2px 0 0; padding: 0; list-style: none; color: rgb(var(--v-theme-on-surface-variant)); }
.legend li { display: inline-flex; align-items: center; gap: 6px; }
.sw { width: 10px; height: 10px; border-radius: 3px; }
@media (max-width: 480px) { .punct { padding: 16px; } }
</style>
