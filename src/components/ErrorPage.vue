<script setup lang="ts">
const {
  title = '500 - Unknown Error',
  text = 'Sorry, an unknown error occured.',
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
