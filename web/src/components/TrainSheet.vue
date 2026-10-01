<script setup lang="ts">
import { computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useUi } from '@/stores/ui'
import TrainDetail from './TrainDetail.vue'

const ui = useUi()
const { mdAndUp } = useDisplay()
const open = computed({
  get: () => ui.sheet !== null,
  set: (value: boolean) => { if (!value) ui.closeTrain() },
})
const docked = computed(() => !!ui.sheet?.docked && mdAndUp.value)
</script>

<template>
  <v-navigation-drawer
    v-if="mdAndUp"
    v-model="open"
    location="right"
    :temporary="!docked"
    :scrim="!docked"
    width="420"
    class="train-sheet"
    :class="{ docked }"
    aria-label="Szczegóły pociągu"
  >
    <TrainDetail v-if="ui.sheet" :trip-key="ui.sheet.key" :number="ui.sheet.number" in-sheet @close="ui.closeTrain()" />
  </v-navigation-drawer>
  <v-bottom-sheet v-else v-model="open" max-height="90dvh" scrollable aria-label="Szczegóły pociągu">
    <v-card color="surface-container-low" rounded="t-xl" class="sheet-card">
      <div class="handle" aria-hidden="true" />
      <div class="sheet-scroll">
        <TrainDetail v-if="ui.sheet" :trip-key="ui.sheet.key" :number="ui.sheet.number" in-sheet @close="ui.closeTrain()" />
      </div>
    </v-card>
  </v-bottom-sheet>
</template>

<style scoped>
.train-sheet { background: rgb(var(--v-theme-surface-container-low)) !important; border-radius: 16px 0 0 16px; }
.train-sheet.docked { border-left: 1px solid rgb(var(--v-theme-outline-variant)); }
.sheet-card { display: flex; flex-direction: column; max-height: 90dvh; }
.sheet-scroll { overflow-y: auto; }
.handle { width: 32px; height: 4px; margin: 12px auto 0; border-radius: 2px; background: color-mix(in srgb, rgb(var(--v-theme-on-surface-variant)) 40%, transparent); flex: none; }
</style>
