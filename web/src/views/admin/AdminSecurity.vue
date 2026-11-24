<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { AdminSecurity } from '@/api/types'
import { useAdmin } from '@/stores/admin'

// Zabezpieczenia konta admina: kod z aplikacji (2FA) z kodami zapasowymi i „Wyloguj wszędzie”.
const admin = useAdmin()
const status = ref<AdminSecurity | null>(null)
const error = ref<string | null>(null)
const busy = ref(false)

const setup = ref<{ secret: string; uri: string } | null>(null)
const code = ref('')
const recoveryCodes = ref<string[] | null>(null)
const disabling = ref(false)
const confirmLogout = ref(false)
const copied = ref<string | null>(null)

const keyGroups = computed(() => setup.value?.secret.match(/.{1,4}/g)?.join(' ') ?? '')
const since = computed(() => status.value?.since ? new Date(status.value.since * 1000).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

async function run(fn: () => Promise<void>) {
  busy.value = true
  error.value = null
  try {
    await fn()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

onMounted(() => run(async () => { status.value = await admin.call(() => api.admin.security()) }))

const start = () => run(async () => {
  setup.value = await admin.call(() => api.admin.twoFactorSetup())
  code.value = ''
})
const enable = () => run(async () => {
  const res = await admin.call(() => api.admin.twoFactorEnable(code.value))
  recoveryCodes.value = res.recoveryCodes
  status.value = res
  setup.value = null
  code.value = ''
})
const disable = () => run(async () => {
  status.value = await admin.call(() => api.admin.twoFactorDisable(code.value))
  disabling.value = false
  code.value = ''
})
const logoutAll = () => run(() => admin.logout(true))

async function copy(text: string, what: string) {
  await navigator.clipboard?.writeText(text).catch(() => undefined)
  copied.value = what
  setTimeout(() => { if (copied.value === what) copied.value = null }, 2000)
}
</script>

<template>
  <section class="block" aria-labelledby="h-sec">
    <h1 id="h-sec" class="text-headline-medium font-weight-bold">Zabezpieczenia</h1>
    <p class="text-body-medium muted">
      Logowanie do panelu: hasło, a po włączeniu także kod z aplikacji w telefonie. Po 5 błędnych próbach z jednego adresu
      logowanie blokuje się na 15 minut, przy kolejnych seriach w ciągu doby na godzinę, a potem na dobę.
    </p>
    <v-alert v-if="error" color="error-container" icon="error" closable @click:close="error = null">{{ error }}</v-alert>
    <v-skeleton-loader v-if="!status" type="card" color="transparent" />

    <template v-else>
      <!-- kody zapasowe: pokazywane tylko raz, zaraz po włączeniu -->
      <v-card v-if="recoveryCodes" color="primary-container" class="pa-2">
        <v-card-item>
          <template #prepend><v-icon icon="key" /></template>
          <v-card-title>Zapisz kody zapasowe</v-card-title>
          <v-card-subtitle class="sub">Każdy działa raz, gdy nie masz przy sobie telefonu. Więcej ich nie pokażemy.</v-card-subtitle>
        </v-card-item>
        <v-card-text>
          <ul class="codes">
            <li v-for="c in recoveryCodes" :key="c">{{ c }}</li>
          </ul>
        </v-card-text>
        <v-card-actions class="flex-wrap ga-2 px-4 pb-4">
          <v-btn variant="flat" color="surface" prepend-icon="content_copy" @click="copy(recoveryCodes.join('\n'), 'kody')">{{ copied === 'kody' ? 'Skopiowane' : 'Kopiuj kody' }}</v-btn>
          <v-btn variant="text" @click="recoveryCodes = null">Gotowe, kody są zapisane</v-btn>
        </v-card-actions>
      </v-card>

      <v-card color="surface-container-low" class="pa-2">
        <v-card-item>
          <template #prepend><span class="lead" :class="{ on: status.twoFactor }"><v-icon :icon="status.twoFactor ? 'verified_user' : 'shield'" /></span></template>
          <v-card-title>Kod z aplikacji</v-card-title>
          <v-card-subtitle class="sub">
            {{ status.twoFactor ? `Włączony${since ? ` od ${since}` : ''}. Kodów zapasowych: ${status.recoveryLeft} z 8.` : 'Wyłączony. Do logowania wystarczy samo hasło.' }}
          </v-card-subtitle>
        </v-card-item>

        <v-card-text v-if="!status.twoFactor && !setup" class="text-body-medium">
          Po haśle panel zapyta o 6 cyfr z aplikacji w telefonie (Google Authenticator, Aegis, 1Password, Bitwarden…).
          Samo hasło wtedy nie wystarczy, nawet gdy ktoś je pozna.
        </v-card-text>
        <v-card-actions v-if="!status.twoFactor && !setup" class="px-4 pb-4">
          <v-btn variant="flat" color="primary" prepend-icon="shield" :loading="busy" @click="start">Włącz kod z aplikacji</v-btn>
        </v-card-actions>

        <!-- włączanie: klucz do aplikacji, potem kod na potwierdzenie -->
        <v-card-text v-if="setup" class="steps">
          <ol>
            <li>
              <b>Dodaj konto w aplikacji.</b>
              Na telefonie wystarczy przycisk poniżej. Na komputerze wybierz w aplikacji „Wpisz klucz” i przepisz:
              <div class="key">
                <code>{{ keyGroups }}</code>
                <v-btn variant="text" size="small" prepend-icon="content_copy" @click="copy(setup.secret, 'klucz')">{{ copied === 'klucz' ? 'Skopiowany' : 'Kopiuj' }}</v-btn>
              </div>
              <v-btn :href="setup.uri" variant="flat" color="secondary-container" prepend-icon="open_in_new" class="mt-2">Dodaj do aplikacji na tym telefonie</v-btn>
            </li>
            <li>
              <b>Wpisz kod, który pokazuje aplikacja.</b>
              <v-form class="code-row" @submit.prevent="enable">
                <v-text-field v-model="code" label="Kod (6 cyfr)" inputmode="numeric" autocomplete="one-time-code" maxlength="6" hide-details class="code-field" />
                <v-btn type="submit" variant="flat" color="primary" size="large" :loading="busy" :disabled="code.replace(/\D/g, '').length !== 6">Włącz</v-btn>
              </v-form>
            </li>
          </ol>
          <v-btn variant="text" class="mt-2" @click="setup = null">Anuluj</v-btn>
        </v-card-text>

        <template v-if="status.twoFactor">
          <v-card-text v-if="disabling" class="text-body-medium">
            Wpisz kod z aplikacji albo zapasowy, żeby wyłączyć. Inne sesje zostaną zalogowane.
            <v-form class="code-row mt-3" @submit.prevent="disable">
              <v-text-field v-model="code" label="Kod" autocomplete="one-time-code" maxlength="9" hide-details class="code-field" />
              <v-btn type="submit" variant="flat" color="error" size="large" :loading="busy" :disabled="!code.trim()">Wyłącz</v-btn>
              <v-btn variant="text" @click="disabling = false; code = ''">Anuluj</v-btn>
            </v-form>
          </v-card-text>
          <v-card-actions v-else class="px-4 pb-4">
            <v-btn variant="text" color="error" @click="disabling = true">Wyłącz kod z aplikacji</v-btn>
          </v-card-actions>
          <v-card-text v-if="!disabling" class="text-body-small muted pt-0">
            Zgubiony telefon i brak kodów zapasowych: na serwerze <code>php server/bin/admin-2fa.php --disable</code>.
          </v-card-text>
        </template>
      </v-card>

      <v-card color="surface-container-low" class="pa-2">
        <v-card-item>
          <template #prepend><span class="lead"><v-icon icon="devices" /></span></template>
          <v-card-title>Sesje</v-card-title>
          <v-card-subtitle class="sub">Sesja wygasa po 2 h bezczynności albo 12 h od zalogowania.</v-card-subtitle>
        </v-card-item>
        <v-card-text class="text-body-medium">
          Panel był otwarty na cudzym komputerze albo w dzienniku jest coś podejrzanego? Zakończ wszystkie sesje panelu, także tę.
        </v-card-text>
        <v-card-actions class="flex-wrap ga-2 px-4 pb-4">
          <template v-if="confirmLogout">
            <v-btn variant="flat" color="error" prepend-icon="logout" :loading="busy" @click="logoutAll">Tak, wyloguj wszędzie</v-btn>
            <v-btn variant="text" @click="confirmLogout = false">Anuluj</v-btn>
          </template>
          <v-btn v-else variant="flat" color="secondary-container" prepend-icon="logout" @click="confirmLogout = true">Wyloguj wszędzie</v-btn>
        </v-card-actions>
      </v-card>
    </template>
  </section>
</template>

<style scoped>
.block { display: grid; gap: 16px; max-width: 760px; }
.sub { white-space: normal; }
.lead { display: grid; place-items: center; width: 40px; height: 40px; margin-right: 8px; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-surface-container-highest)); color: rgb(var(--v-theme-on-surface-variant)); }
.lead.on { background: rgb(var(--v-theme-success-container)); color: rgb(var(--v-theme-on-success-container)); }
.codes { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
.codes li { font: 600 17px/1 ui-monospace, 'Cascadia Mono', Consolas, monospace; letter-spacing: .04em; padding: 12px; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-surface)); text-align: center; }
.steps ol { margin: 0; padding-left: 20px; display: grid; gap: 18px; }
.steps li b { display: block; margin-bottom: 4px; }
.key { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 8px; margin-top: 8px; }
.key code { font: 600 17px/1.4 ui-monospace, 'Cascadia Mono', Consolas, monospace; letter-spacing: .06em; padding: 8px 12px; border-radius: var(--kw-r-m); background: rgb(var(--v-theme-surface-container-highest)); word-break: break-all; }
.code-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
.code-field { flex: 0 1 200px; }
</style>
