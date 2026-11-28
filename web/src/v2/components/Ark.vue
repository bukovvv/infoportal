<script setup lang="ts">
import { useDisplay } from 'vuetify'
import { VBottomSheet } from 'vuetify/components/VBottomSheet'
import { VDialog } from 'vuetify/components/VDialog'

// Okno 2.0 („arkusz” z makiety): na telefonie wysuwane od dołu, na komputerze na środku. Tytuł i okrągłe „Zamknij”.
const open = defineModel<boolean>({ required: true })
defineProps<{ title: string }>()
const { smAndDown } = useDisplay()
</script>

<template>
  <component :is="smAndDown ? VBottomSheet : VDialog" v-model="open" :max-width="smAndDown ? undefined : 520" scrollable>
    <div class="arkusz kol" role="document">
      <div class="wiersz rozsun">
        <h2>{{ title }}</h2>
        <button type="button" class="kolo" aria-label="Zamknij" @click="open = false"><v-icon icon="close" /></button>
      </div>
      <slot />
    </div>
  </component>
</template>

<style>
.arkusz { gap: 16px; width: 100%; max-height: 88dvh; overflow: auto; padding: 20px max(16px, env(safe-area-inset-right, 0px)) calc(20px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px)); border-radius: var(--r-l) var(--r-l) 0 0; background: var(--papier); color: var(--tusz); }
.v-dialog .arkusz { border-radius: var(--r-l); padding: 24px; }
.arkusz h2 { font-size: 24px; font-weight: 700; letter-spacing: -.02em; }
.arkusz b { font-weight: 700; }
</style>
