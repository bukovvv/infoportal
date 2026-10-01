import { createRouter, createWebHistory } from 'vue-router'
import StartView from '@/views/StartView.vue'

const titles: Record<string, string> = {
  start: 'Infoportal KW',
  map: 'Mapa pociągów',
  board: 'Odjazdy i przyjazdy',
  train: 'Pociąg',
  notices: 'Komunikaty',
  admin: 'Panel administratora',
  missing: 'Nie znaleziono strony',
}

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
  routes: [
    { path: '/', name: 'start', component: StartView },
    { path: '/mapa', name: 'map', component: () => import('@/views/MapView.vue') },
    { path: '/odjazdy/:stationId?', name: 'board', component: () => import('@/views/BoardView.vue') },
    { path: '/stacja/:stationId', redirect: (to) => ({ name: 'board', params: { stationId: to.params.stationId } }) },
    { path: '/pociag/:number', name: 'train', component: () => import('@/views/TrainView.vue') },
    { path: '/komunikaty', name: 'notices', component: () => import('@/views/NoticesView.vue') },
    {
      path: '/admin',
      component: () => import('@/views/admin/AdminLayout.vue'),
      children: [
        { path: '', name: 'admin', component: () => import('@/views/admin/AdminNotices.vue') },
        { path: 'stan', name: 'admin-health', component: () => import('@/views/admin/AdminHealth.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', name: 'missing', component: () => import('@/views/NotFound.vue') },
  ],
})

router.afterEach((to) => {
  const name = String(to.name ?? '')
  const base = name.startsWith('admin') ? titles.admin : titles[name] ?? titles.start
  document.title = name === 'start' ? base : `${base} · Infoportal KW`
})

export { titles }
export default router
