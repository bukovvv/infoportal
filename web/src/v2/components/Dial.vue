<script setup lang="ts">
// Koło z minutami do odjazdu (tylko do godziny; zdanie obok podaje godzinę, nie powtarza „za N min”).
defineProps<{ minutes: number }>()
</script>

<template>
  <div class="tarcza" aria-hidden="true">
    <svg viewBox="0 0 40 40"><circle class="tor" cx="20" cy="20" r="17" /><circle class="luk" cx="20" cy="20" r="17" :stroke-dasharray="`${(106.8 * minutes / 60).toFixed(1)} 106.8`" /></svg>
    <span>{{ minutes }}<small>min</small></span>
  </div>
</template>
