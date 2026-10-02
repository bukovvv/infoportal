import '@fontsource/varela-round/latin.css'
import '@fontsource/varela-round/latin-ext.css'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import router from './router'
import './styles/app.css'

createApp(App).use(createPinia()).use(router).use(vuetify).mount('#app')
