<script lang="ts" setup>
import { onMounted, } from 'vue';
import ErrorPage from '@/components/ErrorPage.vue';
import GlobalComponents from '@/components/GlobalComponents.vue';

const {
  title = '500 - Unknown Error',
  text = 'Sorry, an unknown error occured.',
  showBtn = true,
} = defineProps<{
  title?: string,
  text?: string,
  showBtn?: boolean,
}>();

onMounted(() => {
  setTimeout(() => {
    document.getElementById('loader')?.remove();
  }, 1000)
})
</script>

<template>
  <v-app>
    <v-main style="transition: none">
      <ErrorPage
        :title="title"
        :text="text"
        :show-btn="showBtn"
      />
    </v-main>
  </v-app>
</template>
