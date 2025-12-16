<script setup lang="ts">
import { useGlobalStore } from '@/stores/global';
import ModalDialog from '@/components/ModalDialog.vue';

const globalStore = useGlobalStore();
const close = () => {
  globalStore.setError({
    ...globalStore.error,
    visible: false,
  })
  setTimeout(() => {
    globalStore.setError({
      visible: false,
      body: '',
    })
  }, 300)
}
</script>

<template>
  <ModalDialog
    v-model="globalStore.error.visible"
    :text="globalStore.error.body"
    :title="globalStore.error.title || 'Error'"
    color="error"
    prepend-icon="mdi-alert"
    max-width="400"
    width="auto"
    persistent
    scrollable
  >
    <v-card-actions>
      <v-btn
        text="Close"
        @click="close"
      />
    </v-card-actions>
  </ModalDialog>
</template>
