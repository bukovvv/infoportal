<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { AdminSecurity } from '@/api/types'
import { useAdmin } from '@/stores/admin'

// Zabezpieczenia 2.0: ciemna płyta z tym, jak chronione jest konto, pod nią kod z aplikacji (2FA) i sesje.
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
  <header class="adm-gl"><div><h1>Zabezpieczenia</h1></div></header>

  <p v-if="error" class="plyta podp uwaga" role="alert">{{ error }}</p>
  <div v-if="!status" class="adm-laduje" aria-busy="true" />
  <div v-else class="zab">
    <div class="kol">
      <!-- jedyna ciemna płyta: jak chronione jest konto -->
      <section class="blok kol stan-konta" aria-labelledby="h-konto">
        <div class="wiersz" style="gap: 14px">
          <span class="kolo" :class="{ dobrze: status.twoFactor }" aria-hidden="true"><v-icon :icon="status.twoFactor ? 'verified_user' : 'shield'" /></span>
          <h2 id="h-konto">{{ status.twoFactor ? 'Konto chronią hasło i kod z aplikacji' : 'Konto chroni tylko hasło' }}</h2>
        </div>
        <dl class="fakty-zab">
          <div><dt>Kod z aplikacji</dt><dd>{{ status.twoFactor ? `włączony${since ? ` od ${since}` : ''}` : 'wyłączony' }}</dd></div>
          <div v-if="status.twoFactor"><dt>Kody zapasowe</dt><dd>{{ status.recoveryLeft }} z 8</dd></div>
          <div><dt>Sesja</dt><dd>wygasa po 2 h bezczynności albo 12 h od zalogowania</dd></div>
          <div><dt>Błędne hasło</dt><dd>po 5 próbach blokada na 15 min, potem na godzinę i na dobę</dd></div>
        </dl>
      </section>

      <!-- kody zapasowe: pokazywane tylko raz, zaraz po włączeniu -->
      <section v-if="recoveryCodes" class="plyta kol sekcja" aria-labelledby="h-kody">
        <h2 id="h-kody">Zapisz kody zapasowe</h2>
        <p class="dr">Każdy działa raz, gdy nie masz przy sobie telefonu. Więcej ich nie pokażemy.</p>
        <ul class="kody"><li v-for="c in recoveryCodes" :key="c" class="num">{{ c }}</li></ul>
        <div class="wiersz zawin" style="gap: 8px">
          <v-btn class="drugi-btn" prepend-icon="content_copy" @click="copy(recoveryCodes.join('\n'), 'kody')">{{ copied === 'kody' ? 'Skopiowane' : 'Kopiuj kody' }}</v-btn>
          <v-btn class="drugi-btn" @click="recoveryCodes = null">Gotowe, kody są zapisane</v-btn>
        </div>
      </section>
    </div>

    <div class="kol">
      <section class="plyta kol sekcja" aria-labelledby="h-2fa">
        <h2 id="h-2fa">Kod z aplikacji</h2>

        <template v-if="!status.twoFactor && !setup">
          <p>Po haśle panel zapyta o 6 cyfr z aplikacji w telefonie (Google Authenticator, Aegis, 1Password, Bitwarden…). Samo hasło wtedy nie wystarczy, nawet gdy ktoś je pozna.</p>
          <v-btn class="glowny-btn" prepend-icon="shield" :loading="busy" @click="start">Włącz kod z aplikacji</v-btn>
        </template>

        <!-- włączanie: klucz do aplikacji, potem kod na potwierdzenie -->
        <ol v-if="setup" class="kroki">
          <li>
            <span class="kolo krok" aria-hidden="true">1</span>
            <div class="kol" style="gap: 8px">
              <b>Dodaj konto w aplikacji</b>
              <span class="dr">Na telefonie wystarczy przycisk poniżej. Na komputerze wybierz w aplikacji „Wpisz klucz” i przepisz:</span>
              <div class="wiersz zawin" style="gap: 8px">
                <code class="klucz">{{ keyGroups }}</code>
                <button type="button" class="adm-link" @click="copy(setup.secret, 'klucz')"><v-icon icon="content_copy" size="16" />{{ copied === 'klucz' ? 'Skopiowany' : 'Kopiuj' }}</button>
              </div>
              <v-btn class="drugi-btn" :href="setup.uri" prepend-icon="open_in_new">Dodaj do aplikacji na tym telefonie</v-btn>
            </div>
          </li>
          <li>
            <span class="kolo krok" aria-hidden="true">2</span>
            <form class="kol" style="gap: 8px" @submit.prevent="enable">
              <b>Wpisz kod, który pokazuje aplikacja</b>
              <div class="wiersz zawin" style="gap: 8px">
                <v-text-field v-model="code" label="Kod (6 cyfr)" inputmode="numeric" autocomplete="one-time-code" maxlength="6" hide-details class="pole-kod" />
                <v-btn type="submit" class="glowny-btn" :loading="busy" :disabled="code.replace(/\D/g, '').length !== 6">Włącz</v-btn>
              </div>
            </form>
          </li>
          <li class="bez-kola"><button type="button" class="adm-link" @click="setup = null">Anuluj</button></li>
        </ol>

        <template v-if="status.twoFactor">
          <form v-if="disabling" class="kol" style="gap: 8px" @submit.prevent="disable">
            <p>Wpisz kod z aplikacji albo zapasowy, żeby wyłączyć. Inne sesje zostaną zalogowane.</p>
            <div class="wiersz zawin" style="gap: 8px">
              <v-text-field v-model="code" label="Kod" autocomplete="one-time-code" maxlength="9" hide-details class="pole-kod" />
              <v-btn type="submit" class="glowny-btn" :loading="busy" :disabled="!code.trim()">Wyłącz</v-btn>
              <v-btn class="drugi-btn" @click="disabling = false; code = ''">Anuluj</v-btn>
            </div>
          </form>
          <template v-else>
            <p>Włączony. Przy logowaniu panel pyta o kod z aplikacji; bez telefonu zadziała kod zapasowy.</p>
            <v-btn class="drugi-btn" @click="disabling = true">Wyłącz kod z aplikacji</v-btn>
            <p class="podp">Zgubiony telefon i brak kodów zapasowych: na serwerze <code>php server/bin/admin-2fa.php --disable</code>.</p>
          </template>
        </template>
      </section>

      <section class="plyta kol sekcja" aria-labelledby="h-sesje">
        <h2 id="h-sesje">Sesje</h2>
        <p>Panel był otwarty na cudzym komputerze albo w dzienniku jest coś podejrzanego? Zakończ wszystkie sesje panelu, także tę.</p>
        <div class="wiersz zawin" style="gap: 8px">
          <template v-if="confirmLogout">
            <v-btn class="glowny-btn" prepend-icon="logout" :loading="busy" @click="logoutAll">Tak, wyloguj wszędzie</v-btn>
            <v-btn class="drugi-btn" @click="confirmLogout = false">Anuluj</v-btn>
          </template>
          <v-btn v-else class="drugi-btn" prepend-icon="logout" @click="confirmLogout = true">Wyloguj wszędzie</v-btn>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.zab { display: grid; gap: 20px; align-items: start; }
@media (min-width: 920px) { .zab { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 28px; } }
.sekcja { gap: 12px; padding: 20px; }
.sekcja p { line-height: 1.5; }
.stan-konta { gap: 16px; padding: 24px; }
.stan-konta h2 { font-size: 22px; line-height: 1.25; }
.stan-konta .kolo { width: 52px; height: 52px; }
.stan-konta .kolo.dobrze { background: #5FD0A0; color: #0B2A1F; }
.fakty-zab { display: grid; margin: 0; }
.fakty-zab > div { display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 12px; padding: 10px 0; border-top: 1px solid var(--blok-tor); font-size: 14px; }
.fakty-zab dt { color: var(--na-bloku-2); }
.fakty-zab dd { margin: 0; font-weight: 600; }
.kody { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
.kody li { font: 600 17px/1 ui-monospace, 'Cascadia Mono', Consolas, monospace; letter-spacing: .04em; padding: 12px; border-radius: var(--r-m); background: var(--papier); text-align: center; }
.kroki { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px; }
.kroki li { display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: 12px; align-items: start; }
.kroki li.bez-kola { display: block; }
.kolo.krok { width: 36px; height: 36px; background: var(--papier); font-weight: 700; }
.klucz { font: 600 16px/1.4 ui-monospace, 'Cascadia Mono', Consolas, monospace; letter-spacing: .06em; padding: 8px 12px; border-radius: var(--r-s); background: var(--papier); word-break: break-all; }
.pole-kod { flex: 0 1 200px; }
</style>
