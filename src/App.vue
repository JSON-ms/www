<script lang="ts" setup>
import GlobalComponents from '@/components/GlobalComponents.vue';
import { onMounted, ref } from 'vue';

const path = ref(window.location.pathname);

onMounted(() => {
  setTimeout(() => {
    document.getElementById('loader')?.remove();
  }, 1000)
})
</script>

<template>
  <v-app>
    <GlobalComponents />
    <v-main style="transition: none">
      <router-view :key="path" />
    </v-main>
  </v-app>
</template>
