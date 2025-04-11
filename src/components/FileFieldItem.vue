<script setup lang="ts">
import {getFileIcon} from "@/utils";
import type {IField, IFile, IServerSettings} from "@/interfaces";
import {ref} from "vue";
import {useDisplay} from "vuetify";
import {useGlobalStore} from "@/stores/global";

const value = defineModel<any>({ required: true });
const {
  field,
  file,
  serverSettings,
  disabled = false,
} = defineProps<{
  field: IField,
  file: IFile,
  serverSettings: IServerSettings,
  disabled?: boolean,
}>();

const { smAndDown } = useDisplay()
const globalStore = useGlobalStore();

const thumbnailRatio = (file: IFile): number => {
  return file.meta.width && file.meta.height && (file.meta.width / file.meta.height) || 1;
}
const thumbnailSize = (file: IFile): { width: number, height: number } => {
  const ratio = thumbnailRatio(file);
  const maxWidth = smAndDown.value ? 128 : 256;
  const maxHeight = smAndDown.value ? 128 : 256;
  const width = file.meta.width ?? 256 > maxWidth ? maxWidth : file.meta.width ?? 256;
  const height = width / ratio > maxHeight ? maxHeight : width / ratio;
  return {
    width,
    height,
  };
}
const isImage = (file: IFile): boolean => {
  return file.meta.type.startsWith('image/');
}
const isVideo = (file: IFile): boolean => {
  return file.meta.type.startsWith('video/');
}
const filePath = (file: IFile): string => {
  return serverSettings.publicUrl + file.path;
}

const downloading = ref(false);
const onDownloadFile = (file: IFile) => {
  downloading.value = true;
  fetch(filePath(file))
    .then(response => response.blob())
    .then(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = file.meta.originalFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    })
    .catch(globalStore.catchError)
    .finally(() => downloading.value = false);
}
const onRemoveFile = (file: IFile) => {
  globalStore.setPrompt({
    ...globalStore.prompt,
    visible: true,
    title: 'Remove file',
    body: 'Are you sure you want to remove this file? The file won\'t be deleted and will remain on the server, but it will not be accessible once modifications are saved.',
    btnText: 'Remove',
    btnIcon: 'mdi-close',
    btnColor: 'warning',
    callback: () => new Promise(resolve => {
      if (field.multiple) {
        value.value = value.value.filter((val: IFile) => val.path !== file.path);
      } else {
        value.value = null;
      }
      resolve();
    })
  });
}
</script>

<template>
  <v-card
    variant="tonal"
    class="w-100"
  >
    <div class="d-flex align-center">
      <div class="pa-3 text-center bg-surface align-center justify-center">
        <v-avatar v-if="isImage(file)" size="100%" rounded="0">
          <v-img v-bind="thumbnailSize(file)" :src="filePath(file)" :cover="false">
            <template #placeholder>
              <v-overlay>
                <v-progress-circular
                  indeterminate
                  size="32"
                  width="2"
                />
              </v-overlay>
            </template>
          </v-img>
        </v-avatar>
        <video v-else-if="isVideo(file)" :src="filePath(file)" :style="{ float: 'left', width: thumbnailSize(file).width + 'px', height: thumbnailSize(file).height + 'px' }" controls />
        <v-icon v-else :icon="getFileIcon(file)" :size="smAndDown ? 48 : 64" />
      </div>
      <div class="pa-3 pl-0 w-100">
        <v-card-title
          :class="{
            'py-0 d-flex': true,
            'text-body-1': smAndDown,
          }"
        >
          <div class="d-flex" style="flex: 1; width: 0">
            <span class="text-truncate">{{ file.meta.originalFileName }}</span>
          </div>
        </v-card-title>
        <v-card-subtitle class="py-0">
          Size: {{ $formatBytes(file.meta.size) }}
          <br>Type: <span>{{ file.meta.type }}</span>
        </v-card-subtitle>
        <v-card-actions class="pb-0 flex-wrap" style="min-height: 0">
          <v-tooltip
            text="Download"
            location="bottom"
          >
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                :loading="downloading"
                :disabled="disabled || downloading"
                :size="smAndDown ? 'small' : 'default'"
                color="primary"
                icon
                @click="() => onDownloadFile(file)"
              >
                <v-icon icon="mdi-download" />
              </v-btn>
            </template>
          </v-tooltip>
          <v-tooltip
            text="Remove"
            location="bottom"
          >
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                :disabled="disabled"
                :size="smAndDown ? 'small' : 'default'"
                color="error"
                variant="text"
                icon
                @click="() => onRemoveFile(file)"
              >
                <v-icon icon="mdi-trash-can-outline" />
              </v-btn>
            </template>
          </v-tooltip>
        </v-card-actions>
      </div>
    </div>
  </v-card>
</template>

<style scoped lang="scss">

</style>
