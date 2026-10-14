<script setup lang="ts">
/**
 * Przedłużenie grafitowego górnego paska pod nagłówkiem (na całą szerokość, poza .page).
 * overlap: bez zaokrąglenia i z zapasem na dole — następna karta (klasa .band-lift) nachodzi na pasek.
 */
defineProps<{ narrow?: boolean; overlap?: boolean }>()
</script>

<template>
  <div class="band-hero" :class="{ overlap }">
    <div class="band-inner" :class="narrow ? 'narrow' : 'wide'">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.band-hero {
  background: rgb(var(--v-theme-band)); color: rgb(var(--v-theme-on-band));
  border-radius: 0 0 var(--kw-r-l) var(--kw-r-l); margin-bottom: 16px;
}
.band-hero.overlap { border-radius: 0; margin-bottom: 0; }
.band-inner { margin: 0 auto; padding: 8px 24px 20px; display: grid; gap: 16px; }
.overlap .band-inner { padding-bottom: 76px; }
.band-inner.wide { max-width: 1280px; }
.band-inner.narrow { max-width: 880px; }
@media (max-width: 839px) {
  .band-inner { padding: 8px 16px 16px; gap: 12px; }
  .overlap .band-inner { padding-bottom: 68px; }
}
</style>
