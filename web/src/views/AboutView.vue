<script setup lang="ts">
// O nas: czym jest Infoportal, co w nim jest, skąd dane i prywatność.

const features = [
  { icon: 'search', title: 'Wyszukiwarka połączeń', text: 'Do dwóch przesiadek, „przyjazd do” wybranej godziny, połączenia po północy i wszystkie stacje po drodze.' },
  { icon: 'departure_board', title: 'Odjazdy i przyjazdy', text: 'Tablica każdej stacji KW z opóźnieniami i peronami. Ulubione stacje masz zawsze pod ręką.' },
  { icon: 'map', title: 'Mapa i schemat', text: 'Gdzie są teraz pociągi i jak biegną linie przewoźnika w Wielkopolsce.' },
  { icon: 'bookmark', title: 'Moje podróże', text: 'Obserwuj połączenie, a pokażemy odliczanie, opóźnienia i komunikaty dla Twojej trasy.' },
  { icon: 'commute', title: 'Bus-Tramwaj-Kolej', text: 'Kalkulator i zasady wspólnego biletu KW, POLREGIO i ZTM Poznań.' },
]

/** Opis źródła jako fragmenty: tekst albo link [etykieta, adres]. */
type Part = string | [string, string]
const sources: { icon: string; title: string; parts: Part[] }[] = [
  {
    icon: 'event',
    title: 'Rozkład jazdy',
    parts: ['Dane GTFS ', ['Mikołaja Kuranowskiego', 'https://mkuran.pl/gtfs/'], ' na podstawie danych PKP Polskich Linii Kolejowych, aktualizowane codziennie w nocy.'],
  },
  { icon: 'schedule', title: 'Opóźnienia', parts: ['Z systemu PKP PLK (GTFS-RT, mkuran.pl), odświeżane co ok. 2 minuty. Gdy źródło milczy, pokazujemy sam rozkład.'] },
  { icon: 'route', title: 'Pozycje pociągów', parts: ['Wyliczane z rozkładu i opóźnień wzdłuż trasy, więc to szacunek, nie GPS.'] },
  {
    icon: 'map',
    title: 'Mapa',
    parts: ['Podkład ', ['OpenFreeMap', 'https://openfreemap.org/'], ' i OpenMapTiles, dane © autorzy ', ['OpenStreetMap', 'https://www.openstreetmap.org/copyright'], '.'],
  },
  { icon: 'confirmation_number', title: 'Bilet Bus-Tramwaj-Kolej', parts: ['Ceny i strefy ze stron Kolei Wielkopolskich i POLREGIO.'] },
]

const privacy = [
  'Bez kont, reklam i statystyk odwiedzin. Nie używamy ciasteczek (poza panelem administratora).',
  'Ulubione stacje, obserwowane podróże, ostatnie wyszukiwanie, motyw i ukryte komunikaty zapisują się tylko w Twojej przeglądarce i nie trafiają na serwer. Usuniesz je, czyszcząc dane tej strony.',
  'Lokalizacji używamy tylko po kliknięciu „Najbliższa stacja” albo „Moja lokalizacja”. Najbliższą stację wylicza Twoja przeglądarka.',
  'Podkład mapy pobierany jest z OpenFreeMap, więc ten serwis widzi Twój adres IP. Hosting może zapisywać standardowe logi serwera.',
]
</script>

<template>
  <div class="page-narrow about">
    <header class="hero">
      <img src="/favicon.svg" width="88" height="88" alt="" class="logo">
      <div class="d-grid ga-2">
        <h1 class="text-headline-medium">Infoportal</h1>
        <p class="motto text-title-large">Wiesz, zanim wyjdziesz z domu.</p>
      </div>
    </header>

    <p class="text-body-large lead">
      Infoportal to nieoficjalny, niekomercyjny serwis dla pasażerów kolei w Wielkopolsce. Na razie obejmuje pociągi Kolei Wielkopolskich,
      a w przyszłości także POLREGIO na terenie Wielkopolski. Zbiera w jednym miejscu to, czego szukasz przed
      podróżą: połączenia z przesiadkami, odjazdy ze stacji, opóźnienia prosto z systemu PKP PLK, mapę pociągów i komunikaty o utrudnieniach.
      Bez reklam i bez zakładania konta: otwierasz i jedziesz.
    </p>

    <section aria-labelledby="features-title">
      <h2 id="features-title" class="text-title-large section-title">Co tu znajdziesz</h2>
      <ul class="tiles">
        <li v-for="f in features" :key="f.title">
          <span class="item-ic"><v-icon :icon="f.icon" /></span>
          <span class="d-grid ga-1">
            <strong class="text-title-small">{{ f.title }}</strong>
            <span class="text-body-medium muted">{{ f.text }}</span>
          </span>
        </li>
      </ul>
    </section>

    <section aria-labelledby="sources-title">
      <h2 id="sources-title" class="text-title-large section-title">Skąd dane</h2>
      <ul class="items">
        <li v-for="s in sources" :key="s.title">
          <span class="item-ic"><v-icon :icon="s.icon" /></span>
          <span class="d-grid ga-1">
            <strong class="text-title-small">{{ s.title }}</strong>
            <span class="text-body-medium muted">
              <template v-for="(part, i) in s.parts" :key="i">
                <a v-if="Array.isArray(part)" :href="part[1]" target="_blank" rel="noopener noreferrer" class="text-primary">{{ part[0] }}</a>
                <template v-else>{{ part }}</template>
              </template>
            </span>
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

    <v-alert color="surface-container-high" icon="info">
      Serwis nie jest związany z Kolejami Wielkopolskimi ani innymi przewoźnikami. Rozkład i opóźnienia mogą się różnić od rzeczywistości. W razie wątpliwości sprawdź
      na <a href="https://koleje-wielkopolskie.com.pl/" target="_blank" rel="noopener noreferrer" class="text-primary">stronie przewoźnika</a>,
      a bilety kup na <a href="https://wielkopolskiebilety.pl/" target="_blank" rel="noopener noreferrer" class="text-primary">wielkopolskiebilety.pl</a>.
    </v-alert>
  </div>
</template>

<style scoped>
.about { display: grid; gap: 28px; }
.d-grid { display: grid; align-content: start; }
.hero { display: flex; align-items: center; gap: 20px; padding-top: 8px; }
.logo { flex: none; border-radius: var(--kw-r-l); }
.motto { color: rgb(var(--v-theme-primary)); }
.lead { max-width: 68ch; }
.section-title { margin-bottom: 12px; }
.tiles { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
.tiles li { display: flex; gap: 14px; padding: 16px; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-surface-container-low)); }
.items { list-style: none; padding: 0; margin: 0; display: grid; gap: 16px; }
.items li { display: flex; gap: 14px; }
.item-ic {
  flex: none; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%;
  background: rgb(var(--v-theme-secondary-container)); color: rgb(var(--v-theme-on-secondary-container));
}
.privacy { margin: 0; padding-left: 20px; display: grid; gap: 8px; }
@media (max-width: 599px) {
  .hero { gap: 16px; }
  .logo { width: 64px; height: 64px; border-radius: var(--kw-r-m); }
}
</style>
