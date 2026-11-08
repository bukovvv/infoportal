<script setup lang="ts">
/** Wstążka żałobna (tryb żałoby, `utils/mourning.ts`): czarna z jasnym obrysem, żeby była widoczna na czarnym pasku. */
defineProps<{ size?: number }>()
</script>

<template>
  <svg class="ribbon" viewBox="0 0 32 48" :height="size ?? 36" :width="((size ?? 36) * 32) / 48" role="img" aria-label="Wstążka żałobna">
    <!-- cała wstążka: lewa noga → pętla → prawa noga; potem prawa noga jeszcze raz, żeby leżała na wierzchu -->
    <path class="edge" d="M5 45 L19.5 16 C23 8 19.5 3 15.5 3 C11.5 3 8.5 7 10.5 13 L27 45" />
    <path class="fill" d="M5 45 L19.5 16 C23 8 19.5 3 15.5 3 C11.5 3 8.5 7 10.5 13 L27 45" />
    <path class="edge" d="M12 16.2 L27 45" />
    <path class="fill" d="M12 16.2 L27 45" />
  </svg>
</template>

<style scoped>
.ribbon { display: block; flex: none; }
path { fill: none; stroke-linejoin: round; stroke-linecap: butt; }
.edge { stroke: rgb(255 255 255 / .85); stroke-width: 8.5; }
.fill { stroke: #0d0d0d; stroke-width: 6; }
</style>
