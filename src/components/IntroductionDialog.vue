<script setup lang="ts">
import { ref } from 'vue';
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
  <v-dialog
    v-model="visible"
    width="auto"
    scrollable
  >
    <v-card
      title="Welcome to JSON.ms!"
      prepend-icon="mdi-human-greeting"
      max-width="800"
    >
      <iframe
        :height="800 / (16/9)"
        src="https://www.youtube.com/embed/QbzHaJ3GeJM?si=HsQLg2_cXyt97vv1"
        title="JSON.ms Youtube Presentation"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen
      />
      <v-card-text>
        <p>Unlock the power of seamless admin panel generation with our intuitive YAML interface. JSON.ms enables you to create dynamic admin panels that save user inputs directly in JSON format to YOUR server through RESTful API calls.</p>
      </v-card-text>
      <template #actions>
        <v-btn
          variant="flat"
          color="primary"
          text="Get Started"
          @click="close"
        />
      </template>
    </v-card>
  </v-dialog>
</template>

<style lang="scss" scoped>
iframe, object, embed {
  max-width: 100%;
  max-height: 100%;
}
</style>
