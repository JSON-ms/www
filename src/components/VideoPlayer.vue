<script setup lang="ts">
import type {IFile, IServerSettings} from '@/interfaces';
import {ref} from "vue";

const file = defineModel<IFile>({ required: true });
const {
  serverSettings,
} = defineProps<{
  serverSettings: IServerSettings,
}>()

const hasError = ref(false);
const onError = () => {
  hasError.value = true
}
</script>

<template>
  <v-responsive
    v-bind="$attrs"
    :aspect-ratio="(file.meta.width || 1) / (file.meta.height || 1)"
  >
    <div v-if="hasError" class="d-flex px-2 align-center justify-center fill-height flex-column">
      <v-icon color="warning" size="32" icon="mdi-alert-outline" />
      <div class="text-caption text-disabled mt-1" style="line-height: 1rem">
        Unable to load video
      </div>
    </div>
    <video
      v-else
      :src="serverSettings.publicUrl + file.path"
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
