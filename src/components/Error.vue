<script setup lang="ts">
import { useGlobalStore } from '@/stores/global';

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
  <v-dialog
    v-model="globalStore.error.visible"
    width="auto"
    persistent
    scrollable
  >
    <v-card
      :text="globalStore.error.body"
      :title="globalStore.error.title || 'Error'"
      color="error"
      prepend-icon="mdi-alert"
      max-width="400"
    >
      <template #actions>
        <v-btn
          text="Close"
          @click="close"
        />
      </template>
    </v-card>
  </v-dialog>
</template>
