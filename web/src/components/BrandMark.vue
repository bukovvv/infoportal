<script setup lang="ts">
/** Znak serwisu (zegar ze strzałką, docs/brand/zanimwyjdziesz-sygnet-*.svg) w kolorach motywu; na grafitowym pasku — `on-band`. */
defineProps<{ onBand?: boolean; size?: number }>()
</script>

<template>
  <svg class="brand-sign" :class="{ 'on-band': onBand }" viewBox="8 8 92 84" :width="size ?? 40" :height="size ?? 40" aria-hidden="true">
    <path class="ink" d="M79.5 29.3A36 36 0 1 0 79.5 70.7M50 50V28" />
    <path class="arrow" d="M50 50H94M84 40L94 50L84 60" />
  </svg>
</template>

<style scoped>
.brand-sign { display: block; flex: none; }
path { fill: none; stroke-width: 8; stroke-linecap: round; stroke-linejoin: round; }
.ink { stroke: rgb(var(--v-theme-on-surface)); }
.on-band .ink { stroke: rgb(var(--v-theme-on-band)); }
.arrow { stroke: rgb(var(--v-theme-brand-red)); }
</style>
