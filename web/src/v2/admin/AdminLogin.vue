<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { ApiError } from '@/api/client'
import foto from '@/assets/login-pociag.webp'
import fotoMaly from '@/assets/login-pociag-maly.webp'
import { useAdmin } from '@/stores/admin'

// Logowanie do panelu 2.0 („Tarcza”): z lewej zdjęcie Elfa KW jako jedyna ciemna płyta (duża godzina, data, hasło
// serwisu), z prawej formularz na płycie z polami Tarczy i jednym czerwonym przyciskiem. Na telefonie zdjęcie u góry.
// Bez kodu z aplikacji serwer odpowiada { twoFactor: true } — wtedy drugi krok wysyła hasło jeszcze raz z kodem.
const admin = useAdmin()

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
const codeFocused = ref(false)

const now = ref(new Date())
let timer = 0
onMounted(() => { timer = window.setInterval(() => { now.value = new Date() }, 10_000) })
onUnmounted(() => window.clearInterval(timer))
const clock = computed(() => now.value.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }))
const today = computed(() => now.value.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }))

const focusCode = () => void nextTick(() => codeInput.value?.focus())

async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = null
  locked.value = false
  try {
    const res = await admin.login(username.value, password.value, step.value === 'code' ? code.value : undefined)
    if (res === 'code') {
      step.value = 'code'
      focusCode()
      return
    }
    password.value = ''
  } catch (e) {
    error.value = (e as Error).message
    locked.value = e instanceof ApiError && e.status === 429
    if (step.value === 'code') {
      code.value = ''
      focusCode()
    }
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
  focusCode()
}

// 6 cyfr kodu z aplikacji wysyła się samo, bez klikania
function onCode(e: Event) {
  const v = (e.target as HTMLInputElement).value
  code.value = recovery.value ? v : v.replace(/\D/g, '').slice(0, 6)
  if (!recovery.value && code.value.length === 6) void submit()
}
</script>

<template>
  <div class="log-uklad">
    <!-- jedyna ciemna płyta: zdjęcie Elfa z godziną jak na tablicy -->
    <figure class="log-foto">
      <img :src="foto" :srcset="`${fotoMaly} 820w, ${foto} 1600w`" sizes="(min-width: 920px) 60vw, 100vw" alt="Elf Kolei Wielkopolskich (EN76) na zaśnieżonym torze" decoding="async" fetchpriority="high">
      <span class="log-podpis">Elf · Koleje Wielkopolskie</span>
      <figcaption class="log-czas">
        <span class="log-panel">Panel administratora</span>
        <time class="num log-godz">{{ clock }}</time>
        <span class="log-data">{{ today }}</span>
        <span class="log-motto">Już wiesz, jak pojedziesz.</span>
      </figcaption>
    </figure>

    <section class="logowanie" aria-labelledby="h-log">
      <div class="kol log-gl">
        <div class="log-kroki" aria-hidden="true">
          <span :class="{ on: step === 'password', done: step === 'code' }">1</span>
          <i />
          <span :class="{ on: step === 'code' }">2</span>
        </div>
        <h1 id="h-log">{{ step === 'password' ? 'Zaloguj się' : recovery ? 'Kod zapasowy' : 'Kod z aplikacji' }}</h1>
        <p class="dr">
          {{ step === 'password'
              ? 'Komunikaty dla pasażerów, stan źródeł i zabezpieczenia.'
              : recovery
                ? 'Wpisz jeden z kodów zapasowych pokazanych przy włączaniu kodu z aplikacji. Każdy działa tylko raz.'
                : 'Otwórz aplikację z kodami i przepisz 6 cyfr dla zanimwyjdziesz.pl.' }}
        </p>
      </div>

      <p v-if="admin.session?.configured === false" class="log-blad"><span class="kzn m utr" aria-hidden="true">!</span>Na serwerze nie ustawiono hasła administratora. Zobacz DEPLOYMENT.md.</p>

      <form class="plyta kol log-form" novalidate @submit.prevent="submit">
        <template v-if="step === 'password'">
          <label class="pole">
            <span>Nazwa użytkownika</span>
            <input v-model="username" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required>
          </label>
          <label class="pole log-haslo">
            <span>Hasło</span>
            <input v-model="password" name="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" required>
            <button type="button" class="kolo log-oko" :aria-label="showPassword ? 'Ukryj hasło' : 'Pokaż hasło'" :aria-pressed="showPassword" @click="showPassword = !showPassword">
              <v-icon :icon="showPassword ? 'visibility_off' : 'visibility'" size="20" />
            </button>
          </label>
        </template>

        <label v-else-if="recovery" class="pole">
          <span>Kod zapasowy</span>
          <input ref="codeInput" :value="code" name="code" autocomplete="one-time-code" maxlength="9" placeholder="xxxx-xxxx" autocapitalize="none" spellcheck="false" @input="onCode">
        </label>
        <!-- 6 okienek na cyfry; pod spodem jedno zwykłe pole (wklejanie, autouzupełnianie kodu z SMS-a/aplikacji) -->
        <label v-else class="log-kod" @click="focusCode">
          <span class="log-kod-et">Kod z aplikacji</span>
          <span class="log-cyfry" aria-hidden="true">
            <span v-for="i in 6" :key="i" class="num" :class="{ teraz: codeFocused && (code.length === i - 1 || (code.length === 6 && i === 6)) }">{{ code[i - 1] ?? '' }}</span>
          </span>
          <input
            ref="codeInput" :value="code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" aria-label="Kod z aplikacji, 6 cyfr"
            @input="onCode" @focus="codeFocused = true" @blur="codeFocused = false"
          >
        </label>

        <p v-if="error" class="log-blad" role="alert">
          <span class="kzn m" :class="locked ? 'pow' : 'utr'" aria-hidden="true">!</span>{{ error }}
        </p>

        <button type="submit" class="glowny" :disabled="busy">
          <span v-if="busy" class="log-krec" aria-hidden="true" />
          {{ busy ? 'Sprawdzamy…' : step === 'password' ? 'Zaloguj się' : 'Potwierdź' }}
        </button>
        <div v-if="step === 'code'" class="wiersz rozsun">
          <button type="button" class="adm-link" @click="back"><v-icon icon="arrow_back" size="18" />Wróć</button>
          <button type="button" class="adm-link" @click="toggleRecovery">{{ recovery ? 'Mam telefon' : 'Nie mam telefonu' }}</button>
        </div>
      </form>

      <p class="log-stopka"><v-icon icon="shield" size="18" />Po 5 błędnych próbach logowanie blokuje się na 15 minut, przy kolejnych seriach na godzinę, a potem na dobę.</p>
    </section>
  </div>
</template>

<style scoped>
.log-uklad { display: grid; gap: 20px; }
@media (min-width: 920px) {
  .log-uklad { grid-template-columns: minmax(0, 1.15fr) minmax(380px, 1fr); gap: 32px; align-items: stretch; min-height: min(660px, calc(100dvh - 120px)); margin-top: 4px; }
}

/* zdjęcie: przyciemnione od dołu, na nim godzina i hasło serwisu */
.log-foto { position: relative; margin: 0; border-radius: var(--r-l); overflow: hidden; background: #14171C; color: #F1F3F6; min-height: 260px; }
.log-foto img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 58% 50%; }
.log-foto::after { content: ''; position: absolute; inset: 0; background: linear-gradient(to top, rgba(14, 16, 19, .92) 0%, rgba(14, 16, 19, .55) 38%, rgba(14, 16, 19, 0) 70%); }
.log-podpis { position: absolute; z-index: 1; top: 16px; right: 16px; height: 28px; padding: 0 12px; border-radius: 14px; display: inline-flex; align-items: center; background: rgba(14, 16, 19, .6); font-size: 12px; font-weight: 600; backdrop-filter: blur(6px); }
.log-czas { position: absolute; z-index: 1; left: 0; right: 0; bottom: 0; padding: 24px 28px 28px; display: flex; flex-direction: column; }
.log-panel { align-self: flex-start; height: 26px; padding: 0 12px; border-radius: 13px; display: inline-flex; align-items: center; background: #D2232A; color: #fff; font-size: 12px; font-weight: 700; margin-bottom: 10px; }
.log-godz { font-size: 72px; line-height: 1; font-weight: 700; letter-spacing: -.04em; }
.log-data { font-size: 16px; font-weight: 600; color: #AEB6C2; margin-top: 6px; }
.log-data::first-letter { text-transform: uppercase; }
.log-motto { font-size: 15px; color: #F1F3F6; margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(255, 255, 255, .16); }
@media (max-width: 919px) {
  .log-foto { min-height: 0; height: 240px; }
  .log-czas { padding: 16px 20px 18px; }
  .log-godz { font-size: 48px; }
  .log-motto { display: none; }
}

/* formularz */
.logowanie { width: 100%; max-width: 460px; margin: 0 auto; display: flex; flex-direction: column; justify-content: center; gap: 16px; }
.log-gl { gap: 8px; }
.log-gl h1 { font-size: 36px; }
.log-kroki { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.log-kroki span { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: var(--plyta); color: var(--tusz-2); font-size: 13px; font-weight: 700; }
.log-kroki span.on { background: var(--tusz); color: var(--papier); }
.log-kroki span.done { background: var(--ok-tlo); color: var(--ok); }
.log-kroki i { width: 24px; height: 2px; border-radius: 1px; background: var(--kreska); }
.log-form { gap: 10px; padding: 12px; }
.log-haslo { position: relative; padding-right: 60px; }
.log-oko { position: absolute; right: 8px; top: 8px; background: var(--plyta); }
.log-oko:hover { background: var(--plyta-2); }
.log-blad { display: flex; align-items: center; gap: 10px; margin: 0; padding: 4px 4px; font-size: 14px; font-weight: 600; }
.log-stopka { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; line-height: 1.45; color: var(--tusz-2); padding: 0 8px; }
.log-stopka .v-icon { flex: none; margin-top: 1px; }

/* kod: sześć okienek */
.log-kod { position: relative; display: flex; flex-direction: column; gap: 8px; padding: 10px 12px 12px; border-radius: var(--r-m); background: var(--papier); cursor: text; }
.log-kod-et { font-size: 12px; font-weight: 600; color: var(--tusz-2); }
.log-cyfry { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; }
.log-cyfry span { height: 56px; border-radius: 14px; background: var(--plyta); display: grid; place-items: center; font-size: 26px; font-weight: 700; }
.log-cyfry span.teraz { box-shadow: inset 0 0 0 2px var(--tusz); }
.log-kod input { position: absolute; inset: 0; width: 100%; opacity: 0; border: 0; font-size: 16px; cursor: text; }

.glowny:disabled { opacity: .8; cursor: progress; }
.log-krec { width: 18px; height: 18px; border-radius: 50%; border: 2px solid currentColor; border-right-color: transparent; animation: log-krec .8s linear infinite; }
@keyframes log-krec { to { transform: rotate(360deg); } }
</style>
