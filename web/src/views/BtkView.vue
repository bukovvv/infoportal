<script setup lang="ts">
// Zakładka Bus-Tramwaj-Kolej — taryfa wspólnego biletu miesięcznego KW + POLREGIO + ZTM Poznań w prostej formie.
import { computed, ref, watch } from 'vue'
import { normalize } from '@/utils/format'
import {
  ALL_STATIONS, DISCOUNTS, EXTRAS, FARES, RAIL_STATIONS, RAIL_ZONES, TARIFF_DATE, ZTM_PLACES, ZTM_ZONES,
  farePrice, formatPrice, railCoverage, railZoneOf, ztmOptions,
  type Discount, type Extra, type FareRow, type RailZone, type ZtmZone,
} from '@/utils/btkTariff'

const station = ref<string | null>(null)
const rail = ref<RailZone | null>(null)
const ztm = ref<ZtmZone>('A')
const discount = ref<Discount>('normal')
const extraChoice = ref<Extra | null>(null)

watch(station, (name) => {
  const zone = name ? railZoneOf(name) : null
  if (zone) rail.value = zone
})
watch(rail, (zone) => {
  if (zone && !ztmOptions(zone).includes(ztm.value)) ztm.value = 'A'
  if (station.value && railZoneOf(station.value) !== zone) station.value = null
})

// dodatek (MPK Gniezno / Czempiń) obowiązuje tylko w swojej strefie kolejowej
const extraKey = computed<Extra | null>(() => (rail.value === 'F' ? 'gniezno' : rail.value === 'D' ? 'czempin' : null))
const extra = computed<Extra | null>(() => (extraChoice.value && extraChoice.value === extraKey.value ? extraChoice.value : null))
const withExtra = computed({
  get: () => extra.value !== null,
  set: (on: boolean) => { extraChoice.value = on ? extraKey.value : null },
})
const price = computed(() => (rail.value ? farePrice(rail.value, ztm.value, discount.value, extra.value) : null))
const discountInfo = computed(() => DISCOUNTS.find((d) => d.value === discount.value)!)

const ztmHints: Record<ZtmZone, string> = {
  A: 'Poznań',
  'A+B': 'Poznań i najbliższe okolice, m.in. Luboń, Swarzędz, Suchy Las, Plewiska',
  'A+C': 'Poznań i dalsze gminy, m.in. Kórnik, Mosina, Tarnowo Podgórne, Dopiewo',
  'A+B+C': 'Wszystkie linie ZTM',
}

const filterStation = (value: string, query: string) => normalize(value).includes(normalize(query))

const rowNote = (row: FareRow) => (row.extra === 'gniezno' ? '+ MPK Gniezno' : row.extra === 'czempin' ? '+ gm. Czempiń' : `pociągi ${railCoverage(row.rail)}`)
const isSelected = (row: FareRow, z: ZtmZone) => row.rail === rail.value && (row.extra ?? null) === extra.value && z === ztm.value
const cell = (row: FareRow, z: ZtmZone) => {
  const tuple = row.prices[z]
  return tuple ? formatPrice(tuple[DISCOUNTS.findIndex((d) => d.value === discount.value)]).replace(/\s?zł$/, '') : '—'
}
function pick(row: FareRow, z: ZtmZone) {
  if (!row.prices[z]) return
  rail.value = row.rail
  ztm.value = z
  extraChoice.value = row.extra ?? null
}

const rules = [
  { icon: 'badge', title: 'Bilet imienny', text: 'Przed pierwszym przejazdem wpisz na bilecie imię i nazwisko. Przy kontroli pokaż dokument ze zdjęciem, a przy uldze także legitymację.' },
  { icon: 'calendar_month', title: 'Ważny przez miesiąc', text: 'Od wybranego dnia, np. od 5 stycznia do 4 lutego. Możesz go kupić do 30 dni wcześniej.' },
  { icon: 'layers', title: 'Strefy się sumują', text: 'Bilet na strefę D obejmuje też strefy A, B i C. Jedziesz dalej? Dokup bilet od ostatniej stacji w strefie i powiedz o tym obsłudze pociągu przed tą stacją.' },
  { icon: 'train', title: 'Tylko pociągi KW i REGIO', text: 'Bilet obowiązuje w pociągach osobowych KW i REGIO POLREGIO — nie w pociągach innych przewoźników, np. PKP Intercity.' },
  { icon: 'currency_exchange', title: 'Zwroty', text: 'Całkowicie niewykorzystany bilet oddasz w kasie przed pierwszym dniem ważności, z potrąceniem 20%. Biletu nie można wymienić ani przedłużyć, a za utracony nie ma zwrotu ani duplikatu. Przerwy w kursowaniu nie dają prawa do częściowego zwrotu.' },
  { icon: 'luggage', title: 'Rower, pies, bagaż', text: 'Dokupujesz osobno, według taryfy przewoźnika, którego pociągiem jedziesz.' },
]

const sources = [
  { title: 'Koleje Wielkopolskie: oferta BTK', href: 'https://koleje-wielkopolskie.com.pl/dla-pasazera/oferty-specjalne/bus-tramwaj-kolej/' },
  { title: 'POLREGIO: oferta BTK', href: 'https://polregio.pl/pl/oferty-i-promocje/oferty-regionalne/bus-tramwaj-kolej/' },
  { title: 'Warunki taryfowe BTK (PDF)', href: 'https://polregio.pl/media/27315/warunki-taryfowe-oferty-bus-tramwaj-kolej-wa%C5%BCne-od-01092025.pdf' },
  { title: 'Mapa stref BTK', href: 'https://koleje-wielkopolskie.com.pl/wp-content/uploads/2026/09/mapa-polaczen-BTK-12-2024-v2.webp' },
  { title: 'Cennik ZTM Poznań', href: 'https://www.ztm.poznan.pl/pl/cennik/' },
]
</script>

<template>
  <div class="page-narrow">
    <header class="intro">
      <span class="intro-ic"><v-icon icon="commute" size="32" /></span>
      <div class="d-grid">
        <h1 class="text-headline-small">Bus-Tramwaj-Kolej</h1>
        <p class="text-body-large muted">Jeden bilet miesięczny na pociągi KW i POLREGIO oraz autobusy i tramwaje ZTM w Poznaniu.</p>
        <span class="tag tag-neutral"><v-icon icon="event" />Ceny od {{ TARIFF_DATE }}</span>
      </div>
    </header>

    <!-- Kalkulator -->
    <section aria-labelledby="calc-title">
      <v-card color="surface-container-low">
        <v-card-text class="calc">
          <div class="d-grid inputs">
            <h2 id="calc-title" class="text-title-large">Ile zapłacę?</h2>

            <v-autocomplete
              v-model="station"
              :items="ALL_STATIONS"
              item-title="name"
              item-value="name"
              :custom-filter="filterStation"
              label="Skąd dojeżdżasz do Poznania?"
              prepend-inner-icon="signpost"
              placeholder="np. Swarzędz, Gniezno"
              clearable
              auto-select-first
              hide-details
              no-data-text="Tej stacji nie ma w ofercie BTK."
              class="w-100"
            >
              <template #item="{ props: itemProps, item }">
                <v-list-item v-bind="itemProps">
                  <template #append><span class="tag tag-neutral">Strefa {{ item.zone }}</span></template>
                </v-list-item>
              </template>
            </v-autocomplete>

            <div class="w-100">
              <p class="text-label-large mb-1">Strefa kolejowa</p>
              <v-chip-group v-model="rail" selected-class="chip-on" column aria-label="Strefa kolejowa">
                <v-chip v-for="z in RAIL_ZONES" :key="z" :value="z" variant="outlined" filter class="zone-chip">{{ z }}</v-chip>
              </v-chip-group>
            </div>

            <template v-if="rail && rail !== 'A'">
              <div class="w-100">
                <p class="text-label-large mb-1">Autobusy i tramwaje ZTM</p>
                <v-chip-group v-model="ztm" mandatory selected-class="chip-on" column aria-label="Strefa ZTM">
                  <v-chip v-for="z in ztmOptions(rail)" :key="z" :value="z" variant="outlined" filter>{{ z }}</v-chip>
                </v-chip-group>
                <p class="text-body-small muted">{{ ztmHints[ztm] }}</p>
              </div>

              <v-switch
                v-if="extraKey"
                v-model="withExtra"
                :label="EXTRAS[extraKey].label"
                :messages="EXTRAS[extraKey].hint"
                color="primary"
                inset
                density="compact"
                class="w-100"
              />

              <div class="w-100">
                <p class="text-label-large mb-1">Rodzaj biletu</p>
                <v-btn-toggle v-model="discount" mandatory variant="outlined" divided density="comfortable" aria-label="Rodzaj biletu" class="seg">
                  <v-btn v-for="d in DISCOUNTS" :key="d.value" :value="d.value" :prepend-icon="discount === d.value ? 'check' : undefined">{{ d.label }}</v-btn>
                </v-btn-toggle>
                <p class="text-body-small muted mt-1">{{ discountInfo.who }}</p>
              </div>
            </template>
          </div>

          <div class="result" :class="{ empty: price === null }" aria-live="polite">
            <template v-if="price !== null && rail">
              <span class="text-label-large">Bilet miesięczny</span>
              <span class="price tnum">{{ formatPrice(price) }}</span>
              <ul class="covers text-body-medium">
                <li><v-icon icon="train" />Pociągi w strefach {{ railCoverage(rail) }}</li>
                <li><v-icon icon="tram" />ZTM Poznań: strefa {{ ztm }}</li>
                <li v-if="extra"><v-icon icon="directions_bus" />{{ extra === 'gniezno' ? 'MPK Gniezno' : 'Przewozy gminne w Czempiniu' }}</li>
              </ul>
            </template>
            <template v-else-if="rail === 'A'">
              <v-icon icon="contactless" size="32" />
              <p class="text-title-medium">W strefie A nie ma biletu BTK</p>
              <p class="text-body-medium">Na przejazdy po Poznaniu i do Kiekrza wystarczy bilet okresowy ZTM ze strefą A. Szczegóły niżej.</p>
            </template>
            <template v-else>
              <v-icon icon="confirmation_number" size="32" />
              <p class="text-body-medium">Wybierz stację albo strefę, a pokażemy cenę biletu.</p>
            </template>
          </div>
        </v-card-text>
      </v-card>
    </section>

    <!-- Poznań bez BTK -->
    <section class="mt-6" aria-labelledby="peka-title">
      <v-card color="secondary-container" variant="flat">
        <v-card-text class="peka">
          <v-icon icon="contactless" size="28" />
          <div class="d-grid">
            <h2 id="peka-title" class="text-title-medium">Jeździsz tylko po Poznaniu?</h2>
            <p class="text-body-medium">
              Bilet okresowy ZTM ze strefą A — na karcie PEKA, w aplikacji PEKA albo na legitymacji ELS, ELD lub ELNA — działa też
              w pociągach KW i POLREGIO między stacjami w Poznaniu oraz Kiekrzem. Dziecko od 4 lat do 30 września roku, w którym kończy 7 lat,
              jedzie wtedy z tobą za darmo (weź dokument potwierdzający wiek).
            </p>
          </div>
        </v-card-text>
      </v-card>
    </section>

    <!-- Cennik -->
    <section class="mt-8" aria-labelledby="prices-title">
      <div class="section-head flex-wrap">
        <h2 id="prices-title" class="text-title-large">Cennik</h2>
        <v-btn-toggle v-model="discount" mandatory variant="outlined" divided density="compact" aria-label="Rodzaj biletu w cenniku">
          <v-btn v-for="d in DISCOUNTS" :key="d.value" :value="d.value">{{ d.label }}</v-btn>
        </v-btn-toggle>
      </div>
      <p class="text-body-medium muted mb-3">Ceny biletu miesięcznego w złotych. Wiersz to strefa kolejowa, kolumna — strefa ZTM. Dotknij ceny, żeby ją wybrać.</p>
      <v-card color="surface-container-low">
        <v-table class="prices" density="comfortable">
          <thead>
            <tr>
              <th scope="col">Kolej <span class="muted">/ ZTM</span></th>
              <th v-for="z in ZTM_ZONES" :key="z" scope="col" class="num">{{ z }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in FARES" :key="row.rail + (row.extra ?? '')">
              <th scope="row">
                <span class="zone-name">{{ row.rail }}</span>
                <span class="text-body-small muted d-block">{{ rowNote(row) }}</span>
              </th>
              <td
                v-for="z in ZTM_ZONES"
                :key="z"
                class="num tnum"
                :class="{ sel: isSelected(row, z), na: !row.prices[z] }"
                :tabindex="row.prices[z] ? 0 : undefined"
                @click="pick(row, z)"
                @keydown.enter="pick(row, z)"
              >{{ cell(row, z) }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </section>

    <!-- Strefy -->
    <section class="mt-8" aria-labelledby="zones-title">
      <div class="section-head"><h2 id="zones-title" class="text-title-large">Strefy</h2></div>
      <p class="text-body-medium muted mb-3">Każda strefa obejmuje wszystkie niższe — bilet na strefę D ważny jest też w A, B i C.</p>
      <div class="zones">
        <div>
          <h3 class="text-title-small mb-2">Kolej (KW i POLREGIO)</h3>
          <v-expansion-panels variant="accordion" bg-color="surface-container-low">
            <v-expansion-panel v-for="z in RAIL_ZONES" :key="z">
              <v-expansion-panel-title>
                <span class="zone-badge">{{ z }}</span>
                <span class="muted text-body-medium">{{ z === 'A' ? 'Poznań i Kiekrz' : `${RAIL_STATIONS[z].length} stacji` }}</span>
              </v-expansion-panel-title>
              <v-expansion-panel-text class="text-body-medium">
                {{ z === 'A' ? 'Wszystkie stacje w Poznaniu oraz Kiekrz: ' : '' }}{{ RAIL_STATIONS[z].join(', ') }}.
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
        <div>
          <h3 class="text-title-small mb-2">Autobusy i tramwaje ZTM Poznań</h3>
          <v-expansion-panels variant="accordion" bg-color="surface-container-low">
            <v-expansion-panel v-for="(places, z) in ZTM_PLACES" :key="z">
              <v-expansion-panel-title>
                <span class="zone-badge">{{ z }}</span>
                <span class="muted text-body-medium">{{ z === 'A' ? 'Poznań' : z === 'B' ? 'najbliższe okolice' : 'dalsze gminy' }}</span>
              </v-expansion-panel-title>
              <v-expansion-panel-text class="text-body-medium">{{ places }}</v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
          <p class="text-body-small muted mt-2">Strefy ZTM dotyczą tylko linii organizowanych przez ZTM Poznań.</p>
        </div>
      </div>
    </section>

    <!-- Zasady -->
    <section class="mt-8" aria-labelledby="rules-title">
      <div class="section-head"><h2 id="rules-title" class="text-title-large">Warto wiedzieć</h2></div>
      <div class="rules">
        <div v-for="r in rules" :key="r.title" class="rule">
          <span class="rule-ic"><v-icon :icon="r.icon" /></span>
          <div class="d-grid">
            <h3 class="text-title-small">{{ r.title }}</h3>
            <p class="text-body-medium muted">{{ r.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Gdzie kupić -->
    <section class="mt-8" aria-labelledby="buy-title">
      <div class="section-head"><h2 id="buy-title" class="text-title-large">Gdzie kupić</h2></div>
      <p class="text-body-medium mb-3">
        W kasach biletowych, u obsługi pociągu, w automatach POLREGIO i stacjonarnych automatach KW, w aplikacji KW apka,
        w BILKOM oraz w mPOLREGIO, KOLEO i e-podróżniku.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <v-btn variant="flat" color="secondary-container" append-icon="open_in_new" href="https://bilet.wielkopolskiebilety.pl/" target="_blank" rel="noopener">Bilety KW</v-btn>
        <v-btn variant="flat" color="secondary-container" append-icon="open_in_new" href="https://bilety.polregio.pl/" target="_blank" rel="noopener">Bilety POLREGIO</v-btn>
      </div>
    </section>

    <footer class="sources text-body-small muted">
      <p>
        Serwis nieoficjalny — wiążące są warunki taryfowe przewoźników. Ceny i strefy według stanu na {{ TARIFF_DATE }}.
      </p>
      <p class="links">
        <a v-for="s in sources" :key="s.href" :href="s.href" target="_blank" rel="noopener">{{ s.title }}</a>
      </p>
    </footer>
  </div>
</template>

<style scoped>
.intro { display: flex; align-items: center; gap: 16px; padding: 8px 0 24px; }
.intro-ic { display: grid; place-items: center; width: 64px; height: 64px; flex: none; border-radius: var(--kw-r-l); background: rgb(var(--v-theme-tertiary-container)); color: rgb(var(--v-theme-on-tertiary-container)); }
.d-grid { display: grid; gap: 8px; justify-items: start; }

.calc { display: grid; gap: 24px; grid-template-columns: minmax(0, 1fr) 280px; align-items: start; }
.inputs { gap: 16px; grid-template-columns: minmax(0, 1fr); justify-items: stretch; }
.zone-chip { min-width: 40px; justify-content: center; }
:deep(.chip-on) { background: rgb(var(--v-theme-secondary-container)); color: rgb(var(--v-theme-on-secondary-container)); border-color: transparent; }
.seg { max-width: 100%; }

.result {
  display: grid; gap: 8px; align-content: start; justify-items: start; min-height: 180px; padding: 20px; border-radius: var(--kw-r-l);
  background: rgb(var(--v-theme-primary-container)); color: rgb(var(--v-theme-on-primary-container));
}
.result.empty { background: rgb(var(--v-theme-surface-container-highest)); color: rgb(var(--v-theme-on-surface-variant)); }
.price { font-size: 44px; line-height: 52px; font-weight: 500; letter-spacing: -.02em; font-variation-settings: 'ROND' 100; }
.covers { display: grid; gap: 6px; margin: 4px 0 0; padding: 0; list-style: none; }
.covers li { display: flex; align-items: center; gap: 8px; }
.covers .v-icon { font-size: 20px; }

.peka { display: flex; gap: 16px; align-items: flex-start; color: rgb(var(--v-theme-on-secondary-container)); }
.peka > .v-icon { flex: none; margin-top: 2px; }

.prices { background: transparent; }
.prices th, .prices td { white-space: nowrap; }
.prices .num { text-align: right; }
.prices tbody th { font-weight: 400; text-align: left; }
.zone-name { font-weight: 500; }
.prices td:not(.na) { cursor: pointer; }
.prices td:not(.na):hover { background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 8%, transparent); }
.prices td:focus-visible { outline: 3px solid rgb(var(--v-theme-secondary)); outline-offset: -3px; }
.prices td.na { color: rgb(var(--v-theme-on-surface-variant)); opacity: .6; }
.prices td.sel { background: rgb(var(--v-theme-primary-container)); color: rgb(var(--v-theme-on-primary-container)); font-weight: 600; }

.zones { display: grid; gap: 24px; grid-template-columns: 1fr 1fr; align-items: start; }
.zone-badge {
  display: inline-grid; place-items: center; width: 32px; height: 32px; margin-right: 12px; border-radius: 50%; font-weight: 600;
  background: rgb(var(--v-theme-surface-container-highest)); color: rgb(var(--v-theme-on-surface));
}

.rules { display: grid; gap: 16px 24px; grid-template-columns: 1fr 1fr; }
.rule { display: flex; gap: 16px; align-items: flex-start; }
.rule-ic {
  display: grid; place-items: center; width: 40px; height: 40px; flex: none; border-radius: var(--kw-r-m);
  background: rgb(var(--v-theme-surface-container-highest)); color: rgb(var(--v-theme-on-surface-variant));
}
.rule .d-grid { gap: 4px; }

.sources { display: grid; gap: 8px; margin-top: 40px; padding-top: 16px; border-top: 1px solid rgb(var(--v-theme-outline-variant)); }
.sources .links { display: flex; flex-wrap: wrap; gap: 4px 16px; }
.sources a { color: rgb(var(--v-theme-primary)); }

@media (max-width: 839px) {
  .calc { grid-template-columns: minmax(0, 1fr); }
  .zones, .rules { grid-template-columns: minmax(0, 1fr); }
  .price { font-size: 36px; line-height: 44px; }
  .prices :is(th, td) { padding: 0 6px !important; font-size: 13px; }
  .prices :is(th, td):first-child { padding-left: 12px !important; }
  .prices :is(th, td):last-child { padding-right: 10px !important; }
}
</style>
