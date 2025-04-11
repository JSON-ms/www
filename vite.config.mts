// Plugins
import Components from 'unplugin-vue-components/vite'
import Vue from '@vitejs/plugin-vue'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import ViteFonts from 'unplugin-fonts/vite'
import VueRouter from 'unplugin-vue-router/vite'
import {stringPlugin} from "vite-string-plugin";
import vuetifyRemPlugin from './src/plugins/vite-vuetify-to-rem';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Utilities
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    VueRouter(),
    Vue({
      template: { transformAssetUrls },
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    Vuetify({
      autoImport: true,
      styles: {
        configFile: 'src/styles/settings.scss',
      },
    }),
    vuetifyRemPlugin(),
    Components(),
    ViteFonts({
      google: {
        families: [ {
          name: 'Roboto',
          styles: 'wght@100;300;400;500;700;900',
        }],
      },
    }),
    stringPlugin({
      match: /\.(svg|md|xml|txt|yaml)$/i,
    }),
  ],
  define: { 'process.env': {
    'APP_VERSION': JSON.stringify(pkg.version)
  } },
  resolve: {
    alias: {
      '@/docs': fileURLToPath(new URL('./docs', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    extensions: [
      '.js',
      '.json',
      '.jsx',
      '.mjs',
      '.ts',
      '.tsx',
      '.vue',
    ],
  },
  server: {
    port: 3000,
  },
  css: {
    preprocessorOptions: {
      sass: {
        api: 'modern-compiler',
      },
    },
  },
})
