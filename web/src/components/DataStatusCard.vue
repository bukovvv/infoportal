<script setup lang="ts">
import { computed } from 'vue'
import { useStatus } from '@/stores/data'
import { clock, plural } from '@/utils/format'

const store = useStatus()
const s = computed(() => store.status)
const rows = computed(() => {
  const st = s.value
  if (!st) return []
  const gps = st.live.gps
  const rt = st.live.rt
  const tt = st.timetable
  return [
    st.live.gpsEnabled === false
      ? {
          icon: 'route',
          title: 'Pozycje pociągów',
          text: `Wyliczane z rozkładu i opóźnień PKP PLK · ${st.live.trains} ${plural(st.live.trains, 'pociąg', 'pociągi', 'pociągów')} w ruchu`,
          ok: st.live.ok,
        }
      : {
          icon: 'satellite_alt',
          title: 'Pozycje GPS',
          text: gps?.ok ? `${st.live.gpsTrains} ${plural(st.live.gpsTrains, 'pociąg', 'pociągi', 'pociągów')} · ${gps.provider ?? ''}` : 'Chwilowo niedostępne — pokazujemy pozycje z rozkładu',
          ok: !!gps?.ok && st.live.ok,
        },
    {
      icon: 'schedule',
      title: 'Opóźnienia (PKP PLK)',
      text: rt?.ok ? `${rt.count} ${plural(rt.count, 'kurs', 'kursy', 'kursów')} z danymi na żywo` : 'Chwilowo niedostępne — pokazujemy godziny z rozkładu',
      ok: !!rt?.ok && st.live.ok,
    },
    {
      icon: 'event',
      title: 'Rozkład jazdy',
      text: tt.ok ? `Ważny do ${tt.validUntil?.split('-').reverse().join('.')} · aktualizowany codziennie` : 'Nieaktualny',
      ok: tt.ok && (tt.daysLeft ?? 0) > 3,
    },
    {
      icon: 'update',
      title: 'Ostatnie odświeżenie',
      text: st.live.generatedAt ? `${clock(st.live.generatedAt)} · dane odświeżane co minutę` : 'Brak danych na żywo',
      ok: st.live.ok,
    },
  ]
})
</script>

<template>
  <v-card color="surface-container-low" class="status-card">
    <v-skeleton-loader v-if="!s" type="list-item-avatar-two-line@4" color="transparent" />
    <v-list v-else bg-color="transparent" lines="two" aria-live="polite">
      <v-list-item v-for="r in rows" :key="r.title" :title="r.title" :subtitle="r.text">
        <template #prepend>
          <span class="lead"><v-icon :icon="r.icon" /></span>
        </template>
        <template #append>
          <span class="tag" :class="r.ok ? 'tag-ontime' : 'tag-delay'">{{ r.ok ? 'Działa' : 'Uwaga' }}</span>
        </template>
      </v-list-item>
    </v-list>
    <p v-if="s?.timetable.attribution?.length" class="text-body-small muted px-4 pb-4">Źródła: {{ s.timetable.attribution.join(' · ') }}{{ s.live.gpsEnabled ? ', Mapa BILKOM' : '' }}.</p>
  </v-card>
</template>

<style scoped>
.lead { display: grid; place-items: center; width: 40px; height: 40px; margin-right: 16px; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-surface-container-highest)); color: rgb(var(--v-theme-on-surface-variant)); }
</style>
