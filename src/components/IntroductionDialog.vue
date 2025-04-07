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
    persistent
    scrollable
  >
    <v-card
      title="Welcome to JSON.ms!"
      prepend-icon="mdi-human-greeting"
      max-width="600"
    >
      <v-card-text>
        <p>Unlock the power of seamless admin panel generation with our intuitive YAML interface. JSON.ms enables you to create dynamic admin panels that save user inputs directly in JSON format to YOUR server through RESTful API calls.</p>
        <p class="mt-4"><strong>How to use it?</strong></p>
        <ol class="my-4 ml-6">
          <li><strong>Play with the YAML Template:</strong> Experiment with our user-friendly template and see live changes in the preview section. Every detail is thoroughly explained in the Docs section to guide you through the process.</li>
          <li class="mt-2"><strong>Integration Made Easy:</strong> Follow our comprehensive documentation for PHP, Python, or Node to set up your webhook and API key.</li>
          <li class="mt-2"><strong>Save User Data:</strong> Once integrated, JSON.ms will handle RESTful API calls to your server, allowing you to effortlessly capture and store user inputs from your dynamically generated admin panels in JSON format.</li>
        </ol>
        <p>Dive in and transform your admin experience with JSON.ms!</p>
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
