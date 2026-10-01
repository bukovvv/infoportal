<template>
  <div class="page-narrow">
    <v-empty-state icon="wrong_location" title="Nie ma takiej strony" text="Adres mógł się zmienić. Wróć do ekranu startowego albo wyszukaj pociąg.">
      <template #actions>
        <v-btn to="/" prepend-icon="home">Strona główna</v-btn>
        <v-btn to="/odjazdy" variant="flat" color="secondary-container" prepend-icon="departure_board">Odjazdy</v-btn>
      </template>
    </v-empty-state>
  </div>
</template>
