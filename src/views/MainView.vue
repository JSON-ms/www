<script setup lang="ts">
import JSONms from '@/components/JSONms.vue';
import {useGlobalStore} from '@/stores/global';
import {useRoute} from 'vue-router';
import {useModelStore} from '@/stores/model';

const currentRoute = useRoute();
const globalStore = useGlobalStore();
const modelStore = useModelStore();

if (currentRoute.params.hash) {
  const foundStructure = globalStore.session.structures.find(item => item.hash === currentRoute.params.hash);
  if (foundStructure) {
    modelStore.setStructure(foundStructure);
  }
}
</script>

<template>
  <JSONms
    v-model="modelStore.structure"
    :structures="globalStore.session.structures"
    autoload
  />
</template>
