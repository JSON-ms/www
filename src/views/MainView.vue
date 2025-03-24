<script setup lang="ts">
import JSONms from '@/components/JSONms.vue';
import {useGlobalStore} from '@/stores/global';
import {getDefaultInterfaceContent, getInterface} from '@/utils';
import {ref} from 'vue';
import {useRoute} from 'vue-router';

const currentRoute = useRoute();
const globalStore = useGlobalStore();
const defaultInterfaceContent = getDefaultInterfaceContent();
const defaultInterface = getInterface(defaultInterfaceContent);
const interfaceModel = ref(defaultInterface);
if (currentRoute.params.hash) {
  const foundInterface = globalStore.session.interfaces.find(item => item.hash === currentRoute.params.hash);
  if (foundInterface) {
    interfaceModel.value = foundInterface;
  }
}
</script>

<template>
  <JSONms
    v-model="interfaceModel"
    :interfaces="globalStore.session.interfaces"
    autoload
  />
</template>
