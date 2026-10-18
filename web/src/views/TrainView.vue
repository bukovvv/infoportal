<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Trip } from '@/api/types'
import TrainDetail from '@/components/TrainDetail.vue'
import { trainLabel } from '@/utils/agency'
import { usePageMeta } from '@/utils/seo'

const route = useRoute()
const router = useRouter()
const key = computed(() => (route.query.kurs as string) || undefined)
const number = computed(() => route.params.number as string)
const trip = ref<Trip | null>(null)
function loaded(t: Trip) {
  trip.value = t
}
usePageMeta(() => {
  const t = trip.value
  return t ? {
    title: `${trainLabel(t)} ${t.origin} – ${t.destination} | zanimwyjdziesz.pl`,
    description: `Pociąg ${trainLabel(t)} ${t.origin} – ${t.destination}: rozkład jazdy, postoje, perony i opóźnienie na żywo.`,
  } : null
})
/** Strona otwarta z linku (nowa karta, udostępnienie) nie ma poprzedniej strony w serwisie — wtedy na start. */
function back() {
  if (window.history.state?.back) router.back()
  else void router.replace({ name: 'start' })
}
</script>

<template>
  <div class="page-narrow">
    <v-btn variant="text" prepend-icon="arrow_back" class="mb-2 ml-n2" @click="back">Wróć</v-btn>
    <v-card color="surface-container-low" class="overflow-hidden">
      <TrainDetail :trip-key="key" :number="key ? undefined : number" @loaded="loaded" />
    </v-card>
  </div>
</template>
