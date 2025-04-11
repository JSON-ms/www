<script setup lang="ts">
import JSONms from '@/components/JSONms.vue';
import {useGlobalStore} from '@/stores/global';
import {useRoute} from 'vue-router';
import {useModelStore} from '@/stores/model';

const currentRoute = useRoute();
const globalStore = useGlobalStore();
const modelStore = useModelStore();

if (currentRoute.params.hash) {
  const foundInterface = globalStore.session.interfaces.find(item => item.hash === currentRoute.params.hash);
  if (foundInterface) {
    modelStore.setInterface(foundInterface);
  }
}
</script>

<template>
  <JSONms
    v-model="modelStore.interface"
    :interfaces="globalStore.session.interfaces"
    autoload
  />
</template>
