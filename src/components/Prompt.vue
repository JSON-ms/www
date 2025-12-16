<script setup lang="ts">
import { useGlobalStore } from '@/stores/global';
import { ref } from 'vue';
import ModalDialog from '@/components/ModalDialog.vue';

const globalStore = useGlobalStore();
const proceed = () => {
  proceeding.value = true;
  globalStore.prompt.callback()
    .then(close)
    .catch(globalStore.catchError)
    .finally(() => proceeding.value = false);
}
const proceeding = ref(false);
const closing = ref(false);
const cancel = () => {
  if (globalStore.prompt.cancelCallback instanceof Function) {
    closing.value = true;
    globalStore.prompt.cancelCallback()
      .then(close)
      .finally(() => closing.value = false);
  } else {
    close();
  }
}
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
  <ModalDialog
    v-model="globalStore.prompt.visible"
    :title="globalStore.prompt.title"
    :prepend-icon="globalStore.prompt.icon"
    :color="globalStore.prompt.color"
    :text="globalStore.prompt.body"
    max-width="400"
    width="auto"
    persistent
    scrollable
  >
    <v-card-actions>
      <v-btn
        :loading="proceeding"
        :disabled="proceeding || closing"
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
        :disabled="proceeding || closing"
        :loading="closing"
        :text="globalStore.prompt.cancelText || 'Cancel'"
        :prepend-icon="globalStore.prompt.cancelIcon"
        @click="cancel"
      />
    </v-card-actions>
  </ModalDialog>
</template>
