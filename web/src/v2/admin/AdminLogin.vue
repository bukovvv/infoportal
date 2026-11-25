<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { ApiError } from '@/api/client'
import { useAdmin } from '@/stores/admin'

// Logowanie do panelu 2.0: ciemna płyta z godziną i krokiem, pod nią pola i jeden czerwony przycisk.
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
const codeField = ref<{ focus: () => void } | null>(null)

const now = ref(new Date())
let timer = 0
onMounted(() => { timer = window.setInterval(() => { now.value = new Date() }, 10_000) })
onUnmounted(() => window.clearInterval(timer))
const clock = computed(() => now.value.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }))

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
      codeField.value?.focus()
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
  void nextTick(() => codeField.value?.focus())
}

// 6 cyfr kodu z aplikacji wysyła się samo, bez klikania
function onCode(v: string) {
  code.value = recovery.value ? v : v.replace(/\D/g, '').slice(0, 6)
  if (!recovery.value && code.value.length === 6) void submit()
}
</script>

<template>
  <section class="logowanie" aria-labelledby="h-log">
    <div class="blok log-blok">
      <div class="wiersz rozsun">
        <span class="dr">Panel administratora</span>
        <time class="num log-godz">{{ clock }}</time>
      </div>
      <h1 id="h-log">{{ step === 'password' ? 'Zaloguj się' : recovery ? 'Kod zapasowy' : 'Kod z aplikacji' }}</h1>
      <p class="dr">
        {{ step === 'password'
            ? 'Komunikaty, stan źródeł i zabezpieczenia zanimwyjdziesz.pl.'
            : recovery
              ? 'Wpisz jeden z kodów zapasowych pokazanych przy włączaniu kodu z aplikacji. Każdy działa tylko raz.'
              : 'Otwórz aplikację z kodami i przepisz 6 cyfr dla zanimwyjdziesz.pl.' }}
      </p>
    </div>

    <p v-if="admin.session?.configured === false" class="plyta podp uwaga">Na serwerze nie ustawiono hasła administratora. Zobacz DEPLOYMENT.md.</p>

    <form class="plyta kol log-form" novalidate @submit.prevent="submit">
      <template v-if="step === 'password'">
        <v-text-field v-model="username" label="Nazwa użytkownika" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" hide-details />
        <v-text-field
          v-model="password" label="Hasło" name="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" hide-details
          :append-inner-icon="showPassword ? 'visibility_off' : 'visibility'" @click:append-inner="showPassword = !showPassword"
        />
      </template>
      <v-text-field
        v-else ref="codeField" :model-value="code" :label="recovery ? 'Kod zapasowy' : 'Kod (6 cyfr)'" name="code" class="log-kod" hide-details
        :inputmode="recovery ? 'text' : 'numeric'" autocomplete="one-time-code" :maxlength="recovery ? 9 : 6" autocapitalize="none" spellcheck="false"
        @update:model-value="onCode"
      />

      <p v-if="error" class="podp uwaga" :class="{ 'log-stop': locked }" role="alert">{{ error }}</p>

      <v-btn type="submit" class="glowny-btn" block :loading="busy">{{ step === 'password' ? 'Zaloguj się' : 'Potwierdź' }}</v-btn>
      <div v-if="step === 'code'" class="wiersz rozsun">
        <button type="button" class="adm-link" @click="back"><v-icon icon="arrow_back" size="18" />Wróć</button>
        <button type="button" class="adm-link" @click="toggleRecovery">{{ recovery ? 'Mam telefon' : 'Nie mam telefonu' }}</button>
      </div>
    </form>
    <p class="podp log-stopka">Po 5 błędnych próbach logowanie blokuje się na 15 minut, przy kolejnych seriach na godzinę, a potem na dobę.</p>
  </section>
</template>

<style scoped>
.logowanie { width: 100%; max-width: 440px; margin: 24px auto 0; display: flex; flex-direction: column; gap: 12px; }
.log-blok { display: flex; flex-direction: column; gap: 8px; padding: 24px; }
.log-blok h1 { font-size: 34px; }
.log-godz { font-size: 15px; font-weight: 700; }
.log-form { gap: 10px; }
.log-kod :deep(input) { font-size: 24px; font-weight: 700; letter-spacing: .2em; font-variant-numeric: tabular-nums; }
.log-stop { font-weight: 600; }
.log-stopka { padding: 0 8px; }
</style>
