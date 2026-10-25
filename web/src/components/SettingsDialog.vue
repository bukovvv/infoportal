<script setup lang="ts">
import { computed } from 'vue'
import { PERIODS, PREF_DEFAULTS, THRESHOLDS, usePrefs } from '@/stores/prefs'

// Ustawienia pasażera: punktualność (karta, okres, próg „na czas”) i które komunikaty pokazywać przy połączeniach. Zapis od razu, tylko w przeglądarce.
const store = usePrefs()
const p = store.prefs
const changed = computed(() => (Object.keys(PREF_DEFAULTS) as (keyof typeof PREF_DEFAULTS)[]).some((k) => p[k] !== PREF_DEFAULTS[k]))
</script>

<template>
  <v-dialog v-model="store.dialog" max-width="480" scrollable>
    <v-card color="surface-container-high">
      <v-card-item prepend-icon="tune">
        <v-card-title>Ustawienia</v-card-title>
        <v-card-subtitle>Zapisują się tylko w tej przeglądarce</v-card-subtitle>
      </v-card-item>
      <v-card-text class="settings">
        <section aria-labelledby="set-punct">
          <h3 id="set-punct" class="text-title-small">Punktualność pociągów</h3>
          <v-switch v-model="p.showPunctuality" color="primary" inset hide-details label="Pokazuj na stronie pociągu" />
          <div class="field" :class="{ off: !p.showPunctuality }">
            <span class="text-label-large">Okres</span>
            <div class="pills" role="group" aria-label="Okres statystyk">
              <button v-for="d in PERIODS" :key="d" type="button" class="pill" :aria-pressed="p.punctualityDays === d" :disabled="!p.showPunctuality" @click="p.punctualityDays = d">
                {{ d }} dni
              </button>
            </div>
          </div>
          <div class="field" :class="{ off: !p.showPunctuality }">
            <span class="text-label-large">Na czas, gdy opóźnienie</span>
            <div class="pills" role="group" aria-label="Próg punktualności">
              <button v-for="m in THRESHOLDS" :key="m" type="button" class="pill" :aria-pressed="p.onTimeMinutes === m" :disabled="!p.showPunctuality" @click="p.onTimeMinutes = m">
                do {{ m }} min
              </button>
            </div>
            <span class="text-body-small muted">PKP PLK i UTK liczą do 5 min.</span>
          </div>
        </section>

        <section aria-labelledby="set-notices">
          <h3 id="set-notices" class="text-title-small">Komunikaty przy połączeniach i na tablicy</h3>
          <v-radio-group v-model="p.connectionNotices" hide-details density="comfortable">
            <v-radio value="all" label="Wszystkie" />
            <v-radio value="alerts" label="Tylko utrudnienia (bez informacji, np. o zmianie rozkładu)" />
          </v-radio-group>
          <span class="text-body-small muted">Pełna lista zawsze jest w zakładce Komunikaty.</span>
        </section>
      </v-card-text>
      <v-card-actions>
        <v-btn v-if="changed" variant="text" prepend-icon="restart_alt" @click="store.reset()">Domyślne</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="store.dialog = false">Gotowe</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.settings { display: grid; gap: 20px; }
.settings section { display: grid; gap: 10px; }
.field { display: grid; gap: 6px; }
.field.off { opacity: .5; }
.pills { display: flex; flex-wrap: wrap; gap: 8px; }
.pill {
  min-height: 36px; padding: 0 16px; border: 1px solid rgb(var(--v-theme-outline)); border-radius: 999px; background: transparent;
  color: rgb(var(--v-theme-on-surface)); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
}
.pill[aria-pressed='true'] { border-color: transparent; background: rgb(var(--v-theme-secondary-container)); color: rgb(var(--v-theme-on-secondary-container)); }
.pill:hover:not(:disabled) { background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 8%, transparent); }
.pill[aria-pressed='true']:hover { background: rgb(var(--v-theme-secondary-container)); }
.pill:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
.pill:disabled { cursor: default; }
</style>
