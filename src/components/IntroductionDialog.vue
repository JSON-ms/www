<script setup lang="ts">
import { ref } from 'vue';
import ModalDialog from '@/components/ModalDialog.vue';
import { useGlobalStore } from '@/stores/global';

const storageKey = 'jsonms/introduction-dialog';
const globalStore = useGlobalStore();
const visible = ref(!globalStore.session.loggedIn && localStorage.getItem(storageKey) !== '1');
const close = () => {
  localStorage.setItem(storageKey, '1');
  visible.value = false;
}
</script>

<template>
  <ModalDialog
    v-model="visible"
    width="auto"
    title="Welcome to JSON.ms!"
    prepend-icon="mdi-human-greeting"
    max-width="800"
    scrollable
    persistent
  >
    <iframe
      :height="800 / (16/9)"
      src="https://www.youtube.com/embed/QbzHaJ3GeJM?si=HsQLg2_cXyt97vv1"
      title="JSON.ms Youtube Presentation"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen
    />
    <v-card-text>
      <p>Unlock the power of seamless admin panel generation with our intuitive YAML interface. JSON.ms enables you to create dynamic admin panels that save user inputs directly in JSON format to YOUR server through RESTful API calls.</p>
    </v-card-text>
    <v-card-actions>
      <v-btn
        variant="flat"
        color="primary"
        text="Get Started"
        @click="close"
      />
    </v-card-actions>
  </ModalDialog>
</template>

<style lang="scss" scoped>
iframe, object, embed {
  max-width: 100%;
  max-height: 100%;
}
</style>
