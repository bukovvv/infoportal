<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { Status } from '@/api/types'
import { useAdmin } from '@/stores/admin'
import { useUi } from '@/stores/ui'
import { dateTime } from '@/utils/format'

type Health = Status & { server: { php?: string; extensions?: Record<string, boolean>; storageWritable?: boolean; passwordConfigured?: boolean; files?: Record<string, { size: number; modifiedAt: string } | null> } }
const admin = useAdmin()
const ui = useUi()
const health = ref<Health | null>(null)
const error = ref<string | null>(null)
const importing = ref(false)
const importLog = ref<string[]>([])

async function load() {
  try {
    health.value = (await admin.call(() => api.admin.health())) as Health
    error.value = null
  } catch (e) {
    error.value = (e as Error).message
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
const kb = (n: number) => (n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.round(n / 1024)} kB`)
</script>

<template>
  <v-alert v-if="error" color="error-container" icon="error" rounded="lg">{{ error }}</v-alert>
  <v-skeleton-loader v-else-if="!health" type="card, card" color="transparent" />
  <div v-else class="health">
    <v-alert
      :color="health.level === 'ok' ? 'success-container' : health.level === 'down' ? 'error-container' : 'warning-container'"
      :icon="health.level === 'ok' ? 'check_circle' : 'warning'"
      rounded="xl"
      :title="health.level === 'ok' ? 'Wszystkie źródła działają' : health.level === 'down' ? 'Portal działa w trybie awaryjnym' : 'Część źródeł wymaga uwagi'"
    >
      <p v-for="m in health.messages" :key="m.text" class="text-body-medium">{{ m.text }}</p>
    </v-alert>

    <div class="cards">
      <v-card color="surface-container-low" rounded="xl" prepend-icon="event" title="Rozkład jazdy (GTFS)">
        <v-card-text class="text-body-medium">
          <p>Ważny: {{ health.timetable.validFrom }} – {{ health.timetable.validUntil }} ({{ health.timetable.daysLeft }} dni)</p>
          <p>Import: {{ dateTime(health.timetable.importedAt) }}</p>
          <p>{{ health.timetable.trips }} kursów · {{ health.timetable.stations }} stacji</p>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="flat" color="secondary-container" prepend-icon="sync" :loading="importing" @click="runImport">Importuj teraz</v-btn>
        </v-card-actions>
        <v-card-text v-if="importLog.length" class="pt-0"><pre class="log">{{ importLog.join('\n') }}</pre></v-card-text>
      </v-card>
      <v-card color="surface-container-low" rounded="xl" prepend-icon="satellite_alt" title="Dane na żywo">
        <v-card-text class="text-body-medium">
          <p>Wygenerowane: {{ dateTime(health.live.generatedAt) }} ({{ health.live.ageSeconds ?? '–' }} s temu)</p>
          <p>GPS: {{ health.live.gps?.ok ? `${health.live.gps.provider}, ${health.live.gps.count} pozycji` : `błąd — ${health.live.gps?.error ?? 'brak danych'}` }}</p>
          <p>GTFS-RT: {{ health.live.rt?.ok ? `${health.live.rt.count} kursów, feed ${dateTime(health.live.rt.feedTime)}` : `błąd — ${health.live.rt?.error ?? 'brak danych'}` }}</p>
          <p>Pociągi na mapie: {{ health.live.trains }} (z GPS: {{ health.live.gpsTrains }})</p>
        </v-card-text>
      </v-card>
      <v-card color="surface-container-low" rounded="xl" prepend-icon="dns" title="Serwer">
        <v-card-text class="text-body-medium">
          <p>PHP {{ health.server.php }} · zapis do storage: {{ health.server.storageWritable ? 'tak' : 'NIE' }} · hasło: {{ health.server.passwordConfigured ? 'ustawione' : 'BRAK' }}</p>
          <p>Rozszerzenia: <span v-for="(ok, ext) in health.server.extensions" :key="ext" class="tag mr-1" :class="ok ? 'tag-ontime' : 'tag-error'">{{ ext }}</span></p>
          <p v-for="(f, name) in health.server.files" :key="name">{{ name }}: {{ f ? `${kb(f.size)}, ${dateTime(f.modifiedAt)}` : 'brak' }}</p>
        </v-card-text>
      </v-card>
    </div>
    <v-btn variant="text" prepend-icon="refresh" class="justify-self-start" @click="load">Odśwież</v-btn>
  </div>
</template>

<style scoped>
.health { display: grid; gap: 16px; }
.cards { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
.log { white-space: pre-wrap; font-size: 12px; line-height: 18px; padding: 12px; border-radius: 8px; background: rgb(var(--v-theme-surface-container-highest)); }
.justify-self-start { justify-self: start; }
</style>
