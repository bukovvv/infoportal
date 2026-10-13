<script setup lang="ts">
// Przełącznik nad mapą i schematem: pociągi na mapie ↔ schemat połączeń.
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const current = computed(() => (route.name === 'scheme' ? 'scheme' : 'map'))
</script>

<template>
  <v-btn-toggle :model-value="current" mandatory variant="outlined" divided density="comfortable" class="map-switch" aria-label="Widok">
    <v-btn value="map" to="/mapa" :prepend-icon="current === 'map' ? 'check' : 'map'">Mapa</v-btn>
    <v-btn value="scheme" to="/schemat" :prepend-icon="current === 'scheme' ? 'check' : 'route'">Schemat</v-btn>
  </v-btn-toggle>
</template>

<style scoped>
.map-switch { background: rgb(var(--v-theme-surface-container-high)); box-shadow: 0 1px 2px rgb(0 0 0 / .3), 0 1px 3px 1px rgb(0 0 0 / .15); }
</style>
