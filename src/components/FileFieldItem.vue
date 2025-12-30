<script setup lang="ts">
import {getFileIcon} from "@/utils";
import type {IField, IFile, IServerSettings} from '@/interfaces';
import {computed, ref} from "vue";
import {useDisplay} from "vuetify";
import {useGlobalStore} from "@/stores/global";
import ImgTag from "@/components/ImgTag.vue";
import VideoPlayer from "@/components/VideoPlayer.vue";
import {blobFileList} from "@/composables/syncing";

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
  const baseDesktop = 142;
  const baseMobile = 92;
  const ratio = thumbnailRatio(file);
  const maxWidth = smAndDown.value ? baseMobile : baseDesktop;
  const maxHeight = smAndDown.value ? baseDesktop : baseDesktop;
  const width = file.meta.width ?? baseDesktop > maxWidth ? maxWidth : file.meta.width ?? baseDesktop;
  const height = width / ratio > maxHeight ? maxHeight : width / ratio;
  return {
    width: width < baseMobile ? baseMobile : width,
    height: height < baseMobile ? baseMobile : height,
  };
}
const isImage = (file: IFile): boolean => {
  return file.meta.type?.startsWith('image/') || false;
}
const isVideo = (file: IFile): boolean => {
  return file.meta.type?.startsWith('video/') || false;
}
const src = computed((): string => {
  if (file.path && blobFileList[file.path]) {
    return blobFileList[file.path];
  }
  if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
    return file.path;
  }
  return serverSettings.publicUrl + file.path;
})

const downloading = ref(false);
const onDownloadFile = (file: IFile) => {
  downloading.value = true;
  fetch(src.value)
    .then(response => response.blob())
    .then(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = file.meta.originalFileName || 'unknown';
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
      <div class="d-flex text-center bg-surface align-center justify-center" :style="{ flex: 1, minWidth: thumbnailSize(file).width + 'px' }">
        <ImgTag
          v-if="isImage(file)"
          :src="src"
          :min-width="thumbnailSize(file).width"
          :min-height="thumbnailSize(file).height"
        />
        <VideoPlayer
          v-else-if="isVideo(file)"
          :src="src"
          :type="file.meta.type"
          :aspect-ratio="(file.meta.width || 1) / (file.meta.height || 1)"
          :style="{ float: 'left', width: thumbnailSize(file).width + 'px', height: thumbnailSize(file).height + 'px' }"
          controls
        />
        <v-icon v-else :icon="getFileIcon(file)" :size="smAndDown ? 48 : 64" />
      </div>
      <div class="w-100">
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
          Size: {{ file.meta.size && $formatBytes(file.meta.size) || 'Unknown' }}
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
                variant="text"
                icon
                @click="() => onRemoveFile(file)"
              >
                <v-icon icon="mdi-close" />
              </v-btn>
            </template>
          </v-tooltip>
        </v-card-actions>
      </div>
    </div>
  </v-card>
</template>
