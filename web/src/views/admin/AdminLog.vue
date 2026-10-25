<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { AdminLogEntry } from '@/api/types'
import { useAdmin } from '@/stores/admin'
import { logInfo as info, logSummary as summary } from '@/utils/adminLog'
import { dateTime } from '@/utils/format'

const admin = useAdmin()
const entries = ref<AdminLogEntry[] | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)

async function load() {
  loading.value = true
  error.value = null
  try {
    entries.value = await admin.call(() => api.admin.log())
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <section class="block" aria-labelledby="h-log">
    <div class="d-flex align-center justify-space-between flex-wrap ga-2">
      <h1 id="h-log" class="text-headline-medium font-weight-bold">Dziennik panelu</h1>
      <v-btn variant="text" prepend-icon="refresh" :loading="loading" @click="load">Odśwież</v-btn>
    </div>
    <p class="text-body-medium muted">Logowania i zmiany komunikatów z ostatnich 180 dni (najnowsze na górze). Po 5 nieudanych próbach z jednego adresu logowanie jest blokowane na 15 minut.</p>
    <v-alert v-if="error" color="error-container" icon="error">{{ error }}</v-alert>
    <v-skeleton-loader v-else-if="!entries" type="list-item-two-line@4" color="transparent" />
    <v-card v-else color="surface-container-low">
      <v-card-text v-if="!entries.length" class="text-body-medium muted">Dziennik jest pusty.</v-card-text>
      <v-list v-else bg-color="transparent" lines="two">
        <v-list-item v-for="e in entries" :key="e.id">
          <template #prepend><span class="lead" :class="info(e.action).tone"><v-icon :icon="info(e.action).icon" /></span></template>
          <v-list-item-title class="text-title-small">{{ info(e.action).label }}<template v-if="e.noticeId"> #{{ e.noticeId }}</template></v-list-item-title>
          <div v-if="summary(e)" class="text-body-medium text-wrap">{{ summary(e) }}</div>
          <div class="text-body-small muted">{{ dateTime(e.at) }} · {{ e.ip }}</div>
        </v-list-item>
      </v-list>
    </v-card>
  </section>
</template>

<style scoped>
.block { display: grid; gap: 12px; }
.lead { display: grid; place-items: center; width: 40px; height: 40px; margin-right: 16px; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-surface-container-highest)); color: rgb(var(--v-theme-on-surface-variant)); }
.lead.warn { background: rgb(var(--v-theme-warning-container)); color: rgb(var(--v-theme-on-warning-container)); }
.lead.error { background: rgb(var(--v-theme-error-container)); color: rgb(var(--v-theme-on-error-container)); }
</style>
