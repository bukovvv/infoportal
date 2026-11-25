<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import type { Notice } from '@/api/types'
import { useAdmin } from '@/stores/admin'
import { useStations } from '@/stores/data'
import { noticeState, stampMs, STATE_FILTERS, type NoticeState } from '@/utils/adminNotices'
import { normalize, plural } from '@/utils/format'
import { lineTitle, noticeLines } from '@/utils/notices'
import NoticeDetail from './NoticeDetail.vue'
import NoticeLine from './NoticeLine.vue'

// Komunikaty 2.0: lista z filtrami stanu i wyszukiwaniem, obok (na telefonie od dołu) wybrany komunikat z akcjami.
// Wybór i filtr są w adresie (?k=12&stan=live), więc „wstecz” zamyka komunikat, a pulpit może linkować do jednego.
const admin = useAdmin()
const stations = useStations()
const route = useRoute()
const router = useRouter()
const { mdAndUp } = useDisplay()
onMounted(() => { void stations.load() })

const now = ref(Date.now())
const timer = window.setInterval(() => { now.value = Date.now() }, 60_000)
onUnmounted(() => window.clearInterval(timer))

const filter = computed<NoticeState | 'all'>(() => (STATE_FILTERS.some((f) => f.value === route.query.stan) ? route.query.stan as NoticeState : 'all'))
const setFilter = (v: NoticeState | 'all') => router.replace({ query: { ...route.query, stan: v === 'all' ? undefined : v } })
const query = ref('')

const list = computed(() => admin.notices ?? [])
const counts = computed(() => {
  const c: Record<string, number> = { all: list.value.length, live: 0, plan: 0, draft: 0, past: 0 }
  for (const n of list.value) c[noticeState(n, now.value)]++
  return c
})
/** tekst do wyszukiwania: tytuł, treść, numery pociągów, nazwy stacji i linii */
const haystack = (n: Notice) => normalize([n.title, n.body, n.line, ...n.trains, ...n.stations.map((id) => stations.byId.get(id)?.name ?? ''), ...noticeLines(n).map(lineTitle)].join(' '))
const rows = computed(() => {
  const q = normalize(query.value ?? '')
  const out = list.value.filter((n) => (filter.value === 'all' || noticeState(n, now.value) === filter.value) && (!q || haystack(n).includes(q)))
  // zaplanowane — od najbliższego początku, reszta jak z serwera (ostatnio zmienione)
  return filter.value === 'plan' ? [...out].sort((a, b) => (stampMs(a.startsAt) ?? 0) - (stampMs(b.startsAt) ?? 0)) : out
})

const selectedId = computed(() => Number(route.query.k) || null)
const selected = computed(() => list.value.find((n) => n.id === selectedId.value) ?? null)
// na komputerze bez wyboru pokazujemy pierwszy z listy (adres zostaje bez ?k)
const shown = computed(() => selected.value ?? (mdAndUp.value ? rows.value[0] ?? null : null))
const sheet = computed({
  get: () => !mdAndUp.value && !!selected.value,
  set: (open) => { if (!open) close() },
})
const close = () => router.replace({ query: { ...route.query, k: undefined } })

const summary = computed(() => {
  const c = counts.value
  return [`${c.live} ${plural(c.live, 'widoczny', 'widoczne', 'widocznych')}`, c.plan && `${c.plan} ${plural(c.plan, 'zaplanowany', 'zaplanowane', 'zaplanowanych')}`, c.draft && `${c.draft} ${plural(c.draft, 'szkic', 'szkice', 'szkiców')}`].filter(Boolean).join(' · ')
})
</script>

<template>
  <header class="adm-gl">
    <div>
      <p class="dr">{{ admin.notices ? summary : 'Wczytujemy…' }}</p>
      <h1>Komunikaty</h1>
    </div>
    <v-btn class="glowny-btn" prepend-icon="add" :to="{ name: 'admin-new' }">Nowy komunikat</v-btn>
  </header>

  <div class="kom-adm">
    <div class="kol" style="gap: 12px">
      <v-text-field v-model="query" prepend-inner-icon="search" label="Szukaj w tytułach, treści, numerach i stacjach" clearable hide-details />
      <div class="aseg" role="group" aria-label="Stan komunikatu">
        <button v-for="f in STATE_FILTERS" :key="f.value" type="button" :aria-pressed="filter === f.value" @click="setFilter(f.value)">
          {{ f.label }}<small>{{ counts[f.value] }}</small>
        </button>
      </div>
      <p v-if="admin.noticesError" class="plyta podp uwaga" role="alert">{{ admin.noticesError }}</p>
      <div v-else class="plyta lista-plyta">
        <template v-if="rows.length">
          <NoticeLine v-for="n in rows" :key="n.id" :notice="n" :now="now" :current="shown?.id === n.id" :show-state="filter === 'all'" />
        </template>
        <p v-else class="adm-pusto">{{ !admin.notices ? 'Wczytujemy…' : query ? 'Nic nie pasuje do wyszukiwania.' : 'Brak komunikatów w tym stanie.' }}</p>
      </div>
    </div>

    <aside v-if="mdAndUp" class="plyta kom-adm-panel" aria-label="Wybrany komunikat">
      <NoticeDetail v-if="shown" :key="shown.id" :notice="shown" :now="now" @deleted="close" />
      <p v-else class="adm-pusto">Wybierz komunikat z listy.</p>
    </aside>
  </div>

  <v-bottom-sheet v-model="sheet" scrollable>
    <div v-if="selected" class="arkusz-adm">
      <div class="wiersz rozsun">
        <span class="uchwyt-adm" aria-hidden="true" />
        <v-btn class="drugi-btn" icon="close" aria-label="Zamknij" @click="close" />
      </div>
      <NoticeDetail :key="selected.id" :notice="selected" :now="now" @deleted="close" />
    </div>
  </v-bottom-sheet>
</template>

<style scoped>
.kom-adm { display: grid; gap: 20px; align-items: start; }
@media (min-width: 960px) {
  .kom-adm { grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 24px; }
  .kom-adm-panel { position: sticky; top: 88px; max-height: calc(100dvh - 110px); overflow: auto; padding: 24px; }
}
</style>
