// Wersja 2.0 „Tarcza”: Vue 3 + Vuetify 4 w motywie tarcza/tarczaDark (jak panel admina), układ z makiety (styles.css).
// Na razie pod /v2, tylko dla administratora.
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import vuetify from '@/plugins/vuetify'
import App from './App.vue'
import router from './router'
import './styles.css'
import '@/styles/tarcza.css'

createApp(App).use(createPinia()).use(router).use(vuetify).mount('#app')
