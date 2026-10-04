<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import TrainChip from '@/components/TrainChip.vue'
import { useNotices } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { dateTime } from '@/utils/format'
import { noticeIcon, noticeLabel } from '@/utils/notices'

const route = useRoute()
const notices = useNotices()
const ui = useUi()
const notice = computed(() => notices.list.find((n) => String(n.id) === route.params.id) ?? null)

watchEffect(() => {
  if (notice.value) document.title = `${notice.value.title} · Infoportal KW`
})

async function share() {
  const n = notice.value
  if (!n) return
  const url = location.href
  try {
    if (navigator.share) {
      await navigator.share({ title: n.title, text: n.title, url })
      return
    }
    await navigator.clipboard.writeText(url)
    ui.notify('Skopiowano link do komunikatu.')
  } catch (e) {
    if ((e as Error).name !== 'AbortError') ui.notify('Nie udało się udostępnić. Skopiuj adres z paska przeglądarki.')
  }
}
</script>

<template>
  <div class="page-narrow">
    <v-btn variant="text" prepend-icon="arrow_back" class="mb-2 ml-n2" :to="{ name: 'notices' }">Wszystkie komunikaty</v-btn>
    <v-card color="surface-container-low">
      <v-skeleton-loader v-if="!notices.loaded" type="article" color="transparent" />
      <v-empty-state
        v-else-if="!notice"
        icon="campaign"
        title="Ten komunikat nie jest już aktualny"
        text="Mógł wygasnąć albo zostać usunięty. Aktualne utrudnienia znajdziesz na liście komunikatów."
      >
        <template #actions>
          <v-btn :to="{ name: 'notices' }">Aktualne komunikaty</v-btn>
        </template>
      </v-empty-state>
      <article v-else class="detail">
        <div class="d-flex align-center ga-3">
          <span class="ic" :class="notice.severity"><v-icon :icon="noticeIcon[notice.severity]" /></span>
          <span class="text-label-large">{{ noticeLabel[notice.severity] }}</span>
        </div>
        <h1 class="text-headline-small">{{ notice.title }}</h1>
        <dl class="meta text-body-medium">
          <dt><v-icon icon="location_on" size="20" />Dotyczy</dt>
          <dd>{{ notice.line }}</dd>
          <template v-if="notice.endsAt">
            <dt><v-icon icon="event" size="20" />Obowiązuje do</dt>
            <dd>{{ dateTime(notice.endsAt) }}</dd>
          </template>
          <dt><v-icon icon="update" size="20" />Aktualizacja</dt>
          <dd><time :datetime="notice.updatedAt">{{ dateTime(notice.updatedAt) }}</time></dd>
        </dl>
        <p class="text-body-large body">{{ notice.body }}</p>
        <section v-if="notice.trains.length" class="d-grid ga-2">
          <h2 class="text-title-small">{{ notice.trains.length === 1 ? 'Pociąg, którego dotyczy' : 'Pociągi, których dotyczy' }}</h2>
          <div class="d-flex flex-wrap ga-2">
            <TrainChip v-for="n in notice.trains" :key="n" :number="n" />
          </div>
        </section>
        <div>
          <v-btn variant="flat" color="secondary-container" prepend-icon="share" @click="share">Udostępnij</v-btn>
        </div>
      </article>
    </v-card>
  </div>
</template>

<style scoped>
.detail { display: grid; gap: 20px; padding: 24px; }
.ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: var(--kw-r-m); }
.ic.danger { background: rgb(var(--v-theme-error-container)); color: rgb(var(--v-theme-on-error-container)); }
.ic.warning { background: rgb(var(--v-theme-warning-container)); color: rgb(var(--v-theme-on-warning-container)); }
.ic.info { background: rgb(var(--v-theme-surface-container-highest)); color: rgb(var(--v-theme-on-surface-variant)); }
.meta { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px 16px; margin: 0; }
.meta dt { display: inline-flex; align-items: center; gap: 8px; color: rgb(var(--v-theme-on-surface-variant)); }
.meta dd { margin: 0; }
.body { white-space: pre-line; }
.d-grid { display: grid; }
@media (max-width: 480px) { .detail { padding: 20px 16px; } }
</style>
