<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Trip } from '@/api/types'
import TrainDetail from '@/components/TrainDetail.vue'

const route = useRoute()
const router = useRouter()
const key = computed(() => (route.query.kurs as string) || undefined)
const number = computed(() => route.params.number as string)
const trip = ref<Trip | null>(null)
function loaded(t: Trip) {
  trip.value = t
  document.title = `KW ${t.number} ${t.origin} – ${t.destination} · Infoportal KW`
}
</script>

<template>
  <div class="page-narrow">
    <v-btn variant="text" prepend-icon="arrow_back" class="mb-2 ml-n2" @click="router.back()">Wróć</v-btn>
    <v-card color="surface-container-low">
      <TrainDetail :trip-key="key" :number="key ? undefined : number" @loaded="loaded" />
    </v-card>
  </div>
</template>
