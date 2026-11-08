import './migrate'
import '@fontsource-variable/figtree/wght.css'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import vuetify, { endMourningTheme } from './plugins/vuetify'
import router from './router'
import './styles/app.css'
import { mourning, scheduleMourningEnd } from './utils/mourning'

if (mourning.value) document.documentElement.classList.add('kw-mourning')
scheduleMourningEnd(() => {
  document.documentElement.classList.remove('kw-mourning')
  endMourningTheme()
})

createApp(App).use(createPinia()).use(router).use(vuetify).mount('#app')
