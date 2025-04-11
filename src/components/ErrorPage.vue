<script setup lang="ts">
const {
  title = '404 - Page Not Found',
  text = 'It seems the page you\'re looking for has wandered off. Whether it was moved, deleted, or never existed, we can\'t seem to find it.',
  showBtn = true,
} = defineProps<{
  title?: string,
  text?: string,
  showBtn?: boolean,
}>();
</script>

<template>
  <v-sheet class="fill-height">
    <v-empty-state
      icon="mdi-code-braces-box"
      color="primary"
      :text="text"
      :title="title"
    >
      <v-btn v-if="showBtn" theme="dark" to="/">
        <v-icon icon="mdi-home" start />
        Go to home page
      </v-btn>
    </v-empty-state>
  </v-sheet>
</template>
