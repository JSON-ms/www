<script setup lang="ts">
import logoLight from '@/assets/logo.png'
import logoDark from '@/assets/logo-dark.png'
import {computed} from "vue";
import {useGlobalStore} from "@/stores/global";

const globalStore = useGlobalStore();

const logo = computed(() => {
  return globalStore.userSettings.data.appearanceDarkMode ? logoDark : logoLight;
})
</script>

<template>
  <v-img :src="logo" width="276" height="68" />
</template>
