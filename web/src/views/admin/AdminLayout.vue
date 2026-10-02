<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAdmin } from '@/stores/admin'

const admin = useAdmin()
const username = ref('')
const password = ref('')
const error = ref<string | null>(null)
const busy = ref(false)
const loadError = ref<string | null>(null)

onMounted(() => admin.check().catch((e) => { loadError.value = (e as Error).message }))

async function submit() {
  busy.value = true
  error.value = null
  try {
    await admin.login(username.value, password.value)
    password.value = ''
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="page">
    <v-alert v-if="loadError" color="error-container" icon="error">{{ loadError }}</v-alert>
    <v-skeleton-loader v-else-if="!admin.session" type="card" color="transparent" max-width="440" class="mx-auto mt-8" />
    <v-card v-else-if="!admin.session.loggedIn" color="surface-container-low" max-width="440" class="mx-auto mt-8 pa-2">
      <v-card-item>
        <v-card-title class="text-headline-small">Logowanie</v-card-title>
        <v-card-subtitle>Dostęp tylko dla osób publikujących komunikaty.</v-card-subtitle>
      </v-card-item>
      <v-card-text>
        <v-alert v-if="admin.session.configured === false" color="warning-container" icon="warning" density="compact" class="mb-4">
          Na serwerze nie ustawiono hasła administratora. Zobacz DEPLOYMENT.md.
        </v-alert>
        <v-form @submit.prevent="submit">
          <v-text-field v-model="username" label="Nazwa użytkownika" autocomplete="username" prepend-inner-icon="person" class="mb-3" />
          <v-text-field v-model="password" label="Hasło" type="password" autocomplete="current-password" prepend-inner-icon="lock" />
          <v-alert v-if="error" color="error-container" icon="error" density="compact" class="mt-3">{{ error }}</v-alert>
          <v-btn type="submit" block size="large" class="mt-4" :loading="busy">Zaloguj się</v-btn>
        </v-form>
      </v-card-text>
    </v-card>
    <template v-else>
      <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
        <v-tabs color="primary" density="comfortable">
          <v-tab :to="{ name: 'admin' }" prepend-icon="campaign" exact>Komunikaty</v-tab>
          <v-tab :to="{ name: 'admin-health' }" prepend-icon="monitor_heart">Stan źródeł</v-tab>
        </v-tabs>
        <div class="d-flex ga-2">
          <v-btn variant="text" prepend-icon="open_in_new" to="/" target="_blank">Portal</v-btn>
          <v-btn variant="flat" color="secondary-container" prepend-icon="logout" @click="admin.logout()">Wyloguj</v-btn>
        </div>
      </div>
      <router-view />
    </template>
  </div>
</template>
