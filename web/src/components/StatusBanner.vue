<script setup lang="ts">
import { computed, ref } from 'vue'
import { useNotices, useStatus } from '@/stores/data'
import { useUi } from '@/stores/ui'

const notices = useNotices()
const status = useStatus()
const ui = useUi()
const readDismissed = (): number[] => {
  try { return JSON.parse(sessionStorage.getItem('kw_dismissed') ?? '[]') } catch { return [] }
}
const dismissed = ref<number[]>(readDismissed())
function dismiss(id: number) {
  dismissed.value.push(id)
  try { sessionStorage.setItem('kw_dismissed', JSON.stringify(dismissed.value)) } catch { /* opcjonalne */ }
}
const danger = computed(() => notices.list.filter((n) => n.severity === 'danger' && !dismissed.value.includes(n.id)))
const data = computed(() => {
  const s = status.status
  if (!s || s.level === 'ok' || !s.messages.length) return null
  return { level: s.level, messages: s.messages }
})
</script>

<template>
  <div v-if="danger.length || data" class="banners">
    <v-alert
      v-for="n in danger"
      :key="n.id"
      color="error-container"
      icon="cancel-fill"
      rounded="xl"
      role="alert"
      :title="n.title"
      class="banner"
    >
      <p class="text-body-medium banner-text">{{ n.body }}</p>
      <div class="d-flex flex-wrap ga-2 mt-2 ml-n3">
        <v-btn v-if="n.trains.length" variant="text" size="small" @click="ui.openTrain({ number: n.trains[0] })">Szczegóły pociągu</v-btn>
        <v-btn variant="text" size="small" @click="dismiss(n.id)">Ukryj</v-btn>
      </div>
    </v-alert>
    <v-alert
      v-if="data"
      :color="data.level === 'down' ? 'error-container' : 'surface-container-high'"
      :icon="data.level === 'down' ? 'error-fill' : 'info'"
      rounded="xl"
      class="banner"
      :title="data.level === 'down' ? 'Ograniczony dostęp do danych' : 'Część danych na żywo jest niedostępna'"
    >
      <p v-for="m in data.messages" :key="m.text" class="text-body-medium">{{ m.text }}</p>
    </v-alert>
  </div>
</template>

<style scoped>
.banners { display: grid; gap: 12px; }
.banner-text { white-space: pre-line; }
</style>
