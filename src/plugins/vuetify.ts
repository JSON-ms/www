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
import { VNumberInput } from 'vuetify/labs/VNumberInput'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  components: {
    VFileUpload,
    VNumberInput,
  },
  theme: {
    themes: {
      light: {
        colors: {
          background: '#eee',
        }
      },
      dark: {
        colors: {
          background: '#eee',
        }
      },
    },
    defaultTheme: 'light',
  },
})
