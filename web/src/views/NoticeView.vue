<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import TrainChip from '@/components/TrainChip.vue'
import { useNotices } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { ago, clock, dateTime, dayLabel } from '@/utils/format'
import { noticeIcon, noticeLabel } from '@/utils/notices'

const route = useRoute()
const notices = useNotices()
const ui = useUi()
const notice = computed(() => notices.list.find((n) => String(n.id) === route.params.id) ?? null)
const now = ref(Date.now())
const timer = window.setInterval(() => (now.value = Date.now()), 60_000)
onBeforeUnmount(() => window.clearInterval(timer))

watchEffect(() => {
  if (notice.value) document.title = `${notice.value.title} · Infoportal`
})

const facts = computed(() => {
  const n = notice.value
  if (!n) return []
  return [
    { icon: 'route', label: 'Dotyczy', value: n.line },
    ...(n.startsAt ? [{ icon: 'schedule', label: 'Od', value: `${dayLabel(n.startsAt)}, ${clock(n.startsAt)}` }] : []),
    ...(n.endsAt ? [{ icon: 'event', label: 'Ważne do', value: `${dayLabel(n.endsAt)}, ${clock(n.endsAt)}` }] : []),
    { icon: 'update', label: 'Aktualizacja', value: ago(n.updatedAt, now.value), title: dateTime(n.updatedAt) },
  ]
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
  <div class="page-narrow notice-page">
    <div>
      <v-btn variant="text" prepend-icon="arrow_back" class="ml-n2" :to="{ name: 'notices' }">Wszystkie komunikaty</v-btn>
    </div>

    <v-skeleton-loader v-if="!notices.loaded" type="article" class="skel" />
    <div v-else-if="!notice" class="empty">
      <span class="empty-ic"><v-icon icon="campaign" size="32" /></span>
      <h1 class="text-title-large">Ten komunikat nie jest już aktualny</h1>
      <p class="text-body-medium muted">Mógł wygasnąć albo zostać usunięty. Aktualne utrudnienia znajdziesz na liście komunikatów.</p>
      <v-btn variant="flat" color="secondary-container" :to="{ name: 'notices' }" class="mt-2">Aktualne komunikaty</v-btn>
    </div>

    <article v-else class="detail">
      <header class="hero" :class="notice.severity">
        <span class="badge"><v-icon :icon="noticeIcon[notice.severity]" size="18" />{{ noticeLabel[notice.severity] }}</span>
        <h1 class="text-headline-small">{{ notice.title }}</h1>
      </header>

      <dl class="facts">
        <div v-for="f in facts" :key="f.label" class="fact">
          <span class="fact-ic"><v-icon :icon="f.icon" size="20" /></span>
          <div class="min-w-0">
            <dt class="text-label-medium muted">{{ f.label }}</dt>
            <dd class="text-body-large" :title="f.title">{{ f.value }}</dd>
          </div>
        </div>
      </dl>

      <section class="card">
        <p class="text-body-large body">{{ notice.body }}</p>
      </section>

      <section v-if="notice.trains.length" class="card trains">
        <h2 class="text-title-small">{{ notice.trains.length === 1 ? 'Pociąg, którego dotyczy' : 'Pociągi, których dotyczy' }}</h2>
        <p class="text-body-small muted">Kliknij numer, żeby zobaczyć trasę i aktualne opóźnienie.</p>
        <div class="d-flex flex-wrap ga-2">
          <TrainChip v-for="n in notice.trains" :key="n" :number="n" />
        </div>
      </section>

      <div class="d-flex flex-wrap ga-2">
        <v-btn variant="flat" color="secondary-container" prepend-icon="share" @click="share">Udostępnij</v-btn>
      </div>
    </article>
  </div>
</template>

<style scoped>
.notice-page { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr); }
.detail { display: grid; gap: 12px; }
.skel { border-radius: var(--kw-r-l); }
.hero {
  --h-c: var(--v-theme-surface-container-high); --h-on: var(--v-theme-on-surface);
  display: grid; gap: 14px; justify-items: start; padding: 24px; border-radius: var(--kw-r-xl);
  background: rgb(var(--h-c)); color: rgb(var(--h-on));
}
.hero.danger { --h-c: var(--v-theme-error-container); --h-on: var(--v-theme-on-error-container); }
.hero.warning { --h-c: var(--v-theme-warning-container); --h-on: var(--v-theme-on-warning-container); }
.hero h1 { text-wrap: pretty; }
.badge {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px 4px 8px; border-radius: 999px;
  background: color-mix(in srgb, rgb(var(--h-on)) 12%, transparent); font-size: 13px; font-weight: 600; line-height: 20px;
}
.facts {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 4px 0; margin: 0; padding: 8px;
  border-radius: var(--kw-r-l); background: rgb(var(--v-theme-surface-container-low));
}
.fact { display: flex; align-items: center; gap: 12px; padding: 8px 12px; }
.fact dd { font-size: 15px; line-height: 22px; }
.fact-ic {
  flex: none; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%;
  background: rgb(var(--v-theme-secondary-container)); color: rgb(var(--v-theme-on-secondary-container));
}
.fact dd { margin: 0; overflow-wrap: anywhere; }
.card { display: grid; gap: 8px; padding: 20px 24px; border-radius: var(--kw-r-l); background: rgb(var(--v-theme-surface-container-low)); }
.trains { gap: 10px; }
.body { white-space: pre-line; text-wrap: pretty; }
.empty { display: grid; justify-items: center; gap: 8px; padding: 48px 24px; text-align: center; border-radius: var(--kw-r-l); background: rgb(var(--v-theme-surface-container-low)); }
.empty-ic { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; background: rgb(var(--v-theme-secondary-container)); color: rgb(var(--v-theme-on-secondary-container)); margin-bottom: 4px; }
@media (max-width: 480px) {
  .hero { padding: 20px 16px; }
  .card { padding: 16px; }
  .facts { padding: 4px; }
  .fact-ic { width: 36px; height: 36px; }
}
</style>
