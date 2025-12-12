<script setup lang="ts">
import googleImg from '@/assets/google.png'
import { useDisplay } from 'vuetify';
import { useGlobalStore } from '@/stores/global';
import { ref } from 'vue';

const { smAndDown } = useDisplay()
const globalStore = useGlobalStore();
const clicking = ref(false);
const state = encodeURIComponent(JSON.stringify({ path: window.location.pathname }));
</script>

<template>
  <v-btn
    :loading="clicking"
    :disabled="clicking"
    :href="globalStore.session.googleOAuthSignInUrl.replace('&state', '&state=' + state)"
    variant="outlined"
    @click="clicking = true"
  >
    <v-img
      :src="googleImg"
      height="16"
      width="16"
      class="mr-md-2"
    />
    <span v-if="!smAndDown">Sign in with Google</span>
  </v-btn>
</template>
