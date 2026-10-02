<script setup lang="ts">
// O serwisie: czym jest Infoportal, skąd dane, prywatność i autor (kliknięcie pokazuje zdjęcie).
import { ref } from 'vue'

const lore = ref(false)

const sources = [
  { icon: 'event', title: 'Rozkład jazdy', text: 'Dane GTFS Mikołaja Kuranowskiego (mkuran.pl) na podstawie danych PKP Polskich Linii Kolejowych. Aktualizowane codziennie w nocy.' },
  { icon: 'schedule', title: 'Opóźnienia', text: 'Z systemu PKP PLK (GTFS-RT, mkuran.pl), odświeżane co ok. 2 minuty. Gdy źródło nie działa, pokazujemy sam rozkład.' },
  { icon: 'route', title: 'Pozycje pociągów', text: 'Wyliczane z rozkładu i opóźnień wzdłuż trasy — to szacunek, nie GPS.' },
  { icon: 'map', title: 'Mapa', text: 'Podkład OpenFreeMap i OpenMapTiles, dane © autorzy OpenStreetMap.' },
  { icon: 'confirmation_number', title: 'Bilet Bus-Tramwaj-Kolej', text: 'Ceny i strefy ze stron Kolei Wielkopolskich i POLREGIO.' },
]

const privacy = [
  'Bez kont, reklam i statystyk odwiedzin. Nie używamy ciasteczek (poza panelem administratora).',
  'Obserwowane podróże, ostatnie wyszukiwanie, stacja tablicy, motyw i ukryte komunikaty zapisują się tylko w Twojej przeglądarce — nie trafiają na serwer. Usuniesz je, czyszcząc dane tej strony.',
  'Lokalizacji używamy tylko po kliknięciu „Najbliższa stacja” albo „Moja lokalizacja” — najbliższą stację wylicza przeglądarka.',
  'Podkład mapy pobierany jest z OpenFreeMap, więc ten serwis widzi Twój adres IP. Hosting serwisu może zapisywać standardowe logi serwera.',
]
</script>

<template>
  <div class="page-narrow">
    <header class="intro">
      <h1 class="text-headline-small">O serwisie</h1>
      <p class="text-body-large muted">
        Infoportal KW to nieoficjalny serwis pasażerski Kolei Wielkopolskich: wyszukiwarka połączeń, odjazdy, mapa pociągów i komunikaty
        w jednym miejscu. Nie jest związany z przewoźnikiem — bilety kupisz na stronie KW.
      </p>
    </header>

    <section aria-labelledby="sources-title">
      <h2 id="sources-title" class="text-title-large section-title">Skąd dane</h2>
      <ul class="items">
        <li v-for="s in sources" :key="s.title">
          <span class="item-ic"><v-icon :icon="s.icon" /></span>
          <span class="d-grid">
            <strong class="text-title-small">{{ s.title }}</strong>
            <span class="text-body-medium muted">{{ s.text }}</span>
          </span>
        </li>
      </ul>
    </section>

    <section aria-labelledby="privacy-title">
      <h2 id="privacy-title" class="text-title-large section-title">Prywatność</h2>
      <v-card color="surface-container-low">
        <v-card-text>
          <ul class="privacy text-body-medium">
            <li v-for="p in privacy" :key="p">{{ p }}</li>
          </ul>
        </v-card-text>
      </v-card>
    </section>

    <section aria-labelledby="author-title" class="author">
      <h2 id="author-title" class="text-title-large section-title">Autor</h2>
      <v-chip size="large" prepend-icon="person" variant="flat" color="secondary-container" aria-haspopup="dialog" @click="lore = true">Jakub</v-chip>
    </section>

    <v-dialog v-model="lore" max-width="720" aria-label="Autor">
      <v-card>
        <img src="/autor.webp" width="861" height="451" alt="Rysunek czerwonego pociągu z serduszkami obok zdjęcia autora" class="lore-img">
        <v-card-actions>
          <span class="text-body-small muted px-2">Lore serwisu.</span>
          <v-spacer />
          <v-btn variant="text" @click="lore = false">Zamknij</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.intro { display: grid; gap: 8px; padding: 8px 0 8px; }
.section-title { margin: 32px 0 12px; }
.items { display: grid; gap: 16px; margin: 0; padding: 0; list-style: none; }
.items li { display: flex; gap: 16px; align-items: flex-start; }
.item-ic {
  display: grid; place-items: center; width: 40px; height: 40px; flex: none; border-radius: var(--kw-r-m);
  background: rgb(var(--v-theme-surface-container-highest)); color: rgb(var(--v-theme-on-surface-variant));
}
.d-grid { display: grid; gap: 2px; }
.privacy { display: grid; gap: 10px; margin: 0; padding-left: 20px; }
.lore-img { display: block; width: 100%; height: auto; background: #fff; }
</style>
