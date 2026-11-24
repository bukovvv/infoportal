<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useTheme } from 'vuetify'
import { ApiError } from '@/api/client'
import { useAdmin } from '@/stores/admin'

// Logowanie do panelu w stylu wersji 2.0 („Tarcza”): hasło, a przy włączonym 2FA drugi krok z kodem z aplikacji.
const admin = useAdmin()
const theme = useTheme()
const dark = computed(() => theme.global.current.value.dark)

const username = ref('')
const password = ref('')
const code = ref('')
const step = ref<'password' | 'code'>('password')
const recovery = ref(false)
const showPassword = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)
const locked = ref(false)
const codeInput = ref<HTMLInputElement | null>(null)

async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = null
  locked.value = false
  try {
    const res = await admin.login(username.value, password.value, step.value === 'code' ? code.value : undefined)
    if (res === 'code') {
      step.value = 'code'
      await nextTick()
      codeInput.value?.focus()
      return
    }
    password.value = ''
  } catch (e) {
    error.value = (e as Error).message
    locked.value = e instanceof ApiError && e.status === 429
    if (step.value === 'code') code.value = ''
  } finally {
    busy.value = false
  }
}

function back() {
  step.value = 'password'
  code.value = ''
  recovery.value = false
  error.value = null
}

function toggleRecovery() {
  recovery.value = !recovery.value
  code.value = ''
  error.value = null
  void nextTick(() => codeInput.value?.focus())
}

// 6 cyfr kodu z aplikacji wysyła się samo, bez klikania
function onCode() {
  if (!recovery.value) code.value = code.value.replace(/\D/g, '').slice(0, 6)
  if (!recovery.value && code.value.length === 6) void submit()
}
</script>

<template>
  <section class="tz" :class="{ ciemny: dark }">
    <div class="tz-in">
      <div class="tz-gl">
        <p class="tz-eyebrow">Panel administratora</p>
        <h1>{{ step === 'password' ? 'Zaloguj się' : 'Kod z aplikacji' }}</h1>
        <p v-if="step === 'code'" class="tz-dr">
          {{ recovery
            ? 'Wpisz jeden z kodów zapasowych pokazanych przy włączaniu kodu z aplikacji. Każdy działa tylko raz.'
            : 'Otwórz aplikację z kodami (Google Authenticator, Aegis…) i przepisz 6 cyfr dla zanimwyjdziesz.pl.' }}
        </p>
      </div>

      <p v-if="admin.session?.configured === false" class="tz-uwaga">
        Na serwerze nie ustawiono hasła administratora. Zobacz DEPLOYMENT.md.
      </p>

      <form class="tz-plyta" novalidate @submit.prevent="submit">
        <template v-if="step === 'password'">
          <label class="tz-pole">
            <span>Nazwa użytkownika</span>
            <input v-model="username" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required>
          </label>
          <label class="tz-pole">
            <span>Hasło</span>
            <input v-model="password" name="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" required>
            <button type="button" class="tz-oko" :aria-label="showPassword ? 'Ukryj hasło' : 'Pokaż hasło'" :aria-pressed="showPassword" @click="showPassword = !showPassword">
              <v-icon :icon="showPassword ? 'visibility_off' : 'visibility'" size="20" />
            </button>
          </label>
        </template>
        <label v-else class="tz-pole tz-kod" :class="{ zapas: recovery }">
          <span>{{ recovery ? 'Kod zapasowy' : 'Kod' }}</span>
          <input
            ref="codeInput" v-model="code" name="code" :inputmode="recovery ? 'text' : 'numeric'" autocomplete="one-time-code"
            :maxlength="recovery ? 9 : 6" :placeholder="recovery ? 'xxxx-xxxx' : '000000'" autocapitalize="none" spellcheck="false" @input="onCode"
          >
        </label>

        <p v-if="error" class="tz-blad" :class="{ blokada: locked }" role="alert">{{ error }}</p>

        <button type="submit" class="tz-glowny" :disabled="busy">
          <span v-if="busy" class="tz-krec" aria-hidden="true" />
          {{ busy ? 'Sprawdzamy…' : step === 'password' ? 'Zaloguj się' : 'Potwierdź' }}
        </button>
        <div v-if="step === 'code'" class="tz-wiersz">
          <button type="button" class="tz-tekstowy" @click="back"><v-icon icon="arrow_back" size="18" />Wróć</button>
          <button type="button" class="tz-tekstowy" @click="toggleRecovery">{{ recovery ? 'Mam telefon: kod z aplikacji' : 'Nie mam telefonu' }}</button>
        </div>
      </form>

      <ul class="tz-info">
        <li><v-icon icon="lock" size="16" />Sesja wygasa po 2 h bezczynności.</li>
        <li><v-icon icon="shield" size="16" />Po 5 błędnych próbach logowanie blokuje się na 15 min, każda kolejna blokada trwa dłużej.</li>
      </ul>
    </div>
  </section>
</template>

<style>
@font-face { font-family: 'Inter Tarcza'; font-style: normal; font-display: swap; font-weight: 100 900; src: url('@/assets/fonts/inter-latin-ext.woff2') format('woff2-variations'); unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF; }
@font-face { font-family: 'Inter Tarcza'; font-style: normal; font-display: swap; font-weight: 100 900; src: url('@/assets/fonts/inter-latin.woff2') format('woff2-variations'); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
</style>

<style scoped>
/* paleta i kształty z wersji 2.0 (server/v20/index.html) */
.tz {
  --papier: #FBFBFC; --plyta: #EFF1F4; --plyta-2: #E2E6EB; --kreska: #D5DAE1; --tusz: #14171C; --tusz-2: #5A626E;
  --akcja: #D2232A; --na-akcji: #FFFFFF; --akcja-tekst: #B81D24; --opoz: #9A5200; --opoz-tlo: #FBEBCF;
  min-height: calc(100dvh - 64px); background: var(--papier); color: var(--tusz);
  font-family: 'Inter Tarcza', system-ui, -apple-system, 'Segoe UI', sans-serif; letter-spacing: -0.005em;
  display: grid; place-items: start center; padding: clamp(32px, 9vh, 96px) 16px 48px; box-sizing: border-box;
}
.tz.ciemny {
  --papier: #0E1013; --plyta: #181B20; --plyta-2: #252930; --kreska: #343943; --tusz: #F1F3F6; --tusz-2: #A3ABB7;
  --akcja-tekst: #FF8084; --opoz: #F2B95C; --opoz-tlo: #3A2A0C;
}
.tz-in { width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 20px; animation: tz-in .35s cubic-bezier(.2, .9, .25, 1); }
.tz-gl { display: flex; flex-direction: column; gap: 6px; padding: 0 4px; }
.tz-eyebrow { margin: 0; font-size: 13px; font-weight: 600; color: var(--tusz-2); }
.tz h1 { margin: 0; font-size: 34px; line-height: 1.1; font-weight: 700; letter-spacing: -0.03em; }
.tz-dr { margin: 4px 0 0; font-size: 15px; line-height: 1.45; color: var(--tusz-2); }
.tz-plyta { background: var(--plyta); border-radius: 28px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.tz-pole { position: relative; display: flex; flex-direction: column; gap: 2px; padding: 10px 16px 8px; border-radius: 16px; background: var(--papier); cursor: text; transition: box-shadow .15s; }
.tz-pole:focus-within { box-shadow: inset 0 0 0 2px var(--tusz); }
.tz-pole > span { font-size: 12px; font-weight: 600; color: var(--tusz-2); }
.tz-pole input { all: unset; font: 600 17px/1.5 inherit; font-family: inherit; color: var(--tusz); width: 100%; min-width: 0; }
.tz-pole:has(.tz-oko) input { padding-right: 44px; }
.tz-oko { position: absolute; right: 8px; top: 50%; translate: 0 -50%; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; color: var(--tusz-2); background: none; border: 0; cursor: pointer; }
.tz-oko:hover { background: var(--plyta-2); color: var(--tusz); }
.tz-kod { padding: 12px 16px 14px; }
.tz-kod input { font-size: 34px; font-weight: 700; letter-spacing: .32em; font-variant-numeric: tabular-nums; text-align: center; padding-left: .32em; }
.tz-kod.zapas input { font-size: 26px; letter-spacing: .12em; padding-left: .12em; }
.tz-kod input::placeholder { color: var(--kreska); }
.tz-kod > span { text-align: center; }
.tz-glowny {
  height: 56px; border-radius: 28px; border: 0; background: var(--akcja); color: var(--na-akcji); font: 700 17px/1 inherit; font-family: inherit;
  display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; margin-top: 6px; transition: filter .15s, transform .12s;
}
.tz-glowny:hover { filter: brightness(1.08); }
.tz-glowny:active { transform: scale(.985); }
.tz-glowny:disabled { cursor: progress; filter: saturate(.7); }
.tz-krec { width: 18px; height: 18px; border-radius: 50%; border: 2.5px solid color-mix(in srgb, var(--na-akcji) 35%, transparent); border-top-color: var(--na-akcji); animation: tz-krec .7s linear infinite; }
.tz-wiersz { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.tz-tekstowy { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 12px; border-radius: 20px; border: 0; background: none; color: var(--tusz); font: 600 14px/1 inherit; font-family: inherit; cursor: pointer; }
.tz-tekstowy:hover { background: var(--plyta-2); }
.tz-blad { margin: 2px 4px 0; font-size: 14px; line-height: 1.4; font-weight: 600; color: var(--akcja-tekst); }
.tz-blad.blokada, .tz-uwaga { margin: 0; padding: 12px 16px; border-radius: 16px; background: var(--opoz-tlo); color: var(--opoz); font-size: 14px; line-height: 1.4; font-weight: 600; }
.tz-info { list-style: none; margin: 0; padding: 0 4px; display: flex; flex-direction: column; gap: 8px; font-size: 13px; line-height: 1.4; color: var(--tusz-2); }
.tz-info li { display: flex; gap: 8px; align-items: flex-start; }
.tz-info .v-icon { flex: none; margin-top: 1px; }
.tz :focus-visible { outline: 2px solid var(--tusz); outline-offset: 2px; }
.tz-pole input:focus-visible { outline: none; }
@keyframes tz-in { from { opacity: 0; transform: translateY(10px); } }
@keyframes tz-krec { to { transform: rotate(1turn); } }
@media (prefers-reduced-motion: reduce) { .tz-in, .tz-krec { animation: none; } }
</style>
