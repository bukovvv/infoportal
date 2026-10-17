<script setup lang="ts">
// Powiadomienia o obserwowanej trasie: dla każdego kierunku okienko czasu (dni tygodnia + godziny odjazdu).
import { computed, reactive, watch } from 'vue'
import { ends, type SavedRoute, useRoutes } from '@/stores/routes'
import { DAY_NAMES, DEFAULT_WINDOWS, windowError, type RouteDir, type RouteWindow } from '@/utils/routes'
import TimeField from './TimeField.vue'

const open = defineModel<boolean>({ required: true })
const props = defineProps<{ route: SavedRoute }>()
const routes = useRoutes()

const DIRS = ['ab', 'ba'] as const
const draft = reactive<Record<RouteDir, RouteWindow & { on: boolean }>>({
  ab: { on: true, ...DEFAULT_WINDOWS.ab },
  ba: { on: true, ...DEFAULT_WINDOWS.ba },
})
watch(open, (isOpen) => {
  if (!isOpen) return
  const saved = props.route.notify
  for (const d of DIRS) {
    const w = saved?.[d] ?? DEFAULT_WINDOWS[d]
    // bez zapisanych powiadomień proponujemy oba kierunki
    draft[d] = { on: saved ? !!saved[d] : true, days: [...w.days], start: w.start, end: w.end }
  }
})

const errors = computed(() => Object.fromEntries(DIRS.map((d) => [d, draft[d].on ? windowError(draft[d]) : null])) as Record<RouteDir, string | null>)
const anyOn = computed(() => DIRS.some((d) => draft[d].on))
const active = computed(() => !!props.route.notify)
const busy = computed(() => !!routes.pending[props.route.id])

function toggleDay(d: RouteDir, day: number) {
  const days = draft[d].days
  draft[d].days = days.includes(day) ? days.filter((x) => x !== day) : [...days, day].sort((a, b) => a - b)
}

async function save() {
  const notify = anyOn.value
    ? Object.fromEntries(DIRS.filter((d) => draft[d].on).map((d) => [d, { days: draft[d].days, start: draft[d].start, end: draft[d].end }]))
    : null
  if (await routes.setNotify(props.route.id, notify)) open.value = false
}
async function disable() {
  if (await routes.setNotify(props.route.id, null)) open.value = false
}
</script>

<template>
  <v-dialog v-model="open" max-width="480" scrollable content-class="opt-dialog">
    <v-card class="opt-card">
      <header class="opt-head">
        <span class="opt-head-ic"><v-icon icon="notifications" size="22" /></span>
        <h2 class="opt-title">Powiadomienia o trasie</h2>
        <v-btn icon="close" variant="text" size="small" aria-label="Zamknij" @click="open = false" />
      </header>
      <v-card-text class="opt-body">
        <p class="text-body-medium">
          Powiadomimy Cię, gdy pociąg z odjazdem w wybranych godzinach spóźni się co najmniej 5 minut albo zostanie odwołany. Pierwsze powiadomienia — godzinę przed początkiem okienka.
        </p>
        <section v-for="d in DIRS" :key="d" class="dir-sec" :class="{ off: !draft[d].on }">
          <div class="dir-head">
            <span class="min-w-0">
              <span class="text-body-small muted d-block ellipsis">z: {{ ends(route, d).from.name }}</span>
              <strong class="text-title-small d-flex align-center ga-1"><v-icon icon="arrow_forward" size="18" /><span class="ellipsis">{{ ends(route, d).to.name }}</span></strong>
            </span>
            <v-switch v-model="draft[d].on" :aria-label="`Powiadomienia w kierunku ${ends(route, d).to.name}`" color="primary" inset density="compact" hide-details />
          </div>
          <v-expand-transition>
            <div v-if="draft[d].on" class="dir-body">
              <div class="days" role="group" aria-label="Dni tygodnia">
                <button v-for="(name, i) in DAY_NAMES" :key="name" type="button" class="pill" :aria-pressed="draft[d].days.includes(i + 1)" @click="toggleDay(d, i + 1)">{{ name }}</button>
              </div>
              <div class="times">
                <TimeField v-model="draft[d].start" label="Odjazd od" density="compact" variant="solo-filled" flat />
                <TimeField v-model="draft[d].end" label="do" density="compact" variant="solo-filled" flat />
              </div>
              <p v-if="errors[d]" class="text-body-small text-error">{{ errors[d] }}</p>
            </div>
          </v-expand-transition>
        </section>
      </v-card-text>
      <v-card-actions class="opt-actions">
        <v-btn v-if="active" variant="text" prepend-icon="notifications_off" :disabled="busy" @click="disable">Wyłącz</v-btn>
        <v-spacer />
        <v-btn
          variant="flat"
          color="primary"
          size="large"
          class="px-6"
          :loading="busy"
          :disabled="(!anyOn && !active) || !!errors.ab || !!errors.ba"
          @click="save"
        >
          {{ anyOn ? 'Zapisz' : 'Wyłącz' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* nagłówek na grafitowym pasku jak w oknie opcji wyszukiwania */
.opt-head {
  display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 14px 12px 14px 20px;
  background: rgb(var(--v-theme-band)); color: rgb(var(--v-theme-on-band));
}
.opt-head-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: color-mix(in srgb, rgb(var(--v-theme-on-band)) 14%, transparent); }
.opt-title { font-size: 20px; font-weight: 800; }
.opt-head .v-btn { color: rgb(var(--v-theme-on-band)); }
.opt-body { display: grid; gap: 16px; padding: 20px !important; }
.opt-actions { padding: 8px 16px 16px !important; }

.dir-sec { display: grid; gap: 12px; padding: 14px 16px; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-surface-container)); }
.dir-sec.off .dir-head { opacity: .7; }
.dir-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.dir-body { display: grid; gap: 12px; }
.days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.pill {
  height: 36px; padding: 0; border: 1px solid rgb(var(--v-theme-outline-variant)); border-radius: 999px;
  background: transparent; color: rgb(var(--v-theme-on-surface)); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer;
}
.pill:hover { background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 6%, transparent); }
.pill[aria-pressed='true'] { border-color: transparent; background: rgb(var(--v-theme-inverse-surface)); color: rgb(var(--v-theme-on-inverse-surface)); }
.pill:focus-visible { outline: 3px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
.times { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.times :deep(.v-field--variant-solo-filled) { background: rgb(var(--v-theme-surface)); }
</style>
