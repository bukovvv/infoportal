<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { api } from '@/api/client'
import foto from '@/assets/login-pociag-maly.webp'
import { useAdmin } from '@/stores/admin'
import { healthSummary, sourceRows, type Health } from '@/utils/adminHealth'
import { noticeState, stampMs } from '@/utils/adminNotices'
import { ago, plural } from '@/utils/format'
import { bySeverity } from '@/utils/notices'
import NoticeLine from './NoticeLine.vue'

// Pulpit 2.0: jedna ciemna płyta „Teraz” (co widzą pasażerowie, czy dane są świeże), pod nią to, co czeka na decyzję.
const admin = useAdmin()
const health = ref<Health | null>(null)
const healthError = ref<string | null>(null)

const now = ref(Date.now())
const timer = window.setInterval(() => { now.value = Date.now() }, 60_000)
onUnmounted(() => window.clearInterval(timer))
onMounted(() => {
  admin.call(() => api.admin.health()).then((h) => { health.value = h as Health }).catch((e) => { healthError.value = (e as Error).message })
})

const today = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
const list = computed(() => admin.notices ?? [])
const live = computed(() => list.value.filter((n) => noticeState(n, now.value) === 'live').sort(bySeverity))
const planned = computed(() => list.value.filter((n) => noticeState(n, now.value) === 'plan').sort((a, b) => (stampMs(a.startsAt) ?? 0) - (stampMs(b.startsAt) ?? 0)))
// do przejrzenia: szkice z PKP PLK i widoczne, które wygasną w ciągu 6 godzin
const plkDrafts = computed(() => list.value.filter((n) => n.source === 'plk' && noticeState(n, now.value) === 'draft'))
const expiring = computed(() => live.value.filter((n) => { const e = stampMs(n.endsAt); return e !== null && e - now.value < 6 * 3_600_000 }))
const review = computed(() => [...expiring.value, ...plkDrafts.value])

const headline = computed(() => {
  if (!admin.notices) return 'Wczytujemy komunikaty…'
  const n = live.value.length
  return n ? `Pasażerowie widzą ${n} ${plural(n, 'komunikat', 'komunikaty', 'komunikatów')}` : 'Pasażerowie nie widzą teraz żadnego komunikatu'
})
const severities = computed(() => {
  const c = { danger: 0, warning: 0, info: 0 }
  for (const n of live.value) c[n.severity]++
  return [
    c.danger && `${c.danger} ${plural(c.danger, 'poważne utrudnienie', 'poważne utrudnienia', 'poważnych utrudnień')}`,
    c.warning && `${c.warning} ${plural(c.warning, 'utrudnienie', 'utrudnienia', 'utrudnień')}`,
    c.info && `${c.info} ${plural(c.info, 'informacja', 'informacje', 'informacji')}`,
  ].filter(Boolean).join(', ')
})

// stan źródeł w trzech zdaniach na ciemnej płycie
const level = computed(() => (health.value ? (health.value.level === 'ok' ? 'ok' : health.value.level === 'down' ? 'error' : 'warn') : ''))
const facts = computed(() => {
  const h = health.value
  if (!h) return []
  const rows = sourceRows(h)
  const tt = h.timetable
  return [
    { k: 'Źródła', v: healthSummary(h.level).title, state: level.value },
    { k: 'Opóźnienia PKP PLK', v: h.live.rt?.ok ? `feed ${ago(h.live.rt.feedTime)}` : 'brak danych', state: rows[1].state },
    { k: 'Rozkład', v: tt.ok ? `ważny do ${tt.validUntil?.slice(5, 10).split('-').reverse().join('.')}, jeszcze ${tt.daysLeft} ${plural(tt.daysLeft ?? 0, 'dzień', 'dni', 'dni')}` : 'wygasł', state: rows[0].state },
  ]
})
</script>

<template>
  <header class="adm-gl">
    <div>
      <p class="dr pierwsza">{{ today }}</p>
      <h1>Pulpit</h1>
    </div>
    <v-btn class="glowny-btn" prepend-icon="add" :to="{ name: 'admin-new' }">Nowy komunikat</v-btn>
  </header>

  <!-- jedyna ciemna płyta na ekranie -->
  <section class="blok teraz" aria-labelledby="h-teraz">
    <!-- kolejowy akcent: Elf KW z prawej, przechodzi w kolor płyty (na telefonie u góry) -->
    <img class="teraz-foto" :src="foto" alt="" decoding="async">
    <span class="dr">Teraz</span>
    <h2 id="h-teraz">{{ headline }}</h2>
    <p v-if="severities" class="dr">{{ severities }}</p>
    <div class="fakty-adm">
      <p v-if="healthError" class="dr">Stan źródeł: brak odpowiedzi serwera ({{ healthError }})</p>
      <p v-else-if="!health" class="dr">Sprawdzamy źródła danych…</p>
      <div v-for="f in facts" :key="f.k" class="fakt">
        <span class="kropka" :class="f.state" aria-hidden="true" />
        <span class="dr">{{ f.k }}</span>
        <b>{{ f.v }}</b>
      </div>
    </div>
    <div class="wiersz zawin">
      <v-btn class="drugi-btn" :to="{ name: 'admin-notices' }">Wszystkie komunikaty</v-btn>
      <!-- stan źródeł i dziennik są na razie tylko w panelu 1.0 (pełne wczytanie) -->
      <v-btn class="drugi-btn" href="/admin/stan" append-icon="open_in_new">Stan źródeł</v-btn>
    </div>
  </section>

  <div class="pulpit">
    <div class="kol">
      <section class="adm-sek" aria-labelledby="h-przejrz">
        <div class="wiersz"><h2 id="h-przejrz">Do przejrzenia</h2><span v-if="review.length" class="znacz draft">{{ review.length }}</span></div>
        <div class="plyta lista-plyta">
          <template v-if="review.length">
            <NoticeLine v-for="n in review" :key="n.id" :notice="n" :now="now" show-state />
          </template>
          <p v-else class="adm-pusto">{{ admin.notices ? 'Nic nie czeka: żadnych nowych szkiców z PKP PLK ani komunikatów, które zaraz wygasną.' : 'Wczytujemy…' }}</p>
        </div>
      </section>

      <section class="adm-sek" aria-labelledby="h-widac">
        <div class="wiersz"><h2 id="h-widac">Widoczne teraz</h2><RouterLink :to="{ name: 'admin-notices', query: { stan: 'live' } }" class="adm-link">Wszystkie<v-icon icon="arrow_forward" size="16" /></RouterLink></div>
        <div class="plyta lista-plyta">
          <template v-if="live.length"><NoticeLine v-for="n in live" :key="n.id" :notice="n" :now="now" /></template>
          <p v-else class="adm-pusto">Żaden komunikat nie jest teraz widoczny.</p>
        </div>
      </section>
    </div>

    <div class="kol">
      <section class="adm-sek" aria-labelledby="h-plan">
        <div class="wiersz"><h2 id="h-plan">Zaplanowane</h2></div>
        <div class="plyta lista-plyta">
          <template v-if="planned.length"><NoticeLine v-for="n in planned" :key="n.id" :notice="n" :now="now" /></template>
          <p v-else class="adm-pusto">Nic nie czeka na publikację.</p>
        </div>
      </section>

      <section class="adm-sek" aria-labelledby="h-wiecej">
        <div class="wiersz"><h2 id="h-wiecej">Więcej</h2></div>
        <div class="wiecej">
          <a href="/admin/dziennik" class="plyta wiecej-a"><v-icon icon="history" /><span><b>Dziennik</b><small class="dr">logowania i zmiany komunikatów</small></span></a>
          <a href="/nowyrj27" class="plyta wiecej-a"><v-icon icon="manage_search" /><span><b>Nowy RJ 2026/27</b><small class="dr">wyszukiwarka i porównanie rozkładów</small></span></a>
          <RouterLink :to="{ name: 'admin-security' }" class="plyta wiecej-a"><v-icon icon="shield" /><span><b>Zabezpieczenia</b><small class="dr">kod z aplikacji, wyloguj wszędzie</small></span></RouterLink>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.pierwsza::first-letter { text-transform: uppercase; }
.teraz { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 6px; padding: 22px 24px 24px; }
.teraz > :not(.teraz-foto) { position: relative; }
.teraz-foto { position: absolute; top: 0; right: 0; width: 52%; height: 100%; object-fit: cover; object-position: 60% 50%; -webkit-mask-image: linear-gradient(to right, transparent, #000 55%); mask-image: linear-gradient(to right, transparent, #000 55%); opacity: .9; pointer-events: none; }
@media (min-width: 920px) { .teraz > :not(.teraz-foto) { max-width: 60%; } }
@media (max-width: 919px) {
  .teraz { padding-top: 170px; }
  .teraz-foto { width: 100%; height: 190px; object-position: 58% 60%; -webkit-mask-image: linear-gradient(to bottom, #000 45%, transparent); mask-image: linear-gradient(to bottom, #000 45%, transparent); }
}
.teraz h2 { font-size: 26px; line-height: 1.2; letter-spacing: -.02em; }
.fakty-adm { display: grid; gap: 8px; margin: 14px 0 16px; padding-top: 14px; border-top: 1px solid var(--blok-tor); }
.fakt { display: grid; grid-template-columns: 10px 150px minmax(0, 1fr); align-items: baseline; gap: 10px; font-size: 14px; }
.fakt b { font-weight: 600; }
.kropka { width: 10px; height: 10px; border-radius: 50%; background: var(--na-bloku-2); align-self: center; }
.kropka.ok { background: #5FD0A0; }
.kropka.warn { background: #F2B95C; }
.kropka.error { background: #FF8084; }
@media (max-width: 599px) { .fakt { grid-template-columns: 10px minmax(0, 1fr); } .fakt b { grid-column: 2; } }
.pulpit { display: grid; gap: 24px; align-items: start; }
@media (min-width: 920px) { .pulpit { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 28px; } }
.wiecej { display: grid; gap: 8px; }
.wiecej-a { display: grid; grid-template-columns: 24px minmax(0, 1fr); align-items: center; gap: 14px; padding: 14px 16px; text-decoration: none; color: inherit; }
.wiecej-a:hover { background: var(--plyta-2); }
.wiecej-a span { display: flex; flex-direction: column; }
.wiecej-a small { font-size: 13px; }
</style>
