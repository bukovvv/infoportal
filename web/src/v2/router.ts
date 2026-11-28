import { createRouter, createWebHistory } from 'vue-router'
import { useAdmin } from '@/stores/admin'
import { region } from '@/utils/region'
import Placeholder from './views/Placeholder.vue'

/** Zakładki menu (dolny pasek na telefonie, menu w górnym pasku na komputerze); adresy jak w 1.0. */
export const TABS = [
  { name: 'szukaj', title: 'Szukaj', path: '/', icon: 'search' },
  { name: 'stacje', title: 'Stacje', path: '/odjazdy', icon: 'location_on' },
  { name: 'mapa', title: 'Mapa', path: '/mapa', icon: 'map' },
  { name: 'komunikaty', title: 'Komunikaty', path: '/komunikaty', icon: 'error' },
  { name: 'moje', title: 'Moje', path: '/moje', icon: 'star' },
] as const

/** Zakładki panelu administratora (to samo miejsce w pasku co zakładki pasażera). */
export const ADMIN_TABS = [
  { name: 'admin', title: 'Pulpit', path: '/admin', icon: 'dashboard' },
  { name: 'admin-notices', title: 'Komunikaty', path: '/admin/komunikaty', icon: 'campaign' },
  { name: 'admin-security', title: 'Zabezpieczenia', path: '/admin/zabezpieczenia', icon: 'shield' },
] as const

// shortcut: 2.0 pod /v2 obok 1.0; przy podmianie wersji base = region.base (bez /v2)
const router = createRouter({
  history: createWebHistory('/v2' + region.base),
  routes: [
    { path: '/', name: 'szukaj', component: () => import('./views/SearchView.vue') },
    { path: '/odjazdy/:id?', name: 'stacje', component: Placeholder, meta: { title: 'Stacje' } },
    { path: '/mapa', name: 'mapa', component: Placeholder, meta: { title: 'Mapa' } },
    { path: '/komunikaty/:id?', name: 'komunikaty', component: Placeholder, meta: { title: 'Komunikaty' } },
    { path: '/moje', name: 'moje', component: Placeholder, meta: { title: 'Moje' } },
    {
      // nazwy tras jak w 1.0 (views/admin/noticeActions.ts przechodzi do 'admin-edit' / 'admin-new')
      path: '/admin',
      component: () => import('./admin/AdminShell.vue'),
      meta: { admin: true },
      children: [
        { path: '', name: 'admin', component: () => import('./admin/AdminDashboard.vue') },
        { path: 'komunikaty', name: 'admin-notices', component: () => import('./admin/AdminNotices.vue') },
        { path: 'komunikaty/nowy', name: 'admin-new', component: () => import('./admin/AdminEditor.vue') },
        { path: 'komunikaty/:id(\\d+)', name: 'admin-edit', component: () => import('./admin/AdminEditor.vue') },
        { path: 'zabezpieczenia', name: 'admin-security', component: () => import('./admin/AdminSecurity.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  // ta sama ścieżka (np. wybór komunikatu w ?k=) nie przewija strony
  scrollBehavior: (to, from) => (to.path === from.path ? undefined : { top: 0 }),
})

// do czasu podmiany wersji część pasażerska tylko z sesją panelu; bez niej logowanie w panelu 2.0
router.beforeEach(async (to) => {
  if (to.meta.admin) return region.features.admin ? undefined : '/'
  const admin = useAdmin()
  if (!admin.session) await admin.check().catch(() => undefined)
  if (admin.session?.loggedIn) return
  if (region.features.admin) return { name: 'admin' }
  location.href = '/v2/admin' // panel jest tylko w Wielkopolsce (pełne wczytanie)
  return false
})

export default router
