<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import { useAdmin } from '@/stores/admin'
import { useUi } from '@/stores/ui'
import { healthSummary, size, sourceRows, stateClass, stateLabel, upkeepRows, type Health } from '@/utils/adminHealth'
import { ago, clock, dateTime } from '@/utils/format'

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

const summary = computed(() => healthSummary(health.value?.level))
const sources = computed(() => (health.value ? sourceRows(health.value) : []))
const upkeep = computed(() => upkeepRows(health.value?.ops))
</script>

<template>
  <v-alert v-if="error" color="error-container" icon="error">{{ error }}</v-alert>
  <v-skeleton-loader v-else-if="!health" type="card, card" color="transparent" />
  <div v-else class="health">
    <h1 class="text-headline-medium font-weight-bold">Stan źródeł</h1>
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
