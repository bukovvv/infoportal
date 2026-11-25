<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useAdmin } from '@/stores/admin'
import AdminLogin from './AdminLogin.vue'
import './admin.css'

// Panel 2.0: sesja, logowanie i lista komunikatów (potrzebna na pulpicie, w liście i w edytorze).
const admin = useAdmin()
const loadError = ref<string | null>(null)

onMounted(() => { if (!admin.session) admin.check().catch((e) => { loadError.value = (e as Error).message }) })
watch(() => admin.session?.loggedIn, (on) => { if (on && !admin.notices) void admin.loadNotices() }, { immediate: true })

// pola wypełnione bez obrysów (wygląd z styles/tarcza.css, klasa .tarcza-panel)
const defaults = {
  VTextField: { variant: 'solo-filled', flat: true, rounded: 'lg' },
  VTextarea: { variant: 'solo-filled', flat: true, rounded: 'lg' },
  VAutocomplete: { variant: 'solo-filled', flat: true, rounded: 'lg' },
  VCombobox: { variant: 'solo-filled', flat: true, rounded: 'lg' },
  VBtn: { rounded: 'pill', flat: true },
}
</script>

<template>
  <v-defaults-provider :defaults="defaults">
    <div class="tarcza-panel adm">
      <div v-if="loadError" class="plyta adm-blad" role="alert">Nie udało się połączyć z serwerem: {{ loadError }}</div>
      <div v-else-if="!admin.session" class="adm-laduje" aria-busy="true" />
      <AdminLogin v-else-if="!admin.session.loggedIn" />
      <RouterView v-else />
    </div>
  </v-defaults-provider>
</template>
