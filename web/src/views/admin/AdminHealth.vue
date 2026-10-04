<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { Status } from '@/api/types'
import { useAdmin } from '@/stores/admin'
import { useUi } from '@/stores/ui'
import { ago, clock, dateTime, plural } from '@/utils/format'

type Ops = {
  gtfsSourceModifiedAt: string | null
  gtfsDownloadedAt: string | null
  rtCheckedAt: string | null
  rtSourceModifiedAt: string | null
  backups: { count: number; latestAt: string | null; latestSize: number | null }
  alerts: { configured: boolean; problemSince: string | null; alertedAt: string | null }
  cronErrors: { modifiedAt: string | null; lines: string[] }
}
type Health = Status & {
  server: { php?: string; extensions?: Record<string, boolean>; storageWritable?: boolean; passwordConfigured?: boolean; files?: Record<string, { size: number; modifiedAt: string } | null> }
  ops?: Ops
}
type State = 'ok' | 'warn' | 'error'
type Row = { icon: string; title: string; text: string; sub?: string; state: State }

const admin = useAdmin()
const ui = useUi()
const health = ref<Health | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)
const importing = ref(false)
const importLog = ref<string[]>([])

async function load() {
  loading.value = true
  try {
    health.value = (await admin.call(() => api.admin.health())) as Health
    error.value = null
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function runImport() {
  importing.value = true
  importLog.value = []
  try {
    const res = await admin.call(() => api.admin.importTimetable())
    importLog.value = res.log
    ui.notify('Rozkład zaimportowany.')
    await load()
  } catch (e) {
    importLog.value = [(e as Error).message]
  } finally {
    importing.value = false
  }
}

const size = (n: number | null | undefined) => (n == null ? '–' : n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} kB`)
const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split('-').reverse().join('.') : '–')
const hoursSince = (iso: string | null | undefined) => (iso ? (Date.now() - new Date(iso).getTime()) / 3_600_000 : Infinity)
const stateLabel: Record<State, string> = { ok: 'Działa', warn: 'Uwaga', error: 'Błąd' }
const stateClass: Record<State, string> = { ok: 'tag-ontime', warn: 'tag-delay', error: 'tag-error' }

const summary = computed(() => {
  const level = health.value?.level ?? 'ok'
  return {
    color: level === 'ok' ? 'success-container' : level === 'down' ? 'error-container' : 'warning-container',
    icon: level === 'ok' ? 'check_circle-fill' : level === 'down' ? 'error-fill' : 'warning-fill',
    title: level === 'ok' ? 'Wszystkie źródła działają' : level === 'down' ? 'Portal działa w trybie awaryjnym' : 'Część źródeł wymaga uwagi',
  }
})

const sources = computed<Row[]>(() => {
  const h = health.value
  if (!h) return []
  const tt = h.timetable
  const live = h.live
  const rt = live.rt
  const ops = h.ops
  return [
    {
      icon: 'event',
      title: 'Rozkład jazdy (GTFS)',
      text: tt.ok ? `Ważny do ${day(tt.validUntil)}, jeszcze ${tt.daysLeft} ${plural(tt.daysLeft ?? 0, 'dzień', 'dni', 'dni')} · ${tt.trips} kursów, ${tt.stations} stacji` : 'Rozkład wygasł albo jest niedostępny',
      sub: `Import ${ago(tt.importedAt)} (${dateTime(tt.importedAt)})${ops?.gtfsSourceModifiedAt ? ` · plik u źródła z ${day(ops.gtfsSourceModifiedAt)}` : ''}`,
      state: !tt.ok ? 'error' : (tt.daysLeft ?? 0) <= 3 || hoursSince(tt.importedAt) > 72 ? 'warn' : 'ok',
    },
    {
      icon: 'schedule',
      title: 'Opóźnienia PKP PLK (GTFS-RT)',
      text: rt?.ok ? `${rt.count} ${plural(rt.count, 'kurs', 'kursy', 'kursów')} z opóźnieniami · feed z ${clock(rt.feedTime)} (${ago(rt.feedTime)})` : `Błąd: ${rt?.error ?? 'brak danych'}`,
      sub: ops?.rtCheckedAt ? `Feed sprawdzony ${ago(ops.rtCheckedAt)} · stojący feed to zwykle problem po stronie źródła` : undefined,
      state: !rt?.ok ? 'error' : hoursSince(rt.feedTime) > 0.25 ? 'warn' : 'ok',
    },
    {
      icon: 'update',
      title: 'Odświeżanie danych na żywo (CRON)',
      text: live.generatedAt ? `Ostatnio ${ago(live.generatedAt)} (${clock(live.generatedAt)}) · co minutę` : 'Jeszcze nie uruchomione',
      sub: live.ok ? undefined : 'Sprawdź CRON z refresh-live.php i błędy CRON-a poniżej',
      state: live.ok ? 'ok' : 'error',
    },
    {
      icon: 'route',
      title: 'Pozycje pociągów',
      text: `${live.trains} ${plural(live.trains, 'pociąg', 'pociągi', 'pociągów')} w ruchu, ${live.rtTrains ?? 0} z opóźnieniem PLK`,
      sub: live.gpsEnabled === false ? 'GPS wyłączony (gps_enabled w konfiguracji), pozycje wyliczane z rozkładu' : live.gps?.ok ? `GPS: ${live.gps.provider}, ${live.gps.count} pozycji` : `GPS: ${live.gps?.error ?? 'brak danych'}`,
      state: live.ok && (live.gpsEnabled === false || !!live.gps?.ok) ? 'ok' : 'warn',
    },
  ]
})

const upkeep = computed<Row[]>(() => {
  const ops = health.value?.ops
  if (!ops) return []
  const b = ops.backups
  const a = ops.alerts
  const c = ops.cronErrors
  return [
    {
      icon: 'backup',
      title: 'Kopie bazy komunikatów',
      text: b.count ? `${b.count} ${plural(b.count, 'kopia', 'kopie', 'kopii')} · ostatnia ${ago(b.latestAt)} (${size(b.latestSize)})` : 'Brak kopii',
      sub: b.count ? undefined : 'Kopię robi CRON z backup-db.php o 03:15',
      state: !b.count ? 'warn' : hoursSince(b.latestAt) > 48 ? 'warn' : 'ok',
    },
    {
      icon: 'mail',
      title: 'Alerty e-mail',
      text: !a.configured ? 'Wyłączone: brak adresu (KW_ALERT_EMAIL w deploy.env)' : a.problemSince ? `Problem od ${dateTime(a.problemSince)}` : 'Włączone, brak aktywnego problemu',
      sub: a.alertedAt ? `Ostatni alert wysłany ${ago(a.alertedAt)}` : undefined,
      state: !a.configured ? 'warn' : a.problemSince ? 'warn' : 'ok',
    },
    {
      icon: 'terminal',
      title: 'Błędy CRON-a',
      text: c.lines.length ? `Ostatni wpis ${ago(c.modifiedAt)} (${dateTime(c.modifiedAt)})` : 'Brak błędów',
      state: !c.lines.length ? 'ok' : hoursSince(c.modifiedAt) < 24 ? 'error' : 'warn',
    },
  ]
})
</script>

<template>
  <v-alert v-if="error" color="error-container" icon="error">{{ error }}</v-alert>
  <v-skeleton-loader v-else-if="!health" type="card, card" color="transparent" />
  <div v-else class="health">
    <v-alert :color="summary.color" :icon="summary.icon" :title="summary.title">
      <p v-for="m in health.messages" :key="m.text" class="text-body-medium">{{ m.text }}</p>
      <p class="text-body-small mt-1 op">Sprawdzono {{ clock(health.generatedAt) }}</p>
      <template #append>
        <v-btn variant="text" prepend-icon="refresh" :loading="loading" @click="load">Odśwież</v-btn>
      </template>
    </v-alert>

    <section class="block" aria-labelledby="h-sources">
      <h2 id="h-sources" class="text-title-large">Źródła danych</h2>
      <v-card color="surface-container-low">
        <v-list bg-color="transparent" lines="three">
          <v-list-item v-for="r in sources" :key="r.title">
            <template #prepend><span class="lead"><v-icon :icon="r.icon" /></span></template>
            <v-list-item-title class="text-title-small">{{ r.title }}</v-list-item-title>
            <div class="text-body-medium">{{ r.text }}</div>
            <div v-if="r.sub" class="text-body-small muted">{{ r.sub }}</div>
            <template #append><span class="tag" :class="stateClass[r.state]">{{ stateLabel[r.state] }}</span></template>
          </v-list-item>
        </v-list>
        <v-card-actions class="px-4 pb-4 flex-wrap ga-3">
          <v-btn variant="flat" color="secondary-container" prepend-icon="sync" :loading="importing" @click="runImport">Importuj rozkład teraz</v-btn>
          <span class="text-body-small muted">Zwykle niepotrzebne: CRON importuje rozkład codziennie o 03:30.</span>
        </v-card-actions>
        <v-card-text v-if="importLog.length" class="pt-0"><pre class="log">{{ importLog.join('\n') }}</pre></v-card-text>
      </v-card>
    </section>

    <section v-if="upkeep.length" class="block" aria-labelledby="h-upkeep">
      <h2 id="h-upkeep" class="text-title-large">Utrzymanie</h2>
      <v-card color="surface-container-low">
        <v-list bg-color="transparent" lines="two">
          <v-list-item v-for="r in upkeep" :key="r.title">
            <template #prepend><span class="lead"><v-icon :icon="r.icon" /></span></template>
            <v-list-item-title class="text-title-small">{{ r.title }}</v-list-item-title>
            <div class="text-body-medium">{{ r.text }}</div>
            <div v-if="r.sub" class="text-body-small muted">{{ r.sub }}</div>
            <template #append><span class="tag" :class="stateClass[r.state]">{{ stateLabel[r.state] }}</span></template>
          </v-list-item>
        </v-list>
        <v-card-text v-if="health.ops?.cronErrors.lines.length" class="pt-0">
          <div class="text-label-medium muted mb-1">Ostatnie wpisy w cron-errors.log</div>
          <pre class="log">{{ health.ops.cronErrors.lines.join('\n') }}</pre>
        </v-card-text>
      </v-card>
    </section>

    <section class="block" aria-labelledby="h-server">
      <h2 id="h-server" class="text-title-large">Serwer</h2>
      <v-card color="surface-container-low">
        <v-card-text class="server">
          <dl class="facts text-body-medium">
            <dt>PHP</dt><dd>{{ health.server.php }}</dd>
            <dt>Zapis do storage</dt><dd><span class="tag" :class="health.server.storageWritable ? 'tag-ontime' : 'tag-error'">{{ health.server.storageWritable ? 'Tak' : 'Nie' }}</span></dd>
            <dt>Hasło admina</dt><dd><span class="tag" :class="health.server.passwordConfigured ? 'tag-ontime' : 'tag-error'">{{ health.server.passwordConfigured ? 'Ustawione' : 'Brak' }}</span></dd>
            <dt>Rozszerzenia</dt>
            <dd class="d-flex flex-wrap ga-1">
              <span v-for="(ok, ext) in health.server.extensions" :key="ext" class="tag" :class="ok ? 'tag-ontime' : 'tag-neutral'" :title="ok ? 'Dostępne' : 'Brak'">{{ ext }}{{ ok ? '' : ' (brak)' }}</span>
            </dd>
          </dl>
          <table class="files text-body-medium">
            <thead><tr><th>Plik</th><th>Rozmiar</th><th>Zmieniony</th></tr></thead>
            <tbody>
              <tr v-for="(f, name) in health.server.files" :key="name">
                <td>{{ name }}</td>
                <td class="tnum">{{ f ? size(f.size) : 'brak' }}</td>
                <td :title="f ? dateTime(f.modifiedAt) : undefined">{{ f ? ago(f.modifiedAt) : '–' }}</td>
              </tr>
            </tbody>
          </table>
        </v-card-text>
      </v-card>
    </section>
  </div>
</template>

<style scoped>
.health { display: grid; gap: 24px; }
.block { display: grid; gap: 12px; }
.op { opacity: 0.8; }
.lead { display: grid; place-items: center; width: 40px; height: 40px; margin-right: 16px; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-surface-container-highest)); color: rgb(var(--v-theme-on-surface-variant)); }
.health :deep(.v-list-item__append) { align-self: flex-start; padding-top: 4px; }
.log { white-space: pre-wrap; word-break: break-word; font-size: 12px; line-height: 18px; padding: 12px; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-surface-container-highest)); }
.server { display: grid; gap: 24px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); align-items: start; }
.facts { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px 16px; margin: 0; align-items: center; }
.facts dt { color: rgb(var(--v-theme-on-surface-variant)); }
.facts dd { margin: 0; }
.files { width: 100%; border-collapse: collapse; }
.files th { text-align: left; font-weight: 500; color: rgb(var(--v-theme-on-surface-variant)); padding: 0 8px 8px 0; }
.files td { padding: 6px 8px 6px 0; border-top: 1px solid rgb(var(--v-theme-outline-variant)); }
</style>
