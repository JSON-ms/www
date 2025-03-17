<script setup lang="ts">
import { useGlobalStore } from '@/stores/global';

const globalStore = useGlobalStore();
const close = () => {
  globalStore.setSnack({
    ...globalStore.snack,
    visible: false,
  })
  setTimeout(() => {
    globalStore.setSnack({
      visible: false,
      color: undefined,
      icon: undefined,
      title: '',
      body: '',
    })
  }, 300)
}
</script>

<template>
  <v-snackbar
    v-model="globalStore.snack.visible"
    :color="globalStore.snack.color"
    multi-line
  >
    <div class="d-flex align-center" style="gap: 1rem">
      <v-icon v-if="globalStore.snack.icon" start icon="mdi-server-network-off" size="32" />
      <div>
        <template v-if="globalStore.snack.title">
          <strong>{{ globalStore.snack.title }}</strong>
          <br v-if="globalStore.snack.body">
        </template>
        {{ globalStore.snack.body }}
      </div>
    </div>

    <template #actions>
      <v-btn
        variant="text"
        @click="close"
      >
        Close
      </v-btn>
    </template>
  </v-snackbar>
</template>
