<script setup lang="ts">
// Zakładka Bus-Tramwaj-Kolej — szkielet do rozbudowy (wspólne odjazdy komunikacji miejskiej i kolei).
const modes = [
  { icon: 'directions_bus', title: 'Autobusy', text: 'Odjazdy autobusów miejskich i podmiejskich z przystanków przy stacjach.', ready: false },
  { icon: 'tram', title: 'Tramwaje', text: 'Tramwaje w Poznaniu z przesiadkami do pociągów KW.', ready: false },
  { icon: 'train', title: 'Kolej', text: 'Odjazdy i przyjazdy pociągów Kolei Wielkopolskich.', ready: true, to: '/odjazdy' },
]
</script>

<template>
  <div class="page-narrow">
    <header class="intro">
      <span class="intro-ic"><v-icon icon="commute" size="32" /></span>
      <div>
        <h1 class="text-headline-small">Bus-Tramwaj-Kolej</h1>
        <p class="text-body-large muted">Jedna tablica dla całej podróży: autobus lub tramwaj do stacji, potem pociąg KW.</p>
      </div>
    </header>

    <div class="modes">
      <v-card v-for="m in modes" :key="m.title" color="surface-container-low" rounded="xl" :to="m.to" class="mode">
        <v-card-text class="d-grid">
          <span class="mode-ic" :class="{ ready: m.ready }"><v-icon :icon="m.icon" /></span>
          <h2 class="text-title-large">{{ m.title }}</h2>
          <p class="text-body-medium muted">{{ m.text }}</p>
          <span class="tag" :class="m.ready ? 'tag-ontime' : 'tag-neutral'">
            <v-icon :icon="m.ready ? 'check' : 'construction'" />{{ m.ready ? 'Dostępne' : 'W przygotowaniu' }}
          </span>
        </v-card-text>
      </v-card>
    </div>

    <v-alert color="surface-container-high" icon="info" rounded="xl" class="mt-6">
      Pracujemy nad połączeniem rozkładów komunikacji miejskiej z pociągami KW. Do tego czasu odjazdy pociągów znajdziesz w zakładce Odjazdy.
    </v-alert>
  </div>
</template>

<style scoped>
.intro { display: flex; align-items: center; gap: 16px; padding: 8px 0 24px; }
.intro-ic { display: grid; place-items: center; width: 64px; height: 64px; flex: none; border-radius: 20px; background: rgb(var(--v-theme-tertiary-container)); color: rgb(var(--v-theme-on-tertiary-container)); }
.modes { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.d-grid { display: grid; gap: 10px; justify-items: start; }
.mode-ic { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 16px; background: rgb(var(--v-theme-surface-container-highest)); color: rgb(var(--v-theme-on-surface-variant)); }
.mode-ic .v-icon { font-size: 24px; }
.mode-ic.ready { background: rgb(var(--v-theme-primary-container)); color: rgb(var(--v-theme-on-primary-container)); }
</style>
