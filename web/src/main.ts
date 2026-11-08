import './migrate'
import '@fontsource-variable/figtree/wght.css'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import vuetify, { endMourningTheme } from './plugins/vuetify'
import router from './router'
import './styles/app.css'
import { mourning, scheduleMourningEnd } from './utils/mourning'

/** Ikona w karcie: na czas żałoby czarna (favicon-zaloba.svg), potem zwykła czerwona. */
function setFavicon(href: string) {
  document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]').forEach((l) => { l.href = href })
}
if (mourning.value) {
  document.documentElement.classList.add('kw-mourning')
  setFavicon('/favicon-zaloba.svg')
}
scheduleMourningEnd(() => {
  document.documentElement.classList.remove('kw-mourning')
  setFavicon('/favicon.svg')
  endMourningTheme()
})

createApp(App).use(createPinia()).use(router).use(vuetify).mount('#app')
