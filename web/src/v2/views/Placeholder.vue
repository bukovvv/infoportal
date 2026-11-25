<script setup lang="ts">
// Zaślepka zakładki, dopóki widok nie zostanie przeniesiony z makiety (server/v20/app.js).
</script>

<template>
  <section class="kol">
    <h1>{{ $route.meta.title }}</h1>
    <div class="plyta">
      <p class="dr">Ten ekran przenosimy z makiety do Vue. Gotową wersję makiety zobaczysz pod <a href="/v20">/v20</a>.</p>
    </div>
  </section>
</template>
