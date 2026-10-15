<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { api } from '@/api/client'
import type { Station, TrainMatch } from '@/api/types'
import { useStations } from '@/stores/data'
import { useFavorites } from '@/stores/favorites'
import { agencyCode } from '@/utils/agency'
import { clock, warsawNow, weekdayShort } from '@/utils/format'

const model = defineModel<string | null>({ default: null })
// trains: numer pociągu (np. „77600”, „KW 77600”, „PR 85724”) podpowiada pociągi — wybór emituje „train”, pole zostaje bez zmian
const props = defineProps<{ label: string; icon?: string; hideDetails?: boolean; density?: 'default' | 'comfortable' | 'compact'; trains?: boolean }>()
const emit = defineEmits<{ train: [train: TrainMatch] }>()
const stations = useStations()
const favorites = useFavorites()
const query = ref('')

onMounted(() => { void stations.load() })

/** Numer pociągu w polu: co najmniej 3 cyfry, opcjonalnie „KW” albo „PR” przed. */
const TRAIN_QUERY = /^\s*((kw|pr)\s*)?\d{3,6}(\s*\/\s*\d{1,3})?\s*$/i
const trainResults = ref<TrainMatch[]>([])
const trainError = ref<string | null>(null)
let seq = 0
let timer: number | undefined
watch(query, (q) => {
  window.clearTimeout(timer)
  if (!props.trains || !TRAIN_QUERY.test(q ?? '')) { trainResults.value = []; trainError.value = null; return }
  const mine = ++seq
  timer = window.setTimeout(async () => {
    try {
      const found = (await api.searchTrains(q)).trains
      if (mine === seq) { trainResults.value = found; trainError.value = null }
    } catch (e) {
      if (mine === seq) { trainResults.value = []; trainError.value = (e as Error).message }
    }
  }, 250)
})

type Item = Station | (TrainMatch & { id: string; name: string; train: true })
const trainItems = computed<Item[]>(() => trainResults.value.map((t) => ({ ...t, id: `train:${t.key}`, name: `${agencyCode(t.agency)} ${t.number}`, train: true })))

const items = computed<Item[]>(() => {
  const selected = model.value ? stations.byId.get(model.value) : undefined
  const q = selected && query.value === selected.name ? '' : query.value
  // bez wpisanego tekstu ulubione stacje na górze
  const fav = q ? [] : favorites.ids.flatMap((id) => stations.byId.get(id) ?? [])
  const found: Item[] = [...fav, ...stations.search(q ?? '', 8).filter((s) => !fav.includes(s))]
  // numer: najpierw pociągi (cicha funkcja KURS'90 może dodać stację o tym kodzie)
  const list = trainItems.value.length ? [...trainItems.value, ...found] : found
  // wybrana stacja musi być na liście (pole pokazuje jej nazwę), ale przy wpisanym tekście na końcu — Enter wybiera pierwszą podpowiedź
  if (!selected || list.includes(selected)) return list
  return q ? [...list, selected] : [selected, ...list]
})

/** Wybór pociągu nie zmienia stacji w polu. */
const value = computed({
  get: () => model.value,
  set: (id: string | null) => {
    const train = id?.startsWith('train:') ? trainResults.value.find((t) => `train:${t.key}` === id) : undefined
    if (train) {
      emit('train', train)
      query.value = ''
      return
    }
    model.value = id
  },
})

const isTrain = (item: Item): item is TrainMatch & { id: string; name: string; train: true } => 'train' in item
/** „w drodze”, godzina odjazdu z pierwszej stacji, a dla innego dnia — z dniem tygodnia. */
function trainWhen(t: TrainMatch) {
  if (t.running) return 'w drodze'
  const day = t.departure.slice(0, 10) !== warsawNow().date ? `${weekdayShort(t.departure)} ` : ''
  return `${day}${clock(t.departure)}`
}
/** Podwójne kliknięcie albo tapnięcie zaznacza całą nazwę stacji (przeglądarka zaznaczyłaby jedno słowo). */
const root = ref<{ $el: HTMLElement } | null>(null)
let lastTap = 0
function selectAll() {
  const input = root.value?.$el.querySelector<HTMLInputElement>('input:not([type=hidden])')
  // po własnej obsłudze kliknięcia przez pole (menu, tekst wyszukiwania)
  if (input) window.setTimeout(() => input.select(), 0)
}
function onPointerUp(e: PointerEvent) {
  if (e.pointerType !== 'touch' || !(e.target instanceof HTMLInputElement)) return
  const now = e.timeStamp
  if (now - lastTap < 350) selectAll()
  lastTap = now
}
// zdarzenia natywne na elemencie pola — v-autocomplete nie przekazuje dblclick ani pointerup
onMounted(() => {
  root.value?.$el.addEventListener('dblclick', selectAll)
  root.value?.$el.addEventListener('pointerup', onPointerUp)
})
onBeforeUnmount(() => {
  root.value?.$el.removeEventListener('dblclick', selectAll)
  root.value?.$el.removeEventListener('pointerup', onPointerUp)
})
function cleared() {
  query.value = ''
}

const noData = computed(() => {
  if (props.trains && TRAIN_QUERY.test(query.value ?? '')) return trainError.value ?? 'Brak pociągu o takim numerze dziś ani jutro.'
  return 'Brak takiej stacji w rozkładzie. Sprawdź pisownię.'
})
</script>

<template>
  <v-autocomplete
    ref="root"
    v-model="value"
    v-model:search="query"
    clearable
    persistent-clear
    clear-icon="close"
    @click:clear="cleared"
    :items="items"
    item-title="name"
    item-value="id"
    :label="label"
    :prepend-inner-icon="icon"
    :hide-details="hideDetails ?? 'auto'"
    :density="density"
    :no-filter="true"
    auto-select-first
    :loading="!stations.loaded"
    :no-data-text="noData"
    :menu-props="{ maxHeight: 360 }"
  >
    <template #item="{ props: itemProps, item }">
      <v-list-item
        v-if="isTrain(item)"
        v-bind="itemProps"
        prepend-icon="train"
        :subtitle="`${item.origin} → ${item.destination} · ${trainWhen(item)}`"
      />
      <v-list-item v-else v-bind="itemProps" :prepend-icon="favorites.has(item.id) ? 'star-fill' : 'signpost'" />
    </template>
  </v-autocomplete>
</template>
