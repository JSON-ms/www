/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from '@/plugins'

// Components
import App from './App.vue'

// Composable
import { createApp } from 'vue'
import { createPinia } from 'pinia';
import { useGlobalStore } from '@/stores/global';
import { Services } from '@/services';
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import VueEasymde from 'vue3-easymde'
import "easymde/dist/easymde.min.css"

const app = createApp(App)
const pinia = createPinia();
app.use(pinia);
app.use(VueEasymde);
app.component('QuillEditor', QuillEditor)

registerPlugins(app)

const globalStore = useGlobalStore();
const loadSession = async (): Promise<any> => {
  return Services.get(import.meta.env.VITE_SERVER_URL + '/session')
    .then(globalStore.setSession)
}

loadSession().then(() => app.mount('#app'))
  .catch(reason => {
    app.mount('#app')
    globalStore.catchError(reason);
  })

document.addEventListener('visibilitychange', () => {
  const wasLoggedIn = globalStore.session.loggedIn;
  if (document.visibilityState === 'visible') {
    Services.get(import.meta.env.VITE_SERVER_URL + '/session')
      .then(response => {
        if (wasLoggedIn !== response.loggedIn) {
          window.location.reload();
        } else {
          globalStore.setSession(response);
        }
      })
  }
});
