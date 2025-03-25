/**
 * router/plugin.ts
 *
 * Automatic routes for `./src/views/*.vue`
 */

// Composables
import { createRouter, createWebHistory } from 'vue-router/auto'
import ErrorPage from '@/components/ErrorPage.vue'
import MainView from '@/views/MainView.vue';
import {useInterface} from '@/composables/interface';
import {useGlobalStore} from '@/stores/global';

const getValidInterfaceRoute = (route) => {
  const globalStore = useGlobalStore();
  const foundInterface = globalStore.session.interfaces.find(item => item.hash === route.params.hash);
  if (foundInterface) {
    const { getAvailableSection, getAvailableLocale } = useInterface(foundInterface);
    return `/admin/${route.params.hash}/${getAvailableSection()}/${getAvailableLocale()}`;
  }
  return `/admin/${route.params.hash}/home/en-US`;
}
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/admin/demo/home/en-US' },
    { path: '/admin/:hash/', redirect: getValidInterfaceRoute },
    { path: '/admin/:hash/:section?/:locale?', name: 'admin', beforeEnter: (to, from, next) => {
      const url = getValidInterfaceRoute(to);
      if (to.fullPath !== url) {
        next(url);
      } else {
        next();
      }
    }, component: MainView },
    { path: '/:pathMatch(.*)*', name: 'ErrorPageGeneral', component: ErrorPage },
  ],
})

// Workaround for https://github.com/vitejs/vite/issues/11804
router.onError((err, to) => {
  if (err?.message?.includes?.('Failed to fetch dynamically imported module')) {
    if (!localStorage.getItem('vuetify:dynamic-reload')) {
      console.log('Reloading page to fix dynamic import error')
      localStorage.setItem('vuetify:dynamic-reload', 'true')
      location.assign(to.fullPath)
    } else {
      console.error('Dynamic import error, reloading page did not fix it', err)
    }
  } else {
    console.error(err)
  }
})

router.isReady().then(() => {
  localStorage.removeItem('vuetify:dynamic-reload')
})

export default router
