<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { api } from '@/api/client'
import type { AdminLogEntry } from '@/api/types'
import NoticeRow from '@/components/admin/NoticeRow.vue'
import { useAdmin } from '@/stores/admin'
import { useLive, useStations } from '@/stores/data'
import { healthSummary, sourceRows, upkeepRows, type Health } from '@/utils/adminHealth'
import { logInfo, logSummary } from '@/utils/adminLog'
import { noticeState, stampMs, todos } from '@/utils/adminNotices'
import { ago, plural, splitNumbers } from '@/utils/format'
import { bySeverity, noticeLabel } from '@/utils/notices'
import { useNoticeActions } from './noticeActions'

const admin = useAdmin()
const live = useLive()
const stations = useStations()
const actions = useNoticeActions()
const health = ref<Health | null>(null)
const healthError = ref<string | null>(null)
const log = ref<AdminLogEntry[] | null>(null)

const now = ref(Date.now())
const timer = window.setInterval(() => { now.value = Date.now() }, 60_000)
onUnmounted(() => window.clearInterval(timer))

onMounted(() => {
  void stations.load()
  void live.refresh()
  admin.call(() => api.admin.health()).then((h) => { health.value = h as Health }).catch((e) => { healthError.value = (e as Error).message })
  admin.call(() => api.admin.log()).then((l) => { log.value = l.slice(0, 5) }).catch(() => { log.value = [] })
})

const today = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const list = computed(() => admin.notices ?? [])
const liveList = computed(() => list.value.filter((n) => noticeState(n, now.value) === 'live').sort(bySeverity))
const planned = computed(() => list.value.filter((n) => noticeState(n, now.value) === 'plan').sort((a, b) => (stampMs(a.startsAt) ?? 0) - (stampMs(b.startsAt) ?? 0)))
const severityText = computed(() => {
  const c = { danger: 0, warning: 0, info: 0 }
  for (const n of liveList.value) c[n.severity]++
  return (['danger', 'warning', 'info'] as const).filter((s) => c[s]).map((s) => `${c[s]} ${noticeLabel[s].toLowerCase()}`).join(', ') || 'brak'
})
const nextPlanned = computed(() => {
  const n = planned.value[0]
  return n?.startsAt ? `najbliższy ${new Date(n.startsAt).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'numeric' })}` : 'nic nie czeka'
})

/** największe obecne opóźnienie pociągów z komunikatu (dane na żywo) */
function delayOf(trains: string[]): number | null {
  let max: number | null = null
  for (const t of live.trains) {
    if (t.delay == null || !splitNumbers(t.number).some((n) => trains.includes(n))) continue
    max = Math.max(max ?? 0, t.delay)
  }
  return max
}
const tasks = computed(() => todos(list.value, now.value).map((t) => {
  const delay = t.kind === 'expiring' ? delayOf(t.notice.trains) : null
  return { ...t, delay: delay !== null && delay >= 5 ? delay : null }
}))

const summary = computed(() => healthSummary(health.value?.level))
const sources = computed(() => (health.value ? [...sourceRows(health.value), ...upkeepRows(health.value.ops).slice(0, 1)] : []))
const dot: Record<string, string> = { ok: 'ok', warn: 'warn', error: 'error' }
const tt = computed(() => health.value?.timetable)
const ttDate = computed(() => tt.value?.validUntil?.slice(5, 10).split('-').reverse().join('.') ?? '–')
</script>

<template>
  <div class="dash">
    <header class="head">
      <div class="grow">
        <div class="muted font-weight-medium">{{ today }}</div>
        <h1 class="text-headline-medium font-weight-bold">Pulpit</h1>
      </div>
      <v-btn variant="flat" color="secondary-container" prepend-icon="content_paste" :to="{ name: 'admin-paste' }">Wklej od przewoźnika</v-btn>
      <v-btn prepend-icon="add" :to="{ name: 'admin-new' }">Nowy komunikat</v-btn>
    </header>

    <div class="tiles">
      <router-link :to="{ name: 'admin-health' }" class="tile link">
        <span class="tl muted"><span class="dot" :class="health ? (health.level === 'ok' ? 'ok' : health.level === 'down' ? 'error' : 'warn') : ''" />Źródła danych</span>
        <span class="text-title-large font-weight-bold">{{ health ? summary.title : healthError ? 'Brak odpowiedzi' : '…' }}</span>
        <span v-if="health" class="text-body-small muted">Opóźnienia {{ ago(health.live.rt?.feedTime) }} · {{ health.live.rtTrains ?? 0 }} {{ plural(health.live.rtTrains ?? 0, 'pociąg', 'pociągi', 'pociągów') }} z danymi na żywo</span>
      </router-link>
      <router-link :to="{ name: 'admin-notices' }" class="tile link">
        <span class="tl muted">Widzą pasażerowie</span>
        <span class="big">{{ admin.notices ? liveList.length : '–' }}</span>
        <span class="text-body-small muted">{{ severityText }}</span>
      </router-link>
      <div class="tile">
        <span class="tl muted">Zaplanowane</span>
        <span class="big">{{ admin.notices ? planned.length : '–' }}</span>
        <span class="text-body-small muted">{{ nextPlanned }}</span>
      </div>
      <div class="tile">
        <span class="tl muted">Rozkład ważny do</span>
        <span class="big">{{ ttDate }}</span>
        <span v-if="tt" class="text-body-small muted">{{ tt.daysLeft }} {{ plural(tt.daysLeft ?? 0, 'dzień', 'dni', 'dni') }} · import {{ ago(tt.importedAt) }}, {{ tt.trips }} kursów</span>
      </div>
    </div>

    <div class="cols">
      <div class="col-main">
        <section class="card pad" aria-labelledby="h-todo">
          <div class="sect"><h2 id="h-todo" class="text-title-large font-weight-bold grow">Do zrobienia</h2><span v-if="tasks.length" class="text-body-small muted">{{ tasks.length }} {{ plural(tasks.length, 'sprawa', 'sprawy', 'spraw') }}</span></div>
          <div v-if="tasks.length" class="todos">
            <div v-for="t in tasks" :key="`${t.kind}-${t.notice.id}`" class="todo">
              <v-icon :icon="t.kind === 'expiring' ? 'schedule' : 'draft'" />
              <div class="grow">
                <div class="text-title-small">„{{ t.notice.title }}” — {{ t.text }}</div>
                <div v-if="t.delay" class="text-body-small">Pociąg wciąż jedzie z opóźnieniem +{{ t.delay }} min według danych PLK.</div>
                <div v-else-if="t.kind === 'draft'" class="text-body-small">Opublikuj go albo usuń, żeby nie wisiał na liście.</div>
              </div>
              <v-btn v-if="t.kind === 'expiring'" variant="outlined" size="small" class="todo-btn" :loading="actions.busy.value === t.notice.id" @click="actions.extend(t.notice, 2)">Przedłuż o 2 h</v-btn>
              <v-btn v-else variant="outlined" size="small" class="todo-btn" :to="{ name: 'admin-edit', params: { id: t.notice.id } }">Dokończ</v-btn>
            </div>
          </div>
          <p v-else class="muted mb-0 mt-1">Nic pilnego. Tu pojawią się komunikaty, które zaraz wygasną, i porzucone szkice.</p>
        </section>

        <section class="card pad" aria-labelledby="h-now">
          <div class="sect"><h2 id="h-now" class="text-title-large font-weight-bold grow">Teraz widzą pasażerowie</h2><router-link :to="{ name: 'admin-notices' }" class="more">Wszystkie komunikaty</router-link></div>
          <v-skeleton-loader v-if="!admin.notices" type="list-item-two-line@2" color="transparent" />
          <template v-else-if="liveList.length"><NoticeRow v-for="n in liveList" :key="n.id" :notice="n" :now="now" compact /></template>
          <p v-else class="muted mb-0 mt-1">Żaden komunikat nie jest teraz widoczny.</p>
        </section>

        <section v-if="planned.length" class="card pad" aria-labelledby="h-plan">
          <div class="sect"><h2 id="h-plan" class="text-title-large font-weight-bold grow">Zaplanowane</h2></div>
          <NoticeRow v-for="n in planned" :key="n.id" :notice="n" :now="now" compact />
        </section>
      </div>

      <div class="col-side">
        <section class="card pad" aria-labelledby="h-src">
          <div class="sect"><h2 id="h-src" class="text-title-large font-weight-bold grow">Stan źródeł</h2><router-link :to="{ name: 'admin-health' }" class="more">Szczegóły</router-link></div>
          <v-alert v-if="healthError" color="error-container" icon="error" density="compact">{{ healthError }}</v-alert>
          <v-skeleton-loader v-else-if="!health" type="list-item-two-line@3" color="transparent" />
          <div v-for="r in sources" :key="r.title" class="src">
            <span class="dot" :class="dot[r.state]" />
            <div class="grow"><div class="text-title-small">{{ r.title }}</div><div class="text-body-small muted">{{ r.text }}</div></div>
          </div>
        </section>

        <section class="card pad" aria-labelledby="h-log">
          <div class="sect"><h2 id="h-log" class="text-title-large font-weight-bold grow">Ostatnio w panelu</h2><router-link :to="{ name: 'admin-log' }" class="more">Dziennik</router-link></div>
          <v-skeleton-loader v-if="!log" type="list-item-two-line@3" color="transparent" />
          <p v-else-if="!log.length" class="muted mb-0">Dziennik jest pusty.</p>
          <div v-for="e in log ?? []" :key="e.id" class="logrow">
            <span class="lead" :class="logInfo(e.action).tone"><v-icon :icon="logInfo(e.action).icon" size="20" /></span>
            <div class="grow">
              <div class="text-title-small">{{ logInfo(e.action).label }}</div>
              <div v-if="logSummary(e)" class="text-body-small text-wrap">{{ logSummary(e) }}</div>
              <div class="text-body-small muted">{{ ago(e.at) }}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dash { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; }
.head { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px 16px; }
.grow { flex: 1 1 auto; min-width: 0; }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px 16px; }
@media (max-width: 599px) { .tiles .tile:first-child { grid-column: 1 / -1; } }
.tile { display: grid; gap: 4px; align-content: start; padding: 16px 18px; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-surface)); box-shadow: 0 1px 2px rgb(0 0 0 / .06); color: inherit; text-decoration: none; }
.tile.link:hover { box-shadow: 0 1px 2px rgb(0 0 0 / .06), inset 0 0 0 1px rgb(var(--v-theme-outline-variant)); }
.tl { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.big { font-size: 32px; line-height: 38px; font-weight: 800; letter-spacing: -.5px; }
.dot { width: 10px; height: 10px; border-radius: 999px; flex: none; background: rgb(var(--v-theme-outline)); }
.dot.ok { background: rgb(var(--v-theme-success)); }
.dot.warn { background: rgb(var(--v-theme-warning)); }
.dot.error { background: rgb(var(--v-theme-error)); }
.cols { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
.col-main { flex: 999 1 520px; min-width: 0; display: grid; gap: 24px; }
.col-side { flex: 1 1 320px; min-width: 0; display: grid; gap: 24px; }
.pad { padding: 20px 24px; }
.sect { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.more { font-weight: 700; text-decoration: none; color: rgb(var(--v-theme-primary)); }
.todos { display: grid; gap: 10px; }
.todo { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 14px; padding: 14px 16px; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-tertiary-container)); color: rgb(var(--v-theme-on-tertiary-container)); }
.todo-btn { color: inherit !important; }
.src { display: flex; gap: 12px; align-items: flex-start; padding: 8px 0; }
.src .dot { margin-top: 6px; }
.logrow { display: flex; gap: 12px; align-items: flex-start; padding: 10px 0; }
.logrow + .logrow { border-top: 1px solid rgb(var(--v-theme-outline-variant)); }
.lead { display: grid; place-items: center; width: 36px; height: 36px; flex: none; border-radius: var(--kw-r-s); background: rgb(var(--v-theme-surface-container-highest)); color: rgb(var(--v-theme-on-surface-variant)); }
.lead.warn { background: rgb(var(--v-theme-warning-container)); color: rgb(var(--v-theme-on-warning-container)); }
.lead.error { background: rgb(var(--v-theme-error-container)); color: rgb(var(--v-theme-on-error-container)); }
</style>
