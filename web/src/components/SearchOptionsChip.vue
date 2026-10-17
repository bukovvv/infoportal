<script setup lang="ts">
// Wyszukiwarka: chip „Opcje” obok „Kiedy” — w oknie przesiadki (ile, minimalny czas) i przewoźnicy.
import { computed, ref } from 'vue'
import { DEFAULT_OPTIONS, MIN_TRANSFERS, changedCount, optionsLabel, type SearchOptions } from '@/utils/searchOptions'
import AgencyToggles from './AgencyToggles.vue'

const options = defineModel<SearchOptions>({ required: true })
/** okno zamknięte — rodzic odświeża wyniki, jeśli opcje się zmieniły */
const emit = defineEmits<{ done: [] }>()
const open = ref(false)
const changed = computed(() => changedCount(options.value) > 0)

const TRANSFERS = [
  { value: 0, top: '0', label: 'bezpośrednio' },
  { value: 1, top: '1', label: 'maks. 1' },
  { value: 2, top: '2', label: 'maks. 2' },
] as const
/** podpowiedź pod wyborem czasu na przesiadkę */
const MIN_HINTS: Record<number, string> = {
  3: 'Najwięcej połączeń — na przesiadkę na tym samym peronie.',
  5: 'Zapas na zejście do przejścia podziemnego.',
  10: 'Spokojnie, także z bagażem lub dziećmi.',
  15: 'Duży zapas na wypadek opóźnienia.',
}

const set = (patch: Partial<SearchOptions>) => { options.value = { ...options.value, ...patch } }
const agencies = computed({ get: () => options.value.agencies, set: (v) => set({ agencies: v }) })
function reset() {
  options.value = { ...DEFAULT_OPTIONS, agencies: [...DEFAULT_OPTIONS.agencies] }
}
</script>

<template>
  <v-dialog v-model="open" max-width="460" scrollable content-class="opt-dialog" @after-leave="emit('done')">
    <template #activator="{ props: act }">
      <button type="button" class="opt-chip" :class="{ on: changed }" v-bind="act" :aria-label="`Opcje wyszukiwania: ${optionsLabel(options)}`">
        <v-icon :icon="changed ? 'check' : 'tune'" size="17" /><span class="ellipsis">{{ optionsLabel(options) }}</span>
      </button>
    </template>
    <v-card class="opt-card">
      <header class="opt-head">
        <span class="opt-head-ic"><v-icon icon="tune" size="22" /></span>
        <h2 class="opt-title">Opcje wyszukiwania</h2>
        <v-btn icon="close" variant="text" size="small" aria-label="Zamknij" @click="open = false" />
      </header>
      <v-card-text class="opt-body">
        <section>
          <h3 class="opt-h">Przesiadki</h3>
          <div class="tiles" role="group" aria-label="Najwięcej przesiadek">
            <button
              v-for="t in TRANSFERS"
              :key="t.value"
              type="button"

              class="tile"
              :aria-pressed="options.maxTransfers === t.value"
              @click="set({ maxTransfers: t.value })"
            >
              <span class="tile-top tnum">{{ t.top }}</span>
              <span class="tile-label">{{ t.label }}</span>
            </button>
          </div>
        </section>

        <v-expand-transition>
          <section v-if="options.maxTransfers > 0">
            <h3 class="opt-h">Czas na przesiadkę, co najmniej</h3>
            <div class="pills" role="group" aria-label="Minimalny czas na przesiadkę">
              <button
                v-for="m in MIN_TRANSFERS"
                :key="m"
                type="button"

                class="pill tnum"
                :aria-pressed="options.minTransfer === m"
                @click="set({ minTransfer: m })"
              >
                {{ m }} min
              </button>
            </div>
            <p class="text-body-small muted mt-2">{{ MIN_HINTS[options.minTransfer] }}</p>
          </section>
        </v-expand-transition>

        <section>
          <h3 class="opt-h">Przewoźnicy</h3>
          <AgencyToggles v-model="agencies" :notes="{ PR: 'Bilety KW honorowane na odcinkach wspólnych', IC: 'Osobny bilet PKP Intercity' }" />
        </section>
      </v-card-text>
      <v-card-actions class="opt-actions">
        <v-btn variant="text" prepend-icon="restart_alt" :disabled="!changed" @click="reset">Domyślne</v-btn>
        <v-spacer />
        <v-btn variant="flat" color="primary" size="large" class="px-6" @click="open = false">Gotowe</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.opt-chip {
  display: inline-flex; align-items: center; gap: 5px; max-width: 100%; height: 32px; padding: 0 12px 0 8px;
  border: 1px solid rgb(var(--v-theme-outline)); border-radius: 999px; background: transparent; color: inherit;
  font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
}
.opt-chip:hover { background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 6%, transparent); }
.opt-chip:focus-visible { outline: 3px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
.opt-chip .v-icon { color: rgb(var(--v-theme-primary)); }
.opt-chip.on { border-color: transparent; background: rgb(var(--v-theme-primary-container)); color: rgb(var(--v-theme-on-primary-container)); }
.opt-chip.on .v-icon { color: inherit; }

/* nagłówek okna na grafitowym pasku (jak górny pasek aplikacji) */
.opt-head {
  display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 14px 12px 14px 20px;
  background: rgb(var(--v-theme-band)); color: rgb(var(--v-theme-on-band));
}
.opt-head-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: color-mix(in srgb, rgb(var(--v-theme-on-band)) 14%, transparent); }
.opt-title { font-size: 20px; font-weight: 800; }
.opt-head .v-btn { color: rgb(var(--v-theme-on-band)); }
.opt-body { display: grid; gap: 22px; padding: 20px !important; }
.opt-h { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .6px; color: rgb(var(--v-theme-on-surface-variant)); margin-bottom: 10px; }

/* przesiadki: trzy kafelki z dużą cyfrą */
.tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.tile {
  display: grid; justify-items: center; gap: 2px; padding: 12px 4px 10px; border: 2px solid transparent; border-radius: var(--kw-r-m);
  background: rgb(var(--v-theme-surface-container)); color: rgb(var(--v-theme-on-surface)); font: inherit; cursor: pointer;
  transition: background-color .15s, border-color .15s;
}
.tile:hover { background: rgb(var(--v-theme-surface-container-high)); }
.tile-top { font-size: 28px; line-height: 32px; font-weight: 800; }
.tile-label { font-size: 12px; font-weight: 600; color: rgb(var(--v-theme-on-surface-variant)); text-align: center; }
.tile[aria-pressed='true'] { background: rgb(var(--v-theme-primary-container)); color: rgb(var(--v-theme-on-primary-container)); border-color: rgb(var(--v-theme-primary)); }
.tile[aria-pressed='true'] .tile-label { color: inherit; }

/* minimalny czas: pigułki */
.pills { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.pill {
  height: 40px; padding: 0 4px; white-space: nowrap; border: 1px solid rgb(var(--v-theme-outline-variant)); border-radius: 999px;
  background: transparent; color: rgb(var(--v-theme-on-surface)); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer;
}
.pill:hover { background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 6%, transparent); }
.pill[aria-pressed='true'] { border-color: transparent; background: rgb(var(--v-theme-inverse-surface)); color: rgb(var(--v-theme-on-inverse-surface)); }
.tile:focus-visible, .pill:focus-visible { outline: 3px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
.opt-actions { padding: 8px 16px 16px !important; }
</style>
<style>
/* na telefonie okno prawie na całą szerokość (domyślny margines Vuetify to 24 px) */
@media (max-width: 480px) { .v-overlay__content.opt-dialog { margin: 12px; width: calc(100% - 24px) !important; max-width: none !important; } }
</style>
