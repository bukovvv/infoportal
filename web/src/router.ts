import { createRouter, createWebHistory } from 'vue-router'
import { descriptions, isNoindex, setMeta } from '@/utils/seo'
import StartView from '@/views/StartView.vue'

const titles: Record<string, string> = {
  start: 'zanimwyjdziesz.pl',
  map: 'Mapa pociągów',
  scheme: 'Schemat połączeń',
  board: 'Odjazdy i przyjazdy',
  train: 'Pociąg',
  notices: 'Komunikaty',
  notice: 'Komunikat',
  btk: 'Bus-Tramwaj-Kolej',
  about: 'O nas',
  admin: 'Panel administratora',
  missing: 'Nie znaleziono strony',
}

/** Tytuły na wąskie ekrany (górny pasek obok logo, przycisków stanu i biletu). */
const shortTitles: Record<string, string> = {
  map: 'Mapa',
  scheme: 'Schemat',
  board: 'Odjazdy',
  btk: 'Bilet BTK',
  admin: 'Panel admina',
  missing: 'Nie znaleziono',
}

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
  routes: [
    { path: '/', name: 'start', component: StartView },
    { path: '/mapa', name: 'map', component: () => import('@/views/MapView.vue') },
    { path: '/schemat', name: 'scheme', component: () => import('@/views/SchemeView.vue') },
    { path: '/odjazdy/:stationId?', name: 'board', component: () => import('@/views/BoardView.vue') },
    { path: '/stacja/:stationId', redirect: (to) => ({ name: 'board', params: { stationId: to.params.stationId } }) },
    { path: '/pociag/:number', name: 'train', component: () => import('@/views/TrainView.vue') },
    { path: '/komunikaty', name: 'notices', component: () => import('@/views/NoticesView.vue') },
    { path: '/komunikaty/:id', name: 'notice', component: () => import('@/views/NoticeView.vue') },
    { path: '/bus-tramwaj-kolej', name: 'btk', component: () => import('@/views/BtkView.vue') },
    { path: '/o-nas', name: 'about', component: () => import('@/views/AboutView.vue') },
    {
      path: '/admin',
      component: () => import('@/views/admin/AdminLayout.vue'),
      children: [
        { path: '', name: 'admin', component: () => import('@/views/admin/AdminNotices.vue') },
        { path: 'stan', name: 'admin-health', component: () => import('@/views/admin/AdminHealth.vue') },
        { path: 'dziennik', name: 'admin-log', component: () => import('@/views/admin/AdminLog.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', name: 'missing', component: () => import('@/views/NotFound.vue') },
  ],
})

router.afterEach((to, from, failure) => {
  // sama zmiana zapytania (np. godzina na tablicy) zostawia opis ustawiony przez widok
  if (failure || (to.path === from.path && from.matched.length)) return
  const name = String(to.name ?? '')
  const base = name.startsWith('admin') ? titles.admin : titles[name] ?? titles.start
  setMeta({
    title: name === 'start' ? `${base} | Twój osobisty przewodnik w podróży.` : `${base} | zanimwyjdziesz.pl`,
    description: descriptions[name],
    path: to.path,
    noindex: isNoindex(name),
  })
})

export { shortTitles, titles }
export default router
