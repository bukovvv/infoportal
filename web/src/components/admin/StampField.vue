<script setup lang="ts">
// Data i godzina publikacji komunikatu: 'RRRR-MM-DDTGG:MM' albo '' (bez granicy).
// Jedno okienko w stylu wersji 2.0 (paleta z motywu tarcza w panelu, także w oknie poza panelem): szybkie dni, kalendarz miesiąca, godzina i minuty w kolumnach jak w 2.0.
import { computed, ref } from 'vue'
import { localStamp } from '@/utils/noticeText'

const model = defineModel<string>({ required: true })
const props = defineProps<{ label: string; emptyText: string; defaultTime?: string }>()

const MONTHS = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień']
const WEEK = ['pn', 'wt', 'śr', 'cz', 'pt', 'sb', 'nd']
const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fromIso = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const todayIso = () => iso(new Date())

// pole: „śr., 26 lis · 18:00”
const short = new Intl.DateTimeFormat('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })
const text = computed(() => (model.value ? `${short.format(fromIso(model.value.slice(0, 10)))} · ${model.value.slice(11, 16)}` : ''))

// --- okienko (kopia robocza, zapis dopiero po „Gotowe”)
const open = ref(false)
const day = ref('')
const h = ref(0)
const m = ref(0)
const month = ref(new Date())
function start() {
  let v = model.value
  if (!v) {
    const d = new Date()
    d.setMinutes(0, 0, 0)
    d.setHours(d.getHours() + 1)
    v = props.defaultTime ? `${iso(d)}T${props.defaultTime}` : localStamp(d)
  }
  day.value = v.slice(0, 10)
  h.value = Number(v.slice(11, 13))
  m.value = Number(v.slice(14, 16))
  const d = fromIso(day.value)
  month.value = new Date(d.getFullYear(), d.getMonth(), 1)
  open.value = true
}
function done() {
  model.value = `${day.value}T${pad(h.value)}:${pad(m.value)}`
  open.value = false
}

const quick = computed(() => {
  const t = new Date()
  return [['Dziś', 0], ['Jutro', 1], ['Pojutrze', 2], ['Za tydzień', 7]].map(([l, n]) => ({ label: l as string, value: iso(addDays(t, n as number)) }))
})
function pick(v: string) {
  day.value = v
  const d = fromIso(v)
  month.value = new Date(d.getFullYear(), d.getMonth(), 1)
}
const monthTitle = computed(() => `${MONTHS[month.value.getMonth()]} ${month.value.getFullYear()}`)
const shift = (n: number) => { month.value = new Date(month.value.getFullYear(), month.value.getMonth() + n, 1) }
/** 6 tygodni od poniedziałku przed pierwszym dniem miesiąca */
const cells = computed(() => {
  const first = month.value
  const start = addDays(first, -((first.getDay() + 6) % 7))
  return Array.from({ length: 42 }, (_, i) => {
    const d = addDays(start, i)
    return { iso: iso(d), n: d.getDate(), other: d.getMonth() !== first.getMonth() }
  })
})
const fullDay = computed(() => (day.value ? new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(fromIso(day.value)) : ''))

// godzina i minuty: strzałki (godzina ±1, minuty ±5) albo wpisanie z klawiatury
const stepH = (d: number) => { h.value = (h.value + d + 24) % 24 }
const stepM = (d: number) => { m.value = (Math.round(m.value / 5) * 5 + d * 5 + 60) % 60 }
const typeNum = (e: Event, max: number, set: (n: number) => void) => {
  const n = Number((e.target as HTMLInputElement).value.replace(/\D/g, '').slice(-2))
  if (Number.isFinite(n) && n <= max) set(n)
}
const times = computed(() => [...new Set([props.defaultTime, '06:00', '12:00', '18:00', '23:59'].filter(Boolean) as string[])])
const setTime = (t: string) => { h.value = Number(t.slice(0, 2)); m.value = Number(t.slice(3, 5)) }
</script>

<template>
  <fieldset class="stamp">
    <legend class="lbl">{{ label }}</legend>
    <div v-if="model" class="row">
      <button type="button" class="pole" :aria-label="`${label}: ${text}. Zmień`" @click="start">
        <v-icon icon="calendar_month" size="20" /><span>{{ text }}</span>
      </button>
      <button type="button" class="kolo" :aria-label="`${label}: usuń datę`" @click="model = ''"><v-icon icon="close" size="18" /></button>
    </div>
    <div v-else class="row">
      <span class="empty">{{ emptyText }}</span>
      <button type="button" class="drugi" @click="start"><v-icon icon="calendar_month" size="18" />Ustaw datę</button>
    </div>
  </fieldset>

  <v-dialog v-model="open" width="auto" scrollable>
    <div class="tz-okno" role="dialog" :aria-label="label">
      <div class="gl">
        <h2>{{ label }}</h2>
        <button type="button" class="kolo" aria-label="Zamknij" @click="open = false"><v-icon icon="close" size="18" /></button>
      </div>

      <section class="kol">
        <b>Dzień</b>
        <div class="szybkie">
          <button v-for="q in quick" :key="q.value" type="button" class="chip" :aria-pressed="day === q.value" @click="pick(q.value)">{{ q.label }}</button>
        </div>
        <div class="kal">
          <div class="kal-gl">
            <button type="button" class="kolo maly" aria-label="Poprzedni miesiąc" @click="shift(-1)"><v-icon icon="chevron_left" size="18" /></button>
            <b>{{ monthTitle }}</b>
            <button type="button" class="kolo maly" aria-label="Następny miesiąc" @click="shift(1)"><v-icon icon="chevron_right" size="18" /></button>
          </div>
          <div class="siatka" role="grid">
            <span v-for="w in WEEK" :key="w" class="tyg">{{ w }}</span>
            <button
              v-for="c in cells" :key="c.iso" type="button" class="dzien"
              :class="{ inny: c.other, dzis: c.iso === todayIso() }" :aria-pressed="c.iso === day" :aria-label="c.iso" @click="pick(c.iso)"
            >{{ c.n }}</button>
          </div>
        </div>
        <p class="dr">{{ fullDay }}</p>
      </section>

      <section class="kol">
        <b>Godzina</b>
        <div class="zegar">
          <div class="slup">
            <button type="button" class="kolo" aria-label="Godzina później" @click="stepH(1)"><v-icon icon="keyboard_arrow_up" size="20" /></button>
            <input :value="pad(h)" inputmode="numeric" maxlength="2" aria-label="Godzina" @change="typeNum($event, 23, (n) => (h = n))">
            <button type="button" class="kolo" aria-label="Godzina wcześniej" @click="stepH(-1)"><v-icon icon="keyboard_arrow_down" size="20" /></button>
            <span>godzina</span>
          </div>
          <span class="dw" aria-hidden="true">:</span>
          <div class="slup">
            <button type="button" class="kolo" aria-label="Minuty później" @click="stepM(1)"><v-icon icon="keyboard_arrow_up" size="20" /></button>
            <input :value="pad(m)" inputmode="numeric" maxlength="2" aria-label="Minuty" @change="typeNum($event, 59, (n) => (m = n))">
            <button type="button" class="kolo" aria-label="Minuty wcześniej" @click="stepM(-1)"><v-icon icon="keyboard_arrow_down" size="20" /></button>
            <span>minuty</span>
          </div>
        </div>
        <div class="szybkie">
          <button v-for="t in times" :key="t" type="button" class="chip" :aria-pressed="`${pad(h)}:${pad(m)}` === t" @click="setTime(t)">{{ t }}</button>
        </div>
      </section>

      <div class="stopka">
        <button type="button" class="drugi" @click="open = false">Anuluj</button>
        <button type="button" class="glowny" @click="done">Gotowe</button>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.stamp { border: 0; margin: 0; padding: 0; min-width: 0; display: grid; gap: 6px; }
.lbl { font-size: 13px; font-weight: 600; color: var(--tusz-2); padding: 0; margin-bottom: 6px; }
.row { display: flex; align-items: center; gap: 8px; min-height: 48px; }
.empty { flex: 1; font-size: 16px; font-weight: 500; }
.pole { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; height: 48px; padding: 0 16px; border: 0; border-radius: 16px; background: var(--papier); color: var(--tusz); font-weight: 600; font-size: 16px; line-height: 1; font-family: inherit; cursor: pointer; text-align: left; }
.pole span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pole:hover { box-shadow: inset 0 0 0 2px var(--kreska); }
.kolo { flex: none; width: 40px; height: 40px; border: 0; border-radius: 50%; display: grid; place-items: center; background: var(--plyta); color: var(--tusz); cursor: pointer; }
.kolo:hover { background: var(--plyta-2); }
.kolo.maly { width: 34px; height: 34px; }
.row .kolo { background: var(--papier); }
.drugi { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 16px; border: 0; border-radius: 20px; background: var(--papier); color: var(--tusz); font-weight: 600; font-size: 14px; line-height: 1; font-family: inherit; cursor: pointer; }
.drugi:hover { background: var(--plyta-2); }

/* okienko */
.tz-okno { font-family: 'Inter Tarcza', system-ui, sans-serif; width: min(420px, calc(100vw - 24px)); max-height: calc(100dvh - 32px); overflow: auto; box-sizing: border-box; padding: 20px; border-radius: 28px; background: var(--papier); color: var(--tusz); display: flex; flex-direction: column; gap: 18px; overscroll-behavior: contain; }
.gl { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.gl h2 { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
.kol { display: flex; flex-direction: column; gap: 8px; }
.kol > b { font-size: 15px; }
.szybkie { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { height: 36px; padding: 0 14px; border: 0; border-radius: 18px; background: var(--plyta); color: var(--tusz); font-weight: 600; font-size: 14px; line-height: 1; font-family: inherit; cursor: pointer; font-variant-numeric: tabular-nums; }
.chip:hover { background: var(--plyta-2); }
.chip[aria-pressed='true'] { background: var(--tusz); color: var(--papier); }
.dr { margin: 0 2px; font-size: 13px; color: var(--tusz-2); }
.dr::first-letter { text-transform: uppercase; }
.kal { background: var(--plyta); border-radius: 22px; padding: 10px; }
.kal-gl { display: flex; align-items: center; justify-content: space-between; padding: 0 2px 6px; }
.kal-gl b { font-size: 15px; }
.kal-gl b::first-letter { text-transform: uppercase; }
.kal-gl .kolo { background: var(--papier); }
.siatka { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.tyg { text-align: center; font-size: 12px; font-weight: 600; color: var(--tusz-2); padding: 4px 0; }
.dzien { aspect-ratio: 1; max-height: 44px; border: 0; border-radius: 50%; background: none; color: var(--tusz); font-weight: 600; font-size: 14px; line-height: 1; font-family: inherit; cursor: pointer; font-variant-numeric: tabular-nums; }
.dzien:hover { background: var(--papier); }
.dzien.inny { color: var(--tusz-2); opacity: .55; }
.dzien.dzis { box-shadow: inset 0 0 0 2px var(--kreska); }
.dzien[aria-pressed='true'] { background: var(--tusz); color: var(--papier); opacity: 1; box-shadow: none; }
.zegar { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 12px; border-radius: 22px; background: var(--plyta); }
.slup { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.slup .kolo { background: var(--papier); }
.slup input { all: unset; width: 72px; text-align: center; font-weight: 700; font-size: 40px; line-height: 1.1; font-family: inherit; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; color: var(--tusz); border-radius: 12px; }
.slup input:focus { box-shadow: inset 0 0 0 2px var(--tusz); }
.slup span { font-size: 12px; color: var(--tusz-2); }
.dw { font-weight: 700; font-size: 36px; line-height: 1; font-family: inherit; color: var(--tusz-2); margin-bottom: 20px; }
.stopka { display: flex; gap: 8px; justify-content: flex-end; }
.stopka .drugi { background: var(--plyta); height: 48px; padding: 0 20px; border-radius: 24px; }
.glowny { height: 48px; padding: 0 28px; border: 0; border-radius: 24px; background: var(--akcja); color: var(--na-akcji); font-weight: 700; font-size: 15px; line-height: 1; font-family: inherit; cursor: pointer; }
.glowny:hover { filter: brightness(1.08); }
:is(.kolo, .drugi, .chip, .dzien, .glowny, .pole):focus-visible { outline: 2px solid var(--tusz); outline-offset: 2px; }
</style>
