<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { Station } from '@/api/types'
import { useStations } from '@/stores/data'
import { normalize } from '@/utils/format'

// Pole stacji w stylu Tarczy (.pole) z własną listą podpowiedzi (.lista): kropki linii, pogrubione dopasowanie,
// strzałki/Enter/Esc. Model = id stacji (null — nic nie wybrano); wpisany tekst bez wyboru nie zmienia modelu.
const model = defineModel<string | null>({ required: true })
const props = defineProps<{ label: string; id: string }>()
const stations = useStations()
void stations.load()

const text = ref('')
const open = ref(false)
const active = ref(-1)
const input = ref<HTMLInputElement | null>(null)
const listId = computed(() => `${props.id}-lista`)

// tekst pola idzie za wybraną stacją (także po zamianie Skąd/Dokąd i po wczytaniu listy stacji)
watch([model, () => stations.loaded], () => { text.value = model.value ? stations.byId.get(model.value)?.name ?? '' : '' }, { immediate: true })

const query = computed(() => (open.value && text.value !== (stations.byId.get(model.value ?? '')?.name ?? '') ? text.value : ''))
const items = computed(() => stations.search(query.value, 8))
// kolory linii jak w makiecie (lista linii stacji z API: „KW”, „PKM2”, „SKA1”, „K7P”…)
const COLORS: Record<string, string> = { PKM1: '#3A76C2', PKM2: '#EA1A35', PKM3: '#3F9236', PKM4: '#823D8C', PKM5: '#E8B120', KW: '#E6000A', SKA1: '#00B1EB', SKA2: '#E82F89', SKA3: '#FBBA21', K3: '#E84D0F', K5: '#F29EC4', K7: '#008C36', K22: '#95C11F', K32: '#69BFAC', K33: '#951A80', K52: '#BD1621', K63: '#4464AC', K71: '#28235B' }
const dots = (s: Station) => [...new Set(s.lines.map((l) => l.replace(/ ?P$/, '')))].slice(0, 4).map((l) => COLORS[l] ?? '#8A8F98')
/** nazwa podzielona na część przed, dopasowanie i po (pogrubione dopasowanie bez v-html) */
function parts(name: string) {
  const q = normalize(query.value)
  const i = q ? normalize(name).indexOf(q) : -1
  return i < 0 ? [name, '', ''] : [name.slice(0, i), name.slice(i, i + q.length), name.slice(i + q.length)]
}

function show() {
  open.value = true
  active.value = query.value && items.value.length ? 0 : -1
}
function pick(s: Station) {
  model.value = s.id
  text.value = s.name
  open.value = false
}
function onInput(e: Event) {
  text.value = (e.target as HTMLInputElement).value
  open.value = true
  active.value = text.value && items.value.length ? 0 : -1
}
function onKey(e: KeyboardEvent) {
  const n = items.value.length
  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && n) {
    e.preventDefault()
    if (!open.value) return show()
    active.value = (active.value + (e.key === 'ArrowDown' ? 1 : n - 1)) % n
    void nextTick(() => document.getElementById(`${listId.value}-${active.value}`)?.scrollIntoView({ block: 'nearest' }))
  } else if (e.key === 'Enter' && open.value && active.value >= 0) {
    e.preventDefault()
    pick(items.value[active.value])
  } else if (e.key === 'Escape' && open.value) {
    e.stopPropagation()
    open.value = false
  }
}
// po wyjściu z pola: wpisany tekst bez wyboru — najlepsza podpowiedź, inaczej nazwa wybranej stacji
function onBlur() {
  if (open.value && query.value && items.value.length) pick(items.value[0])
  open.value = false
  text.value = model.value ? stations.byId.get(model.value)?.name ?? text.value : text.value
}
// strzałka i puste miejsce pola przełączają listę (bez zdejmowania fokusu z pola)
function onPoleDown(e: MouseEvent) {
  if (e.target === input.value) return
  e.preventDefault()
  if (open.value) open.value = false
  else { input.value?.focus(); show() }
}
</script>

<template>
  <div class="st-pole">
    <label class="pole" @mousedown="onPoleDown">
      <span>{{ label }}</span>
      <input
        :id="id" ref="input" :value="text" data-lista role="combobox" aria-autocomplete="list" :aria-controls="listId" :aria-expanded="open"
        :aria-activedescendant="open && active >= 0 ? `${listId}-${active}` : undefined" autocomplete="off" :name="`${id}-stacja`" spellcheck="false"
        @focus="show" @click="open || show()" @input="onInput" @keydown="onKey" @blur="onBlur"
      >
    </label>
    <div v-if="open" :id="listId" class="lista otw" role="listbox" :aria-label="`Podpowiedzi: ${label}`" @mousedown.prevent>
      <div v-if="!query" class="et" aria-hidden="true">Najczęściej wybierane</div>
      <div
        v-for="(s, i) in items" :id="`${listId}-${i}`" :key="s.id" role="option" :aria-selected="i === active" :style="{ '--i': i }"
        @click="pick(s)"
      >
        <span class="n">{{ parts(s.name)[0] }}<mark>{{ parts(s.name)[1] }}</mark>{{ parts(s.name)[2] }}</span>
        <span class="k"><i v-for="(c, j) in dots(s)" :key="j" :style="{ '--c': c }" /></span>
      </div>
      <p v-if="!items.length" class="pusto dr">{{ stations.loaded ? 'Nie znaleźliśmy takiej stacji.' : 'Wczytujemy stacje…' }}</p>
    </div>
  </div>
</template>

<style scoped>
.st-pole { position: relative; min-width: 0; }
.st-pole .lista { left: 0; right: 0; top: calc(100% + 6px); }
</style>
