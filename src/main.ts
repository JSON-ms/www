/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from '@/plugins'
import { registerFilters } from './filters';

// Components
import App from './App.vue'
import ErrorPage from './Error.vue';
import VueEasymde from 'vue3-easymde'
import { QuillEditor } from '@vueup/vue-quill'

// Directives
import ifRef from '@/directives/if-ref';

// Composable
import { createApp } from 'vue'
import { createPinia } from 'pinia';
import { useGlobalStore } from '@/stores/global';
import { Services } from '@/services';

// Calculate <html> font-size based on a viewport width of 1800px
// const adjustHtmlFontSize = () => {
//   const screenWidth = window.innerWidth;
//   if (screenWidth >= 1800) {
//     document.documentElement.style.fontSize = 'calc(' + screenWidth + 'px / 1800 * 16)';
//   }
// }
// window.addEventListener('resize', adjustHtmlFontSize);
// adjustHtmlFontSize();

// Stylesheets
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import "easymde/dist/easymde.min.css"

const app = createApp(App)
const pinia = createPinia();
app.use(pinia);
app.use(VueEasymde);
app.component('QuillEditor', QuillEditor)
app.directive('if-ref', ifRef);

const globalStore = useGlobalStore();
const loadSession = async (): Promise<any> => {
  return Services.get(import.meta.env.VITE_SERVER_URL + '/session');
}

const handleError = () => {
  const errorApp = createApp(ErrorPage, {
    title: 'Server Unavailable',
    text: 'We are currently experiencing issues connecting to the server. Please try again later or check your internet connection.',
    showBtn: false,
  })
  registerPlugins(errorApp)
  errorApp.mount('#app');
}

loadSession()
  .then(globalStore.setSession)
  .catch(handleError) // Do not catch errors from app.mount
  .then(() => {
    registerFilters(app);
    registerPlugins(app)
    app.mount('#app')
  })

document.addEventListener('visibilitychange', () => {
  const wasLoggedIn = globalStore.session.loggedIn;
  if (document.visibilityState === 'visible') {
    loadSession().then(response => {
      if (wasLoggedIn !== response.loggedIn) {
        window.location.reload();
      } else {
        globalStore.setSession(response);
      }
    }).catch(globalStore.catchError)
  }
});
