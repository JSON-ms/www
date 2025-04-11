<script setup lang="ts">
import { useGlobalStore } from '@/stores/global';
import { ref } from 'vue';

const globalStore = useGlobalStore();
const proceed = () => {
  proceeding.value = true;
  globalStore.prompt.callback()
    .then(close)
    .catch(globalStore.catchError)
    .finally(() => proceeding.value = false);
}
const proceeding = ref(false);
const close = () => {
  globalStore.setPrompt({
    ...globalStore.prompt,
    visible: false,
  })
  setTimeout(() => {
    globalStore.setPrompt({
      visible: false,
      body: '',
      callback: () => new Promise(resolve => resolve()),
    })
  }, 300)
}
</script>

<template>
  <v-dialog
    v-model="globalStore.prompt.visible"
    width="auto"
    persistent
    scrollable
  >
    <v-card
      :color="globalStore.prompt.color"
      :text="globalStore.prompt.body"
      :title="globalStore.prompt.title"
      :prepend-icon="globalStore.prompt.icon"
      max-width="400"
    >
      <template #actions>
        <v-btn
          :loading="proceeding"
          :disabled="proceeding"
          :text="globalStore.prompt.btnText || 'OK'"
          :prepend-icon="globalStore.prompt.btnIcon"
          :color="globalStore.prompt.btnColor || 'primary'"
          :class="{
            'px-3': !!(globalStore.prompt.btnIcon)
          }"
          variant="flat"
          @click="proceed"
        />
        <v-btn
          :disabled="proceeding"
          text="Cancel"
          @click="close"
        />
      </template>
    </v-card>
  </v-dialog>
</template>
