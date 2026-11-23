<script setup lang="ts">
// O nas jak ekran „O aplikacji”: logo na grafitowym pasku, wsparcie, lista skrótów; źródła danych i prywatność rozwijane.
import BandHero from '@/components/BandHero.vue'
import logoOnBand from '@/assets/logo-na-ciemne.svg'
import { region } from '@/utils/region'

const SUPPORT_URL = 'https://buycoffee.to/zanimwyjdziesz'

const links = [
  { icon: 'search', title: 'Wyszukiwarka połączeń', to: { name: 'start', hash: '#szukaj' } },
  { icon: 'departure_board', title: 'Odjazdy i przyjazdy', to: '/odjazdy' },
  { icon: 'map', title: 'Mapa pociągów', to: '/mapa' },
  ...(region.features.btk ? [{ icon: 'commute', title: 'Bilet Bus-Tramwaj-Kolej', to: '/bus-tramwaj-kolej' }] : []),
]

/** Opis źródła jako fragmenty: tekst albo link [etykieta, adres]. */
type Part = string | [string, string]
const sources: { title: string; parts: Part[] }[] = [
  { title: 'Rozkład jazdy', parts: ['Dane GTFS ', ['Mikołaja Kuranowskiego', 'https://mkuran.pl/gtfs/'], ' na podstawie danych PKP Polskich Linii Kolejowych, aktualizowane codziennie w nocy. Obejmuje Koleje Wielkopolskie (zanimwyjdziesz.pl) i Koleje Małopolskie (zanimwyjdziesz.pl/malopolska), a także pociągi POLREGIO i PKP Intercity na stacjach w tych województwach.'] },
  { title: 'Opóźnienia', parts: ['Z systemu PKP PLK (GTFS-RT, mkuran.pl), odświeżane co ok. 2 minuty. Gdy źródło milczy, pokazujemy sam rozkład.'] },
  { title: 'Punktualność', parts: ['Liczona z tych samych opóźnień PKP PLK: na stronie pociągu odsetek kursów, które dojechały na stację końcową z opóźnieniem do 5 min (okres i próg zmienisz w Ustawieniach).'] },
  { title: 'Pozycje pociągów', parts: ['Wyliczane z rozkładu i opóźnień wzdłuż trasy, więc to szacunek, nie GPS. Wyjątek: pociągi Kolei Małopolskich, które nadają pozycję GPS.'] },
  { title: 'GPS Kolei Małopolskich', parts: ['Dane: Koleje Małopolskie sp. z o.o., ', ['otwarte dane GTFS', 'https://gtfs.kolejemalopolskie.com.pl/'], ' (GTFS-Realtime), pobierane co minutę. Łączymy je z rozkładem i opóźnieniami PKP PLK: pozycja pochodzi od przewoźnika, opóźnienie z PKP PLK. To nasze opracowanie, nie oficjalna informacja przewoźnika.'] },
  { title: 'Rodzaj pojazdu', parts: ['Dane: Koleje Wielkopolskie sp. z o.o., rozkład GTFS przewoźnika udostępniany jako informacja publiczna (', ['zasady w BIP', 'https://bip.koleje-wielkopolskie.com.pl/informacje-publiczne/zasady-udostepniania-informacji-publicznych/'], '), pobierany codziennie. Bierzemy z niego tylko rodzaj pojazdu (pociąg elektryczny, szynobus, parowóz) i udogodnienia dla osób na wózkach i rowerzystów. Przewoźnik może podstawić inny pojazd.'] },
  { title: 'Mapa', parts: ['Podkład ', ['OpenFreeMap', 'https://openfreemap.org/'], ' i OpenMapTiles, dane © autorzy ', ['OpenStreetMap', 'https://www.openstreetmap.org/copyright'], '.'] },
  ...(region.features.notices ? [{ title: 'Komunikaty', parts: ['Piszemy je sami na podstawie informacji przewoźników. Część zaczyna się od utrudnień z ', ['otwartego API PKP PLK', 'https://pdp-api.plk-sa.pl/'], ' (źródło: PKP Polskie Linie Kolejowe S.A.); takie komunikaty sprawdzamy przed publikacją.'] as Part[] }] : []),
  ...(region.features.btk ? [{ title: 'Bilet Bus-Tramwaj-Kolej', parts: ['Ceny i strefy ze stron Kolei Wielkopolskich i POLREGIO.'] as Part[] }] : []),
]

const privacy = [
  'Bez kont, reklam i statystyk odwiedzin. Nie używamy ciasteczek (poza panelem administratora).',
  'Ulubione stacje, obserwowane podróże i trasy, ostatnie wyszukiwanie i jego opcje, ostatnio wybrany region, motyw, ustawienia i ukryte komunikaty zapisują się tylko w Twojej przeglądarce i nie trafiają na serwer (wyjątek: powiadomienia, opisane niżej). Usuniesz je, czyszcząc dane tej strony.',
  'Gdy włączysz powiadomienia o podróży, serwer zapisuje adres subskrypcji powiadomień Twojej przeglądarki i pociągi tej podróży. Usuwamy je po jej zakończeniu albo po wyłączeniu powiadomień. Przy powiadomieniach o trasie serwer zapisuje adres subskrypcji, obie stacje, opcje wyszukiwania i wybrane dni i godziny — do wyłączenia powiadomień, a jeśli przez 90 dni nie otworzysz strony, usuwamy je same. Powiadomienia dostarcza usługa producenta przeglądarki (Google, Mozilla, Apple, Microsoft).',
  'Lokalizacji używamy tylko po kliknięciu „Najbliższa stacja” albo „Moja lokalizacja”. Najbliższą stację wylicza Twoja przeglądarka.',
  'Podkład mapy pobierany jest z OpenFreeMap, więc ten serwis widzi Twój adres IP. Hosting może zapisywać standardowe logi serwera. Do ochrony przed nadużyciami serwer liczy zapytania z jednego adresu IP: zapisuje tylko jednokierunkowy skrót adresu, a liczniki usuwa po dobie.',
]
</script>

<template>
  <BandHero narrow>
    <div class="hero">
      <h1 class="logo-h"><img :src="logoOnBand" alt="zanimwyjdziesz.pl" class="logo"></h1>
      <p class="motto">Już wiesz, jak pojedziesz.</p>
      <p class="intro">Nieoficjalny serwis dla pasażerów kolei w Wielkopolsce i Małopolsce. Bez reklam i bez konta.</p>
    </div>
  </BandHero>

  <div class="page-narrow about">
    <section class="support card" aria-labelledby="support-title">
      <span class="support-ic"><v-icon icon="coffee" size="26" /></span>
      <div class="support-text">
        <h2 id="support-title" class="support-title">Wesprzyj nas</h2>
        <p class="text-body-medium muted">Wesprzyj nas na buycoffee.to/zanimwyjdziesz. Za każde wsparcie dziękujemy!</p>
      </div>
      <v-btn :href="SUPPORT_URL" target="_blank" rel="noopener noreferrer" prepend-icon="favorite" class="support-btn">Postaw kawę</v-btn>
    </section>

    <nav class="card list" aria-label="Skróty">
      <router-link v-for="l in links" :key="l.title" :to="l.to" class="row">
        <span class="row-ic"><v-icon :icon="l.icon" size="22" /></span>
        <span class="row-title">{{ l.title }}</span>
        <v-icon icon="chevron_right" class="muted" />
      </router-link>
    </nav>

    <v-expansion-panels variant="accordion" bg-color="surface-container-low" class="details">
      <v-expansion-panel>
        <v-expansion-panel-title>
          <span class="row-ic mr-4"><v-icon icon="route" size="22" /></span><span class="row-title">Skąd dane</span>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <dl class="sources text-body-medium">
            <template v-for="s in sources" :key="s.title">
              <dt>{{ s.title }}</dt>
              <dd class="muted">
                <template v-for="(part, i) in s.parts" :key="i">
                  <a v-if="Array.isArray(part)" :href="part[1]" target="_blank" rel="noopener noreferrer" class="text-primary">{{ part[0] }}</a>
                  <template v-else>{{ part }}</template>
                </template>
              </dd>
            </template>
          </dl>
        </v-expansion-panel-text>
      </v-expansion-panel>
      <v-expansion-panel>
        <v-expansion-panel-title>
          <span class="row-ic mr-4"><v-icon icon="shield" size="22" /></span><span class="row-title">Prywatność</span>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <ul class="privacy text-body-medium">
            <li v-for="p in privacy" :key="p">{{ p }}</li>
          </ul>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <p class="text-body-small muted disclaimer">
      zanimwyjdziesz.pl to niezależny serwis informacji pasażerskiej. Dane o połączeniach i opóźnieniach mogą różnić się od sytuacji na kolei.
    </p>
  </div>
</template>

<style scoped>
.hero { display: grid; justify-items: start; gap: 6px; padding: 8px 0 12px; }
.logo-h { margin: 0 0 8px; line-height: 0; }
.logo { display: block; height: 72px; width: auto; max-width: 100%; }
.motto { font-size: 20px; line-height: 26px; font-weight: 800; }
.intro { font-size: 15px; opacity: .85; }

.about { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); padding-top: 0; }
.support { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px; padding: 16px; }
.support-ic {
  flex: none; display: grid; place-items: center; width: 48px; height: 48px; border-radius: var(--kw-r-m);
  background: rgb(var(--v-theme-primary-container)); color: rgb(var(--v-theme-on-primary-container));
}
.support-text { flex: 1 1 220px; display: grid; gap: 2px; }
.support-title { font-size: 17px; font-weight: 800; }

/* lista jak w ustawieniach aplikacji: ikona, tytuł, strzałka */
.list { overflow: hidden; }
.row { display: flex; align-items: center; gap: 16px; min-height: 56px; padding: 8px 16px; color: inherit; text-decoration: none; }
.row + .row { border-top: 1px solid rgb(var(--v-theme-outline-variant)); }
.row:hover { background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 6%, transparent); }
.row:focus-visible { outline: 3px solid rgb(var(--v-theme-primary)); outline-offset: -3px; }
.row-ic {
  flex: none; display: grid; place-items: center; width: 36px; height: 36px; border-radius: var(--kw-r-s);
  background: rgb(var(--v-theme-surface-container)); color: rgb(var(--v-theme-primary));
}
.row-title { flex: 1; font-size: 16px; font-weight: 600; }
.details :deep(.v-expansion-panel-title) { min-height: 56px; padding: 8px 16px; }
.sources { display: grid; gap: 2px; margin: 0; }
.sources dt { font-weight: 700; margin-top: 10px; }
.sources dt:first-child { margin-top: 0; }
.sources dd { margin: 0; }
.privacy { margin: 0; padding-left: 20px; display: grid; gap: 8px; }
.disclaimer { padding: 0 4px; max-width: 70ch; }
@media (max-width: 599px) {
  .logo { height: 60px; }
  .support-btn { width: 100%; }
}
</style>
