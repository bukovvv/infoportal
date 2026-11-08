<script setup lang="ts">
/** Słowo od właściciela serwisu na czas żałoby (`utils/mourning.ts`). */
import MourningRibbon from '@/components/MourningRibbon.vue'
</script>

<template>
  <section class="mourning card" aria-labelledby="mourning-title">
    <MourningRibbon :size="56" class="m-ribbon" />
    <div class="m-text">
      <h2 id="mourning-title" class="m-title">Żałoba narodowa</h2>
      <p>
        Jestem właścicielem tej strony. Pochodzę z Krakowa — to moje rodzinne miasto. Jestem wstrząśnięty wydarzeniami,
        do których w nim doszło. Łączę się w bólu z rodzinami i bliskimi ofiar oraz ze wszystkimi mieszkańcami Krakowa.
      </p>
      <p class="m-sign">Właściciel zanimwyjdziesz.pl</p>
    </div>
  </section>
</template>

<style scoped>
.mourning {
  display: flex; gap: 20px; align-items: flex-start; padding: 20px 24px;
  background: #111 !important; color: #f2f2f2;
}
.m-ribbon { margin-top: 2px; }
.m-text { display: grid; gap: 8px; min-width: 0; }
.m-title { font-size: 20px; font-weight: 800; }
p { text-wrap: pretty; line-height: 1.5; }
.m-sign { color: #bdbdbd; font-size: 14px; font-style: italic; }
@media (max-width: 480px) {
  .mourning { gap: 14px; padding: 16px; }
}
</style>
