<script setup lang="ts">
// Zakładka Bus-Tramwaj-Kolej — dla pasażera: wpisz stację, zobacz cenę i gdzie kupić; szczegóły taryfy zwinięte niżej.
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { normalize } from '@/utils/format'
import {
  ALL_STATIONS, DISCOUNTS, btkStation, FARES, RAIL_STATIONS, RAIL_ZONES, TARIFF_DATE, ZTM_PLACES, ZTM_ZONES,
  farePrice, formatPrice, railCoverage, railZoneOf, ztmOptions,
  type Discount, type Extra, type FareRow, type ZtmZone,
} from '@/utils/btkTariff'

// ?stacja= z podpowiedzi na tablicy odjazdów i w wynikach wyszukiwania
const station = ref<string | null>(btkStation(useRoute().query.stacja as string | undefined)?.name ?? null)
const ztm = ref<ZtmZone>('A')
const discount = ref<Discount>('normal')
const extraChoice = ref<Extra | null>(null)

const rail = computed(() => (station.value ? railZoneOf(station.value) : null))
watch(rail, (zone) => {
  if (zone && !ztmOptions(zone).includes(ztm.value)) ztm.value = 'A'
})

// dodatek (MPK Gniezno / Czempiń) obowiązuje tylko w swojej strefie kolejowej
const extraKey = computed<Extra | null>(() => (rail.value === 'F' ? 'gniezno' : rail.value === 'D' ? 'czempin' : null))
const extra = computed<Extra | null>(() => (extraChoice.value && extraChoice.value === extraKey.value ? extraChoice.value : null))
const withExtra = computed({
  get: () => extra.value !== null,
  set: (on: boolean) => { extraChoice.value = on ? extraKey.value : null },
})
const price = computed(() => (rail.value ? farePrice(rail.value, ztm.value, discount.value, extra.value) : null))

const discountLabels: Record<Discount, string> = { normal: 'Normalny', u49: 'Uczeń −49%', u51: 'Student −51%' }
const ztmLabels: Record<ZtmZone, string> = { A: 'Tylko Poznań', 'A+B': 'Poznań i okolice', 'A+C': 'Poznań i dalsze gminy', 'A+B+C': 'Wszystkie strefy' }
const ztmHints: Record<ZtmZone, string> = {
  A: 'Autobusy i tramwaje w granicach Poznania.',
  'A+B': 'Też np. Luboń, Swarzędz, Suchy Las, Plewiska, Koziegłowy.',
  'A+C': 'Też np. Kórnik, Mosina, Tarnowo Podgórne, Dopiewo.',
  'A+B+C': 'Wszystkie linie ZTM Poznań.',
}
const ztmCover: Record<ZtmZone, string> = { A: 'Poznań', 'A+B': 'Poznań i okolice', 'A+C': 'Poznań i dalsze gminy', 'A+B+C': 'wszystkie strefy' }
const extraLabels: Record<Extra, string> = { gniezno: 'Dodaj autobusy MPK w Gnieźnie', czempin: 'Dodaj autobusy gminy Czempiń' }

const filterStation = (value: string, query: string) => normalize(value).includes(normalize(query))

const tableDiscount = ref<Discount>('normal')
const rowNote = (row: FareRow) => (row.extra === 'gniezno' ? '+ MPK Gniezno' : row.extra === 'czempin' ? '+ gm. Czempiń' : '')
const cell = (row: FareRow, z: ZtmZone) => {
  const tuple = row.prices[z]
  return tuple ? formatPrice(tuple[DISCOUNTS.findIndex((d) => d.value === tableDiscount.value)]).replace(/\s?zł$/, '') : '—'
}

const basics = [
  { icon: 'badge', text: 'Imienny — wpisz imię i nazwisko, miej dokument ze zdjęciem' },
  { icon: 'calendar_month', text: 'Ważny miesiąc od wybranego dnia' },
  { icon: 'layers', text: 'Obejmuje też wszystkie stacje bliżej Poznania' },
  { icon: 'train', text: 'Tylko pociągi KW i POLREGIO — nie Intercity' },
]

const moreRules = [
  'Kupisz go najwcześniej 30 dni przed pierwszym dniem ważności.',
  'Jedziesz dalej niż strefa biletu? Dokup bilet od ostatniej stacji w strefie i zgłoś to obsłudze przed tą stacją.',
  'Niewykorzystany bilet oddasz w kasie przed pierwszym dniem ważności — z potrąceniem 20%.',
  'Biletu nie można wymienić ani przedłużyć. Za zgubiony nie ma zwrotu ani duplikatu.',
  'Za odwołane pociągi i zmiany w komunikacji nie ma częściowego zwrotu.',
  'Rower, psa i bagaż dokupujesz osobno.',
  'Przy uldze miej przy sobie legitymację.',
]

const sources = [
  { title: 'Koleje Wielkopolskie', href: 'https://koleje-wielkopolskie.com.pl/dla-pasazera/oferty-specjalne/bus-tramwaj-kolej/' },
  { title: 'POLREGIO', href: 'https://polregio.pl/pl/oferty-i-promocje/oferty-regionalne/bus-tramwaj-kolej/' },
  { title: 'Warunki taryfowe (PDF)', href: 'https://polregio.pl/media/27315/warunki-taryfowe-oferty-bus-tramwaj-kolej-wa%C5%BCne-od-01092025.pdf' },
  { title: 'Mapa stref', href: 'https://koleje-wielkopolskie.com.pl/wp-content/uploads/2026/09/mapa-polaczen-BTK-12-2024-v2.webp' },
  { title: 'Cennik ZTM', href: 'https://www.ztm.poznan.pl/pl/cennik/' },
]
</script>

<template>
  <div class="page-narrow">
    <header class="intro">
      <h1 class="text-headline-small">Bus-Tramwaj-Kolej</h1>
      <p class="text-body-large muted">Jeden bilet miesięczny na pociąg do Poznania i komunikację miejską ZTM.</p>
    </header>

    <!-- Kalkulator -->
    <v-card color="surface-container-low" class="calc-card">
      <v-card-text class="calc">
          <v-autocomplete
            v-model="station"
            :items="ALL_STATIONS"
            item-title="name"
            item-value="name"
            :custom-filter="filterStation"
            label="Skąd dojeżdżasz?"
            prepend-inner-icon="signpost"
            placeholder="Wpisz stację, np. Swarzędz"
            clearable
            auto-select-first
            hide-details
            no-data-text="Tej stacji nie ma w ofercie BTK."
            class="field"
          />

        <div v-if="rail && rail !== 'A'" class="inputs">
            <div>
              <p class="text-label-large mb-1">Autobusy i tramwaje ZTM</p>
              <v-chip-group v-model="ztm" mandatory selected-class="chip-on" column aria-label="Strefa ZTM">
                <v-chip v-for="z in ztmOptions(rail)" :key="z" :value="z" variant="outlined" filter>{{ ztmLabels[z] }}</v-chip>
              </v-chip-group>
              <p class="text-body-small muted">{{ ztmHints[ztm] }}</p>
            </div>

            <div>
              <p class="text-label-large mb-1">Bilet</p>
              <v-chip-group v-model="discount" mandatory selected-class="chip-on" column aria-label="Rodzaj biletu">
                <v-chip v-for="d in DISCOUNTS" :key="d.value" :value="d.value" variant="outlined" filter>{{ discountLabels[d.value] }}</v-chip>
              </v-chip-group>
            </div>

            <v-switch v-if="extraKey" v-model="withExtra" :label="extraLabels[extraKey]" color="primary" inset density="compact" hide-details />
        </div>

        <div class="result" :class="{ empty: price === null }" aria-live="polite">
          <template v-if="price !== null && rail">
            <span class="text-label-large">Bilet miesięczny · strefa {{ rail }}</span>
            <span class="price tnum">{{ formatPrice(price) }}</span>
            <ul class="covers text-body-medium">
              <li><v-icon icon="train" />Pociągi: {{ station }} – Poznań</li>
              <li><v-icon icon="tram" />ZTM: {{ ztmCover[ztm] }}</li>
              <li v-if="extra"><v-icon icon="directions_bus" />{{ extra === 'gniezno' ? 'MPK Gniezno' : 'Autobusy gminy Czempiń' }}</li>
            </ul>
            <div class="buy">
              <v-btn variant="flat" color="primary" size="small" append-icon="open_in_new" href="https://bilet.wielkopolskiebilety.pl/" target="_blank" rel="noopener">Kup w KW</v-btn>
              <v-btn variant="outlined" size="small" append-icon="open_in_new" href="https://bilety.polregio.pl/" target="_blank" rel="noopener">POLREGIO</v-btn>
            </div>
            <p v-if="extra === 'czempin'" class="text-body-small">Ten wariant kupisz na razie tylko w kasach KW.</p>
          </template>
          <template v-else-if="rail === 'A'">
            <v-icon icon="contactless" size="32" />
            <p class="text-title-medium">Wystarczy bilet ZTM</p>
            <p class="text-body-medium">Po Poznaniu i do Kiekrza pojedziesz pociągiem na bilecie okresowym ZTM ze strefą A (PEKA, ELS).</p>
          </template>
          <template v-else>
            <v-icon icon="confirmation_number" size="32" />
            <p class="text-body-medium">Wpisz swoją stację — pokażemy cenę biletu.</p>
          </template>
        </div>
      </v-card-text>
    </v-card>

    <!-- Najważniejsze zasady -->
    <ul class="basics" aria-label="Najważniejsze zasady">
      <li v-for="b in basics" :key="b.icon"><span class="basic-ic"><v-icon :icon="b.icon" /></span><span class="text-body-medium">{{ b.text }}</span></li>
    </ul>

    <v-card color="secondary-container" variant="flat" class="peka">
      <v-card-text class="d-flex ga-3 align-center">
        <v-icon icon="contactless" />
        <span class="text-body-medium"><strong>Jeździsz tylko po Poznaniu?</strong> Bilet ZTM ze strefą A na PEKA działa też w pociągach KW i POLREGIO w Poznaniu.</span>
      </v-card-text>
    </v-card>

    <!-- Szczegóły — zwinięte -->
    <h2 class="text-title-medium details-title">Szczegóły</h2>
    <v-expansion-panels variant="accordion" bg-color="surface-container-low">
      <v-expansion-panel>
        <v-expansion-panel-title><v-icon icon="payments" class="mr-3" />Pełny cennik</v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-chip-group v-model="tableDiscount" mandatory selected-class="chip-on" aria-label="Rodzaj biletu w cenniku" class="mb-2">
            <v-chip v-for="d in DISCOUNTS" :key="d.value" :value="d.value" variant="outlined" size="small" filter>{{ discountLabels[d.value] }}</v-chip>
          </v-chip-group>
          <v-table class="prices" density="compact">
            <thead>
              <tr>
                <th scope="col">Strefa <span class="muted">/ ZTM</span></th>
                <th v-for="z in ZTM_ZONES" :key="z" scope="col" class="num">{{ z }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in FARES" :key="row.rail + (row.extra ?? '')">
                <th scope="row">{{ row.rail }}<span v-if="row.extra" class="text-body-small muted d-block">{{ rowNote(row) }}</span></th>
                <td v-for="z in ZTM_ZONES" :key="z" class="num tnum" :class="{ na: !row.prices[z] }">{{ cell(row, z) }}</td>
              </tr>
            </tbody>
          </v-table>
          <p class="text-body-small muted mt-2">Ceny w zł za miesiąc, od {{ TARIFF_DATE }}. ZTM: A — Poznań, B — najbliższe gminy, C — dalsze gminy.</p>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel>
        <v-expansion-panel-title><v-icon icon="train" class="mr-3" />Stacje w strefach</v-expansion-panel-title>
        <v-expansion-panel-text>
          <dl class="zones">
            <template v-for="z in RAIL_ZONES" :key="z">
              <dt><span class="zone-badge">{{ z }}</span></dt>
              <dd class="text-body-medium">{{ z === 'A' ? 'Wszystkie stacje w Poznaniu oraz Kiekrz' : RAIL_STATIONS[z].join(', ') }}<span class="muted"> · pociągi {{ railCoverage(z) }}</span></dd>
            </template>
          </dl>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel>
        <v-expansion-panel-title><v-icon icon="tram" class="mr-3" />Miejscowości w strefach ZTM</v-expansion-panel-title>
        <v-expansion-panel-text>
          <dl class="zones">
            <template v-for="(places, z) in ZTM_PLACES" :key="z">
              <dt><span class="zone-badge">{{ z }}</span></dt>
              <dd class="text-body-medium">{{ places }}</dd>
            </template>
          </dl>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel>
        <v-expansion-panel-title><v-icon icon="info" class="mr-3" />Zwroty i pozostałe zasady</v-expansion-panel-title>
        <v-expansion-panel-text>
          <ul class="rules text-body-medium">
            <li v-for="r in moreRules" :key="r">{{ r }}</li>
            <li>Autobusy MPK w Gnieźnie dołączysz tylko do biletu na strefę F, a autobusy gminy Czempiń — tylko do strefy D.</li>
          </ul>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <footer class="sources text-body-small muted">
      <span>Serwis nieoficjalny — wiążące są warunki przewoźników. Źródła:</span>
      <a v-for="s in sources" :key="s.href" :href="s.href" target="_blank" rel="noopener">{{ s.title }}</a>
    </footer>
  </div>
</template>

<style scoped>
.intro { display: grid; gap: 4px; padding: 8px 0 20px; }

.calc { display: grid; gap: 20px 24px; grid-template-columns: minmax(0, 1fr) 280px; grid-template-areas: 'field result' 'opts result'; align-items: start; }
.calc .field { grid-area: field; }
.calc .inputs { grid-area: opts; }
.calc .result { grid-area: result; }
.inputs { display: grid; gap: 20px; grid-template-columns: minmax(0, 1fr); align-content: start; }
:deep(.chip-on) { background: rgb(var(--v-theme-secondary-container)); color: rgb(var(--v-theme-on-secondary-container)); border-color: transparent; }

.result {
  display: grid; gap: 8px; align-content: start; justify-items: start; min-height: 180px; padding: 20px; border-radius: var(--kw-r-l);
  background: rgb(var(--v-theme-primary-container)); color: rgb(var(--v-theme-on-primary-container));
}
.result.empty { min-height: 0; background: rgb(var(--v-theme-surface-container-highest)); color: rgb(var(--v-theme-on-surface-variant)); }
.details-title { margin: 32px 0 12px; }
.price { font-size: 44px; line-height: 52px; font-weight: 800; letter-spacing: -.01em; }
.covers { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.covers li { display: flex; align-items: center; gap: 8px; }
.covers .v-icon { font-size: 20px; }
.buy { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }

.basics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 24px; margin: 24px 0 16px; padding: 0; list-style: none; }
.basics li { display: flex; align-items: center; gap: 12px; }
.basic-ic {
  display: grid; place-items: center; width: 40px; height: 40px; flex: none; border-radius: var(--kw-r-m);
  background: rgb(var(--v-theme-surface-container-highest)); color: rgb(var(--v-theme-on-surface-variant));
}

.peka { color: rgb(var(--v-theme-on-secondary-container)); }

.prices { background: transparent; }
.prices th, .prices td { white-space: nowrap; }
.prices .num { text-align: right; }
.prices tbody th { font-weight: 600; text-align: left; }
.prices td.na { color: rgb(var(--v-theme-on-surface-variant)); opacity: .6; }

.zones { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px 12px; margin: 0; }
.zones dd { margin: 0; padding-top: 4px; }
.zone-badge {
  display: inline-grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; font-weight: 700;
  background: rgb(var(--v-theme-surface-container-highest)); color: rgb(var(--v-theme-on-surface));
}
.rules { display: grid; gap: 8px; margin: 0; padding-left: 20px; }

.sources { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 32px; padding-top: 16px; border-top: 1px solid rgb(var(--v-theme-outline-variant)); }
.sources a { color: rgb(var(--v-theme-primary)); }

@media (max-width: 839px) {
  .calc { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'field' 'result' 'opts'; }
  .result { min-height: 0; }
  .result.empty { display: flex; align-items: center; gap: 12px; padding: 16px; }
  .basics { grid-template-columns: minmax(0, 1fr); }
  .price { font-size: 36px; line-height: 44px; }
  .prices :is(th, td) { padding: 0 6px !important; font-size: 13px; }
  .prices :is(th, td):first-child { padding-left: 4px !important; }
  :deep(.v-expansion-panel-text__wrapper) { padding: 4px 12px 16px; }
}
</style>
