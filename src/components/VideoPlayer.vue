<script setup lang="ts">
import {ref} from "vue";

const src = defineModel<string>('src', { required: true });

const hasError = ref(false);
const onError = () => {
  hasError.value = true
}
</script>

<template>
  <v-responsive
    v-bind="$attrs"
  >
    <div v-if="hasError" class="d-flex px-2 align-center justify-center fill-height flex-column">
      <v-icon color="warning" size="32" icon="mdi-alert-outline" />
      <div class="text-caption text-disabled mt-1" style="line-height: 1rem">
        Unable to load video
      </div>
    </div>
    <video
      v-else
      :src="src"
      width="100%"
      disablePictureInPicture
      @error="onError"
    />
  </v-responsive>
</template>

<style scoped lang="scss">
video {
  float: left;
}
</style>
