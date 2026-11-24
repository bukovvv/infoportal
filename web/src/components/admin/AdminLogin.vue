<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useTheme } from 'vuetify'
import { ApiError } from '@/api/client'
import { useAdmin } from '@/stores/admin'
import foto from '@/assets/login-pociag.webp'
import fotoMaly from '@/assets/login-pociag-maly.webp'

// Logowanie do panelu w stylu wersji 2.0 („Tarcza”): zdjęcie pociągu na całym tle, formularz jako tablica odjazdów
// (żywy zegar, „odjazd do panelu”, przy kodzie z aplikacji „kontrola biletów”, przy blokadzie „wstrzymany”).
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

const now = ref(new Date())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 10_000) })
onUnmounted(() => clearInterval(timer))
const clock = computed(() => now.value.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }))
const status = computed(() => locked.value ? { t: 'wstrzymany', k: 'stop' } : step.value === 'code' ? { t: 'kontrola', k: 'kontrola' } : { t: 'na czas', k: 'ok' })

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
    <div class="tz-tlo" aria-hidden="true">
      <img :src="foto" :srcset="`${fotoMaly} 820w, ${foto} 1600w`" sizes="100vw" alt="" decoding="async" fetchpriority="high">
    </div>

    <div class="tz-in">
      <div class="tz-karta">
        <!-- tablica odjazdów: godzina, dokąd, stan -->
        <div class="tz-tablica">
          <time class="tz-godz">{{ clock }}</time>
          <span class="tz-kier">
            <small>{{ step === 'password' ? 'Odjazd do' : 'Kontrola biletów' }}</small>
            <b>{{ step === 'password' ? 'Panelu administratora' : recovery ? 'Kod zapasowy' : 'Kod z aplikacji' }}</b>
          </span>
          <span class="tz-stan" :class="status.k">{{ status.t }}</span>
        </div>

        <div class="tz-tresc">
          <div class="tz-gl">
            <h1>{{ step === 'password' ? 'Zaloguj się' : recovery ? 'Kod zapasowy' : 'Pokaż kod' }}</h1>
            <p v-if="step === 'code'" class="tz-dr">
              {{ recovery
                  ? 'Wpisz jeden z kodów zapasowych pokazanych przy włączaniu kodu z aplikacji. Każdy działa tylko raz.'
                  : 'Otwórz aplikację z kodami (Google Authenticator, Aegis…) i przepisz 6 cyfr dla zanimwyjdziesz.pl.' }}
            </p>
          </div>

          <p v-if="admin.session?.configured === false" class="tz-uwaga">
            Na serwerze nie ustawiono hasła administratora. Zobacz DEPLOYMENT.md.
          </p>

          <form class="tz-form" novalidate @submit.prevent="submit">
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
              <button type="button" class="tz-tekstowy" @click="toggleRecovery">{{ recovery ? 'Mam telefon' : 'Nie mam telefonu' }}</button>
            </div>
          </form>

          <p class="tz-info">
            <v-icon icon="lock" size="16" />Sesja wygasa po 2 h bezczynności.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* paleta i kształty z wersji 2.0 (server/v20/index.html) */
.tz {
  --papier: #FBFBFC; --plyta: #EFF1F4; --plyta-2: #E2E6EB; --kreska: #D5DAE1; --tusz: #14171C; --tusz-2: #5A626E;
  --akcja: #D2232A; --na-akcji: #FFFFFF; --akcja-tekst: #B81D24; --opoz: #9A5200; --opoz-tlo: #FBEBCF;
  --ok: #0E7A55; --tablica: #14171C;
  position: relative; overflow: hidden; isolation: isolate;
  min-height: calc(100dvh - 64px); background: var(--papier); color: var(--tusz);
  font-family: 'Inter Tarcza', system-ui, -apple-system, 'Segoe UI', sans-serif; letter-spacing: -0.005em;
  display: grid; align-items: center; justify-items: start; box-sizing: border-box; padding: 40px clamp(16px, 7vw, 120px);
}
.tz.ciemny {
  --papier: #0E1013; --plyta: #181B20; --plyta-2: #252930; --kreska: #343943; --tusz: #F1F3F6; --tusz-2: #A3ABB7;
  --akcja-tekst: #FF8084; --opoz: #F2B95C; --opoz-tlo: #3A2A0C; --ok: #5FD0A0; --tablica: #07080A;
}

/* zdjęcie na całym tle; z prawej przechodzi w kolor strony, żeby formularz był czytelny, a pociąg z lewej został widoczny */
.tz-tlo { position: absolute; inset: 0; z-index: -1; overflow: hidden; }
.tz-tlo img { width: 100%; height: 100%; object-fit: cover; object-position: 85% 85%; display: block; animation: tz-zoom 1.8s cubic-bezier(.2, .8, .2, 1) both; }
.tz-tlo::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(270deg, transparent 34%, color-mix(in srgb, var(--papier) 45%, transparent) 58%, color-mix(in srgb, var(--papier) 88%, transparent) 78%);
}

.tz-in { position: relative; width: 100%; max-width: 420px; animation: tz-in .5s .15s cubic-bezier(.2, .9, .25, 1) both; }
.tz-karta {
  border-radius: 32px; overflow: hidden; background: color-mix(in srgb, var(--plyta) 84%, transparent);
  backdrop-filter: blur(20px) saturate(1.3); -webkit-backdrop-filter: blur(20px) saturate(1.3);
  box-shadow: 0 24px 60px rgba(10, 12, 16, .22);
}

/* tablica odjazdów */
.tz-tablica { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 14px; padding: 14px 18px 14px 20px; background: var(--tablica); color: #F1F3F6; }
.tz-godz { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; line-height: 1; }
.tz-kier { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
.tz-kier small { font-size: 12px; font-weight: 600; color: #AEB6C2; }
.tz-kier b { font-size: 15px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tz-stan { font-size: 12px; font-weight: 700; padding: 5px 10px; border-radius: 999px; white-space: nowrap; transition: background .2s, color .2s; }
.tz-stan.ok { background: #12352A; color: #5FD0A0; }
.tz-stan.kontrola { background: #252930; color: #F1F3F6; }
.tz-stan.stop { background: #3A2A0C; color: #F2B95C; }

.tz-tresc { padding: 22px 20px 20px; display: flex; flex-direction: column; gap: 16px; }
.tz-gl { display: flex; flex-direction: column; gap: 6px; padding: 0 2px; }
.tz h1 { margin: 0; font-size: 32px; line-height: 1.1; font-weight: 700; letter-spacing: -0.03em; }
.tz-dr { margin: 0; font-size: 15px; line-height: 1.45; color: var(--tusz-2); }
.tz-form { display: flex; flex-direction: column; gap: 10px; }
.tz-pole { position: relative; display: flex; flex-direction: column; gap: 2px; padding: 10px 16px 8px; border-radius: 16px; background: var(--papier); cursor: text; transition: box-shadow .15s; }
.tz-pole:focus-within { box-shadow: inset 0 0 0 2px var(--tusz); }
.tz-pole > span { font-size: 12px; font-weight: 600; color: var(--tusz-2); }
.tz-pole input { all: unset; font: 600 17px/1.5 inherit; font-family: inherit; color: var(--tusz); width: 100%; min-width: 0; }
.tz-pole:has(.tz-oko) { padding-right: 56px; }
.tz-pole input:-webkit-autofill, .tz-pole input:-webkit-autofill:hover, .tz-pole input:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--tusz); caret-color: var(--tusz); -webkit-box-shadow: 0 0 0 1000px var(--papier) inset; transition: background-color 9999s;
}
.tz-pole input::selection { background: color-mix(in srgb, var(--tusz) 22%, transparent); }
.tz-oko { position: absolute; right: 8px; top: 50%; translate: 0 -50%; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; color: var(--tusz-2); background: none; border: 0; cursor: pointer; }
.tz-oko:hover { background: var(--plyta-2); color: var(--tusz); }
.tz-kod { padding: 12px 16px 14px; }
.tz-kod input { font-size: 34px; font-weight: 700; letter-spacing: .32em; font-variant-numeric: tabular-nums; text-align: center; padding-left: .32em; }
.tz-kod.zapas input { font-size: 26px; letter-spacing: .12em; padding-left: .12em; }
.tz-kod input::placeholder { color: var(--kreska); }
.tz-kod > span { text-align: center; }
.tz-glowny {
  height: 56px; border-radius: 28px; border: 0; background: var(--akcja); color: var(--na-akcji); font: 700 17px/1 inherit; font-family: inherit;
  display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; margin-top: 4px; transition: filter .15s, transform .12s;
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
.tz-info { margin: 0; padding: 12px 2px 0; border-top: 1px solid var(--kreska); display: flex; align-items: center; gap: 8px; font-size: 13px; line-height: 1.4; color: var(--tusz-2); }
.tz-info .v-icon { flex: none; }
.tz :focus-visible { outline: 2px solid var(--tusz); outline-offset: 2px; }
.tz-pole input:focus-visible { outline: none; }

/* telefon i wąskie okno (karta zasłoniłaby pociąg): zdjęcie u góry, karta wjeżdża na nie od dołu */
@media (max-width: 1099px) {
  .tz { display: block; justify-items: normal; padding: 0 0 32px; }
  .tz-tlo { position: relative; inset: auto; height: clamp(220px, 40vh, 360px); }
  .tz-tlo img { position: absolute; left: 0; bottom: 0; height: 120%; object-position: 70% 100%; }
  .tz-tlo::after { background: linear-gradient(180deg, transparent 55%, var(--papier)); }
  .tz-in { max-width: 480px; margin: -72px auto 0; padding: 0 12px; box-sizing: border-box; }
  .tz-karta { background: var(--plyta); backdrop-filter: none; -webkit-backdrop-filter: none; box-shadow: 0 -8px 30px rgba(10, 12, 16, .16); }
  .tz h1 { font-size: 28px; }
}
@media (max-width: 380px) {
  .tz-tablica { gap: 10px; padding: 12px 14px; }
  .tz-godz { font-size: 24px; }
}

@keyframes tz-zoom { from { transform: scale(1.08); opacity: .4; } }
@keyframes tz-in { from { opacity: 0; transform: translateY(16px); } }
@keyframes tz-krec { to { transform: rotate(1turn); } }
@media (prefers-reduced-motion: reduce) { .tz-in, .tz-krec, .tz-tlo img { animation: none; } }
</style>
