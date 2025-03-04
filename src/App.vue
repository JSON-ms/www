<script lang="ts" setup>
import GlobalComponents from '@/components/GlobalComponents.vue';
import { ref } from 'vue';

const path = ref(window.location.pathname);
</script>

<template>
  <v-app>
    <GlobalComponents />
    <v-main style="transition: none">
      <router-view :key="path" />
    </v-main>
  </v-app>
</template>
