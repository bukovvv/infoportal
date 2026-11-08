import './migrate'
import '@fontsource-variable/figtree/wght.css'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import router from './router'
import './styles/app.css'
import { MOURNING } from './utils/mourning'

if (MOURNING) document.documentElement.classList.add('kw-mourning')

createApp(App).use(createPinia()).use(router).use(vuetify).mount('#app')
