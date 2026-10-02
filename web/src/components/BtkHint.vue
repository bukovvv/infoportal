<script setup lang="ts">
// Podpowiedź o bilecie miesięcznym Bus-Tramwaj-Kolej, gdy wszystkie stacje leżą w strefach BTK (poza samym Poznaniem).
import { computed } from 'vue'
import { commuteTicket, formatPrice } from '@/utils/btkTariff'

const props = defineProps<{ stations: (string | null | undefined)[]; context: 'board' | 'trip' }>()
const ticket = computed(() => commuteTicket(props.stations))
</script>

<template>
  <v-card v-if="ticket" variant="flat" color="tertiary-container" class="btk-hint" :to="{ name: 'btk', query: { stacja: ticket.station } }">
    <v-card-text class="hint">
      <span class="hint-ic"><v-icon icon="commute" /></span>
      <span class="d-grid">
        <strong class="text-title-small">{{ context === 'board' ? 'Dojeżdżasz stąd do Poznania?' : 'Jeździsz tą trasą regularnie?' }}</strong>
        <span class="text-body-medium">
          Bilet miesięczny BTK od <strong class="tnum">{{ formatPrice(ticket.price) }}</strong>:
          {{ context === 'board' ? 'pociągi KW i POLREGIO' : 'ten przejazd' }} + autobusy i tramwaje ZTM.
        </span>
      </span>
      <v-icon icon="chevron_right" class="hint-go" />
    </v-card-text>
  </v-card>
</template>

<style scoped>
.hint { display: flex; align-items: center; gap: 16px; color: rgb(var(--v-theme-on-tertiary-container)); }
.hint-ic {
  display: grid; place-items: center; width: 40px; height: 40px; flex: none; border-radius: var(--kw-r-m);
  background: rgb(var(--v-theme-tertiary)); color: rgb(var(--v-theme-on-tertiary));
}
.d-grid { display: grid; gap: 2px; flex: 1; min-width: 0; }
.hint-go { flex: none; }
</style>
