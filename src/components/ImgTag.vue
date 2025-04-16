<script setup lang="ts">
import type {IFile, IServerSettings} from '@/interfaces';

const file = defineModel<IFile>({ required: true });
const {
  serverSettings,
} = defineProps<{
  serverSettings: IServerSettings,
}>()
</script>

<template>
  <v-img
    v-bind="$attrs"
    :src="serverSettings.publicUrl + file.path"
    :aspect-ratio="(file.meta.width || 1) / (file.meta.height || 1)"
  >
    <template #error>
      <div class="d-flex px-2 align-center justify-center fill-height flex-column">
        <v-icon color="warning" size="32" icon="mdi-alert-outline" />
        <div class="text-caption text-disabled mt-1" style="line-height: 1rem">
          Unable to load image
        </div>
      </div>
    </template>
    <template #placeholder>
      <div class="d-flex align-center justify-center fill-height">
        <v-progress-circular
          color="primary"
          indeterminate
          size="32"
          width="2"
        />
      </div>
    </template>
  </v-img>
</template>

<style scoped lang="scss">

</style>
