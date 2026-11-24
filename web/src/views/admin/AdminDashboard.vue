<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { api } from '@/api/client'
import type { AdminLogEntry } from '@/api/types'
import NoticeRow from '@/components/admin/NoticeRow.vue'
import { useAdmin } from '@/stores/admin'
import { healthSummary, sourceRows, upkeepRows, type Health } from '@/utils/adminHealth'
import { logInfo, logSummary } from '@/utils/adminLog'
import { noticeState, stampMs } from '@/utils/adminNotices'
import { ago, plural } from '@/utils/format'
import { bySeverity, noticeLabel } from '@/utils/notices'

// Pulpit w stylu 2.0: ciemna płyta z tym, co ważne teraz, pod nią komunikaty, źródła i dziennik.
const admin = useAdmin()
const health = ref<Health | null>(null)
const healthError = ref<string | null>(null)
const log = ref<AdminLogEntry[] | null>(null)

const now = ref(Date.now())
const timer = window.setInterval(() => { now.value = Date.now() }, 60_000)
onUnmounted(() => window.clearInterval(timer))

onMounted(() => {
  admin.call(() => api.admin.health()).then((h) => { health.value = h as Health }).catch((e) => { healthError.value = (e as Error).message })
  admin.call(() => api.admin.log()).then((l) => { log.value = l.slice(0, 5) }).catch(() => { log.value = [] })
})

const today = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
const list = computed(() => admin.notices ?? [])
const liveList = computed(() => list.value.filter((n) => noticeState(n, now.value) === 'live').sort(bySeverity))
const planned = computed(() => list.value.filter((n) => noticeState(n, now.value) === 'plan').sort((a, b) => (stampMs(a.startsAt) ?? 0) - (stampMs(b.startsAt) ?? 0)))
const severityText = computed(() => {
  const c = { danger: 0, warning: 0, info: 0 }
  for (const n of liveList.value) c[n.severity]++
  return (['danger', 'warning', 'info'] as const).filter((s) => c[s]).map((s) => `${c[s]} ${noticeLabel[s].toLowerCase()}`).join(', ') || 'nic nie wisi'
})
const nextPlanned = computed(() => {
  const n = planned.value[0]
  return n?.startsAt ? `najbliższy ${new Date(n.startsAt).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'numeric' })}` : 'nic nie czeka'
})

const level = computed(() => (health.value ? (health.value.level === 'ok' ? 'ok' : health.value.level === 'down' ? 'error' : 'warn') : ''))
const summary = computed(() => healthSummary(health.value?.level))
const sources = computed(() => (health.value ? [...sourceRows(health.value), ...upkeepRows(health.value.ops).slice(0, 1)] : []))
const tt = computed(() => health.value?.timetable)
const ttDate = computed(() => tt.value?.validUntil?.slice(5, 10).split('-').reverse().join('.') ?? '–')
</script>

<template>
  <div class="dash">
    <header class="head">
      <div class="grow">
        <p class="muted date">{{ today }}</p>
        <h1 class="text-headline-medium font-weight-bold">Pulpit</h1>
      </div>
      <v-btn color="primary" size="large" prepend-icon="add" :to="{ name: 'admin-new' }">Nowy komunikat</v-btn>
    </header>

    <!-- jedna ciemna płyta: to, co pasażerowie widzą teraz, i czy dane są świeże -->
    <section class="blok" aria-label="Teraz">
      <router-link :to="{ name: 'admin-health' }" class="stan">
        <span class="dot" :class="level" />
        <span>{{ health ? summary.title : healthError ? 'Źródła: brak odpowiedzi' : 'Sprawdzamy źródła…' }}</span>
        <span v-if="health" class="stan-d">opóźnienia {{ ago(health.live.rt?.feedTime) }}</span>
        <v-icon icon="arrow_forward" size="16" />
      </router-link>
      <div class="liczby">
        <router-link :to="{ name: 'admin-notices' }" class="liczba">
          <span class="l">Widzą pasażerowie</span>
          <b>{{ admin.notices ? liveList.length : '–' }}</b>
          <span class="d">{{ severityText }}</span>
        </router-link>
        <div class="liczba">
          <span class="l">Zaplanowane</span>
          <b>{{ admin.notices ? planned.length : '–' }}</b>
          <span class="d">{{ nextPlanned }}</span>
        </div>
        <router-link :to="{ name: 'admin-health' }" class="liczba">
          <span class="l">Rozkład ważny do</span>
          <b>{{ ttDate }}</b>
          <span v-if="tt" class="d">{{ tt.daysLeft }} {{ plural(tt.daysLeft ?? 0, 'dzień', 'dni', 'dni') }} · {{ tt.trips }} kursów</span>
        </router-link>
      </div>
    </section>

    <div class="cols">
      <div class="col-main">
        <section class="card pad" aria-labelledby="h-now">
          <div class="sect"><h2 id="h-now" class="grow">Teraz widzą pasażerowie</h2><router-link :to="{ name: 'admin-notices' }" class="more">Wszystkie<v-icon icon="arrow_forward" size="16" /></router-link></div>
          <v-skeleton-loader v-if="!admin.notices" type="list-item-two-line@2" color="transparent" />
          <template v-else-if="liveList.length"><NoticeRow v-for="n in liveList" :key="n.id" :notice="n" :now="now" compact /></template>
          <p v-else class="muted empty">Żaden komunikat nie jest teraz widoczny.</p>
        </section>

        <section v-if="planned.length" class="card pad" aria-labelledby="h-plan">
          <div class="sect"><h2 id="h-plan" class="grow">Zaplanowane</h2></div>
          <NoticeRow v-for="n in planned" :key="n.id" :notice="n" :now="now" compact />
        </section>
      </div>

      <div class="col-side">
        <section class="card pad" aria-labelledby="h-src">
          <div class="sect"><h2 id="h-src" class="grow">Źródła danych</h2><router-link :to="{ name: 'admin-health' }" class="more">Szczegóły<v-icon icon="arrow_forward" size="16" /></router-link></div>
          <v-alert v-if="healthError" color="error-container" icon="error" density="compact">{{ healthError }}</v-alert>
          <v-skeleton-loader v-else-if="!health" type="list-item-two-line@3" color="transparent" />
          <div v-for="r in sources" :key="r.title" class="src">
            <span class="dot" :class="r.state" />
            <div class="grow"><div class="t">{{ r.title }}</div><div class="muted s">{{ r.text }}</div></div>
          </div>
        </section>

        <section class="card pad" aria-labelledby="h-log">
          <div class="sect"><h2 id="h-log" class="grow">Ostatnio w panelu</h2><router-link :to="{ name: 'admin-log' }" class="more">Dziennik<v-icon icon="arrow_forward" size="16" /></router-link></div>
          <v-skeleton-loader v-if="!log" type="list-item-two-line@3" color="transparent" />
          <p v-else-if="!log.length" class="muted empty">Dziennik jest pusty.</p>
          <div v-for="e in log ?? []" :key="e.id" class="logrow">
            <span class="lead" :class="logInfo(e.action).tone"><v-icon :icon="logInfo(e.action).icon" size="18" /></span>
            <div class="grow">
              <div class="t">{{ logInfo(e.action).label }}</div>
              <div v-if="logSummary(e)" class="s text-wrap">{{ logSummary(e) }}</div>
              <div class="muted s">{{ ago(e.at) }}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dash { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
.head { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px 16px; }
.grow { flex: 1 1 auto; min-width: 0; }
.date { font-size: 14px; font-weight: 600; }
.date::first-letter { text-transform: uppercase; }

.blok { background: #14171C; color: #F1F3F6; border-radius: 28px; padding: 18px 20px 22px; display: grid; gap: 18px; }
.v-theme--dark .blok { background: #252930; }
.stan { display: inline-flex; align-items: center; gap: 10px; justify-self: start; max-width: 100%; height: 36px; padding: 0 14px; border-radius: 18px; background: rgb(255 255 255 / .08); color: inherit; text-decoration: none; font-size: 14px; font-weight: 600; }
.stan:hover { background: rgb(255 255 255 / .14); }
.stan-d { color: #AEB6C2; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.liczby { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.liczba { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 18px; color: inherit; text-decoration: none; min-width: 0; }
a.liczba:hover { background: rgb(255 255 255 / .06); }
.liczba .l { font-size: 13px; font-weight: 600; color: #AEB6C2; }
.liczba b { font-size: 40px; line-height: 1.1; font-weight: 700; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.liczba .d { font-size: 13px; color: #AEB6C2; }
@media (max-width: 599px) {
  .liczby { grid-template-columns: 1fr 1fr; }
  .liczba:first-child { grid-column: 1 / -1; }
  .liczba b { font-size: 34px; }
  .stan-d { display: none; }
}

.dot { width: 10px; height: 10px; border-radius: 999px; flex: none; background: var(--tusz-2); }
.dot.ok { background: #5FD0A0; }
.dot.warn { background: #F2B95C; }
.dot.error { background: #FF8084; }
.card .dot.ok { background: var(--ok); }
.card .dot.warn { background: var(--opoz); }
.card .dot.error { background: var(--akcja-tekst); }

.cols { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
.col-main { flex: 999 1 520px; min-width: 0; display: grid; gap: 20px; }
.col-side { flex: 1 1 320px; min-width: 0; display: grid; gap: 20px; }
.pad { padding: 20px 22px; }
.sect { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
.sect h2 { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
.more { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 600; text-decoration: none; color: var(--tusz); padding: 6px 10px; border-radius: 999px; }
.more:hover { background: var(--plyta-2); }
.empty { margin: 4px 0 0; font-size: 14px; }
.t { font-size: 14px; font-weight: 600; }
.s { font-size: 13px; }
.src { display: flex; gap: 12px; align-items: flex-start; padding: 8px 0; }
.src .dot { margin-top: 5px; }
.logrow { display: flex; gap: 12px; align-items: flex-start; padding: 10px 0; }
.logrow + .logrow { border-top: 1px solid var(--kreska); }
.lead { display: grid; place-items: center; width: 34px; height: 34px; flex: none; border-radius: 50%; background: var(--papier); color: var(--tusz-2); }
.lead.warn { background: var(--opoz-tlo); color: var(--opoz); }
.lead.error { background: var(--opoz); color: var(--papier); }
</style>
