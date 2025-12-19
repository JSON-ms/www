/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// Composables
import { createVuetify } from 'vuetify'

// Labs
import { VFileUpload } from 'vuetify/labs/VFileUpload'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  components: {
    VFileUpload,
  },
  theme: {
    themes: {
      light: {
        colors: {
          footer: '#f9f9f9',
          background: '#eee',
        }
      },
      dark: {
        colors: {
          footer: '#030303',
          background: '#111',
        }
      },
    },
    defaultTheme: 'light',
  },
})
