<script setup lang="ts">
import { computed } from 'vue'
import type { Connection } from '@/api/types'
import { useNotices } from '@/stores/data'
import { ends, useRoutes } from '@/stores/routes'
import { depDelay, expDep, hm, inDial, inWords, lineOf, minutesFrom, short } from '../util'
import Dial from './Dial.vue'

// Najbliższy wyjazd na pierwszej z Moich tras (makieta: rWyjazd) — jedyna ciemna płyta na ekranie Szukaj.
// Dane z tego samego miejsca co karty tras w 1.0 (stores/routes: zapytanie 20 min wstecz, odświeżane co minutę).
const props = defineProps<{ now: number }>()
const emit = defineEmits<{ open: [c: Connection] }>()
const routes = useRoutes()
const notices = useNotices()

const r = computed(() => routes.list[0] ?? null)
const dir = computed(() => (r.value ? ends(r.value) : null))
const result = computed(() => (r.value ? routes.results[`${r.value.id}|${r.value.dir}`] : undefined))
// jak w makiecie: najpierw pociąg regionalny (PKP Intercity wymaga osobnego biletu), inaczej pierwszy jakikolwiek
const c = computed(() => {
  const list = (result.value?.connections ?? []).filter((x) => minutesFrom(expDep(x), props.now) > -1)
  return list.find((x) => !x.legs.some((l) => l.agency === 'IC')) ?? list[0] ?? null
})
const toGo = computed(() => (c.value ? minutesFrom(expDep(c.value), props.now) : 0))
const delay = computed(() => (c.value ? depDelay(c.value) : 0))
const alerts = computed(() => (c.value ? notices.forConnection(c.value).filter((n) => n.severity !== 'info') : []))
const facts = computed(() => {
  if (!c.value) return ''
  const l = c.value.legs[0]
  return [lineOf(l).badge, l.platform ? `peron ${l.platform}` : '', c.value.legs.some((x) => x.agency === 'IC') ? 'osobny bilet' : '', delay.value ? `opóźnienie ${delay.value} min` : 'na czas'].filter(Boolean).join(' · ')
})
</script>

<template>
  <template v-if="r && dir">
    <div v-if="!c" class="blok">
      <p class="dr maly" style="font-weight: 600">Twoja trasa: {{ short(dir.from.name) }} → {{ short(dir.to.name) }}</p>
      <p style="margin-top: 6px; font-weight: 600">{{ !result ? 'Sprawdzamy najbliższe połączenie…' : result.error && !result.connections.length ? 'Nie udało się pobrać połączeń.' : 'Nie ma najbliższych połączeń na tej trasie.' }}</p>
    </div>
    <div v-else class="blok kol wyj" style="gap: 6px" role="button" tabindex="0" aria-label="Szczegóły najbliższego połączenia" @click="emit('open', c)" @keydown.enter="emit('open', c)">
      <p class="dr maly wiersz rozsun" style="font-weight: 600">
        <span>Twoja trasa: {{ short(dir.from.name) }} → {{ short(dir.to.name) }}</span>
        <span class="wyj-strz" aria-hidden="true"><v-icon icon="arrow_forward" size="16" /></span>
      </p>
      <div class="wiersz" style="gap: 16px">
        <Dial v-if="inDial(toGo)" :minutes="toGo" />
        <div style="min-width: 0">
          <p class="wielkie num">Odjazd o {{ hm(expDep(c)) }}</p>
          <p v-if="!inDial(toGo)">{{ inWords(toGo) }}</p>
        </div>
      </div>
      <p class="dr maly">{{ facts }}</p>
      <p v-for="n in alerts" :key="n.id" class="kpas"><span class="kzn m" :class="n.severity === 'danger' ? 'pow' : 'utr'" aria-hidden="true">!</span><b>{{ n.title }}</b></p>
    </div>
  </template>
</template>
