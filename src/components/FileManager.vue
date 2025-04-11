<script setup lang="ts">
import { useGlobalStore } from '@/stores/global';
import type { IFile, IInterface, IServerSettings} from '@/interfaces';
import {computed, nextTick, ref, watch} from 'vue';
import {Services} from '@/services';
import {downloadFilesAsZip, getFileIcon, phpStringSizeToBytes} from '@/utils';

const globalStore = useGlobalStore();
const interfaceModel = defineModel<IInterface>({ required: true });
const { selected = [], serverSettings, canUpload = false, canDelete = false, canSelect = false, canDownload = false } = defineProps<{
  selected?: IFile[],
  canUpload?: boolean,
  canDelete?: boolean,
  canSelect?: boolean,
  canDownload?: boolean,
  serverSettings: IServerSettings,
}>();
const loading = ref(false);
const filter = ref<'all' | 'image' | 'video' | 'document'>('all');
const selectedFiles = ref<IFile[]>([]);

const search = ref('');
const uploading = ref(false);
const deleting = ref(false);
const downloading = ref(false);
const uploadProgress = ref(0);
const files = ref<IFile[]>([]);
const getFilesByType = (type: string): IFile[] => {
  if (type === 'all') {
    return acceptedFiles.value;
  } else if (type === 'image') {
    return acceptedFiles.value.filter((file: IFile) => file.meta.type.startsWith('image'));
  } else if (type === 'video') {
    return acceptedFiles.value.filter((file: IFile) => file.meta.type.startsWith('video'));
  } else if (type === 'document') {
    return acceptedFiles.value.filter((file: IFile) => !file.meta.type.startsWith('image') && !file.meta.type.startsWith('video'));
  }
  return [];
}
const acceptedFiles = computed((): IFile[] => {
  if (!globalStore.fileManager.accept) {
    return files.value;
  }

  const acceptTypes = globalStore.fileManager.accept.split(',').map(type => type.trim());
  const validPatterns: any[] = [];
  acceptTypes.forEach(type => {
    if (type.startsWith('.')) {
      validPatterns.push(new RegExp(`\\${type}$`, 'i'));
    } else if (type.includes('/')) {
      const [typeBase, subtype] = type.split('/');
      if (typeBase === '*') {
        validPatterns.push(/.+/);
      } else if (subtype === '*') {
        validPatterns.push(new RegExp(`^${typeBase}/.+`, 'i'));
      } else {
        const extension = `.${subtype}`;
        validPatterns.push(new RegExp(`\\${extension}$`, 'i'));
      }
    } else if (type === '*') {
      validPatterns.push(/.+/); // Match any file
    }
  });

  return files.value.filter(file => {
    return validPatterns.some(pattern => pattern.test(file.meta.originalFileName) || pattern.test(file.meta.type));
  });
})
const filteredFiles = computed((): IFile[] => {
  const words = (search.value || '').toLowerCase().split(/\s+/);
  return getFilesByType(filter.value).filter(item => !search.value || words.every(word => item.meta.originalFileName.toLowerCase().includes(word)));
})

const fileIsSelected = (file: IFile): boolean => {
  return !!(selectedFiles.value.find(item => item === file));
}

const onFileClick = (file: IFile) => {
  if (!canSelect || globalStore.fileManager.multiple) {
    const index = selectedFiles.value.findIndex(item => item === file);
    if (index === -1) {
      selectedFiles.value.push(file);
    } else {
      selectedFiles.value.splice(index, 1);
    }
  } else {
    selectedFiles.value = [file];
  }
}

const load = () => {
  if (interfaceModel.value.webhook) {
    loading.value = true;
    return Services.get(interfaceModel.value.server_url + '/file/list/' + interfaceModel.value.hash, {
      'Content-Type': 'application/json',
      'X-Jms-Api-Key': interfaceModel.value.server_secret,
    })
      .then(response => files.value = response)
      .then(() => {
        selectedFiles.value = [];
        selected.forEach(selectedFile => {
          const file = files.value.find(file => file.path === selectedFile.path);
          if (file) {
            selectedFiles.value.push(file);
          }
        })
      })
      .catch(globalStore.catchError)
      .finally(() => loading.value = false);
  }
}

const promptUpload = () => {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  if (globalStore.fileManager.accept) {
    fileInput.accept = globalStore.fileManager.accept;
  }
  fileInput.addEventListener('change', function() {
    if (fileInput.files && fileInput.files.length > 0) {
      upload(fileInput.files);
    }
  });
  fileInput.click();
}

const upload = async (fileList: FileList) => {
  uploading.value = true;
  uploadProgress.value = 0;
  const promises = [];
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    if (file.size > phpStringSizeToBytes(serverSettings.uploadMaxSize)) {
      globalStore.catchError(new Error(
        'This file is exceeding the maximum size of ' + serverSettings.uploadMaxSize + ' defined by the server.'
      ));
    }
  }
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    promises.push(
      Services.upload(interfaceModel.value.server_url + '/file/upload/' + interfaceModel.value.hash, file, progress => uploadProgress.value = progress, {
        'X-Jms-Api-Key': interfaceModel.value.server_secret,
      })
      .then(response => {
        if (!files.value.find(item => item.path === response.internalPath)) {
          files.value.push({
            'path': response.internalPath,
            'meta': response.meta,
          })
        }
      }))
  }
  return Promise.all(promises)
    .catch(globalStore.catchError)
    .finally(() => uploading.value = false);
}

const remove = () => {
  globalStore.setPrompt({
    ...globalStore.prompt,
    visible: true,
    title: 'Delete selected files',
    body: `Are you sure you want to deleted the selected files (${selectedFiles.value.length})?`,
    btnText: 'Delete',
    btnIcon: 'mdi-delete',
    btnColor: 'error',
    callback: () => new Promise(resolve => {
      deleting.value = true;
      const promises = [];
      for (let i = 0; i < selectedFiles.value.length; i++) {
        const file = selectedFiles.value[i];
        promises.push(
          Services.delete(interfaceModel.value.server_url + '/file/delete/' + interfaceModel.value.hash + '/' + file.path, {
            'X-Jms-Api-Key': interfaceModel.value.server_secret,
          })
            .then(() => {
              selectedFiles.value = selectedFiles.value.filter(item => item.path !== file.path);
              files.value = files.value.filter(item => item.path !== file.path);
            })
        );
      }
      return Promise.all(promises)
        .catch(globalStore.catchError)
        .finally(resolve)
        .finally(() => deleting.value = false);
    })
  });
}

const select = () => {
  if (globalStore.fileManager.callback && selectedFiles.value.length > 0) {
    const files = globalStore.fileManager.multiple ? selectedFiles.value : selectedFiles.value[0];
    globalStore.fileManager.callback(files).then(() => {
      globalStore.fileManager.visible = false;
    });
  }
}

const download = () => {
  downloading.value = true;
  nextTick(() => {
    downloadFilesAsZip(selectedFiles.value.map(item => serverSettings.publicUrl + item.path), false, 'jsonms-file-download.zip');
    downloading.value = false;
  })
}

const close = () => {
  globalStore.fileManager.visible = false;
}

const dragOver = ref(false);
const onDrop = (event: DragEvent) => {
  if (canUpload) {
    dragOver.value = false;
    const droppedFiles = event.dataTransfer?.files;
    if (droppedFiles) {
      upload(droppedFiles);
    }
  }
}
const onDragEnter = () => {
  if (canUpload) {
    dragOver.value = true;
  }
}
const onDragLeave = () => {
  if (canUpload) {
    dragOver.value = false;
  }
}

watch(() => globalStore.fileManager.visible, () => {
  if (globalStore.fileManager.visible) {
    selectedFiles.value = [];
    load();
  }
})
</script>

<template>
  <v-dialog
    v-model="globalStore.fileManager.visible"
    :max-width="1000"
    persistent
    scrollable
  >
    <v-card
      title="File Manager"
      prepend-icon="mdi-file-multiple"
    >
      <template v-if="globalStore.session.loggedIn" #append>
        <v-tabs v-model="filter" class="my-n4">
          <v-tab value="all">
            All ({{ getFilesByType('all').length }})
          </v-tab>
          <v-tab value="image" :disabled="getFilesByType('image').length === 0">
            Images ({{ getFilesByType('image').length }})
          </v-tab>
          <v-tab value="video" :disabled="getFilesByType('video').length === 0">
            Videos ({{ getFilesByType('video').length }})
          </v-tab>
          <v-tab value="document" :disabled="getFilesByType('document').length === 0">
            Document ({{ getFilesByType('document').length }})
          </v-tab>
        </v-tabs>
      </template>
      <v-card-actions>
        <v-text-field
          v-model="search"
          label="Search"
          prepend-inner-icon="mdi-magnify"
          hide-details
        />
      </v-card-actions>
      <v-card-text
        :class="['pa-0', {
          'bg-background': !dragOver,
          'bg-primary': dragOver,
        }]"
        style="transition: background-color 300ms ease-in-out"
        @drop.prevent.stop="onDrop"
        @dragover.prevent.stop="onDragEnter"
        @dragleave.prevent.stop="onDragLeave"
      >
        <div v-if="loading || filteredFiles.length === 0 || !interfaceModel.webhook" class="d-flex align-center justify-center text-center" style="height: 33vh">
          <v-progress-circular
            v-if="loading"
            size="96"
            color="primary"
            indeterminate
          />
          <v-card
            v-else-if="(filteredFiles.length === 0 && !canUpload) || !interfaceModel.webhook"
            color="transparent"
            class="w-100 fill-height"
            tile
            flat
          >
            <v-empty-state
              v-if="interfaceModel.webhook"
              icon="mdi-file-hidden"
              title="Empty"
              text="No files available yet."
            />
            <v-empty-state
              v-else
              icon="mdi-help-network-outline"
              title="No endpoint detected"
              text="Files cannot be loaded without a properly configured webhook. Please check your project's settings in advanced mode."
            />
          </v-card>
          <v-card
            v-else-if="filteredFiles.length === 0 && canUpload"
            color="transparent"
            class="w-100 fill-height"
            tile
            flat
            @click="promptUpload"
          >
            <v-empty-state
              icon="mdi-gesture-tap-button"
              title="Touch to upload"
              text="Or drag and drop files here"
            />
          </v-card>
        </div>
        <div v-else class="pa-4" style="min-height: 33vh">
          <masonry-wall :items="filteredFiles" :ssr-columns="1" :column-width="200" :gap="16">
            <template #default="{ item }">
              <v-card
                :color="fileIsSelected(item) ? 'primary' : undefined"
                @click="onFileClick(item)"
              >
                <div v-if="!canSelect || globalStore.fileManager.multiple" class="position-absolute" style="top: 0; left: 0; z-index: 10">
                  <v-checkbox :model-value="fileIsSelected(item)" color="primary" base-color="surface" hide-details @click.stop.prevent="onFileClick(item)" />
                </div>
                <div class="bg-surface">
                  <v-img
                    v-if="item.meta.type.startsWith('image')"
                    :src="serverSettings.publicUrl + item.path"
                    :aspect-ratio="(item.meta.width || 1) / (item.meta.height || 1)"
                  >
                    <template #placeholder>
                      <v-overlay>
                        <v-progress-circular
                          indeterminate
                          size="16"
                          width="2"
                        />
                      </v-overlay>
                    </template>
                  </v-img>
                  <v-responsive v-else-if="item.meta.type.startsWith('video')" :aspect-ratio="(item.meta.width || 1) / (item.meta.height || 1)">
                    <video :src="serverSettings.publicUrl + item.path" width="100%" disablePictureInPicture />
                  </v-responsive>
                  <v-sheet v-else>
                    <v-responsive :aspect-ratio="16 / 9" class="d-flex align-center justify-center text-center">
                      <v-icon :icon="getFileIcon(item)" size="96" />
                    </v-responsive>
                  </v-sheet>
                </div>
                <v-card-title class="pb-0">
                  {{ item.meta.originalFileName }}
                </v-card-title>
                <v-card-subtitle class="pb-3">
                  {{ $formatBytes(item.meta.size) }}
                </v-card-subtitle>
              </v-card>
            </template>
          </masonry-wall>
        </div>
      </v-card-text>
      <template #actions>
        <v-btn
          v-if="canUpload"
          :loading="uploading"
          :disabled="uploading"
          :color="uploading ? undefined : 'secondary'"
          prepend-icon="mdi-upload"
          text="Upload"
          variant="outlined"
          class="px-3"
          @click="promptUpload"
        />
        <v-menu location="top">
          <template #activator="{ props }">
            <v-btn
              v-if="!canSelect || globalStore.fileManager.multiple"
              v-bind="props"
              :disabled="loading || selectedFiles.length === 0"
              variant="outlined"
            >
              Bulk Actions
              <v-icon icon="mdi-chevron-up" end />
            </v-btn>
          </template>
          <v-list>
            <v-list-item
              :loading="downloading"
              :disabled="!canDownload || loading || downloading || selectedFiles.length === 0"
              prepend-icon="mdi-download"
              @click="download"
            >
              <v-list-item-title>Download</v-list-item-title>
            </v-list-item>
            <v-list-item
              v-if="canDelete"
              :loading="downloading"
              :disabled="loading || deleting || selectedFiles.length === 0"
              prepend-icon="mdi-delete"
              base-color="error"
              @click="remove"
            >
              <v-list-item-title>Delete</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-spacer />
        <v-btn
          v-if="canSelect"
          :disabled="loading || selectedFiles.length === 0"
          :loading="loading"
          :color="selectedFiles.length === 0 ? undefined : 'primary'"
          :text="'Select (' + selectedFiles.length + ')'"
          variant="flat"
          class="px-3"
          @click="select"
        />
        <v-btn
          :text="globalStore.fileManager.canSelect ? 'Cancel' : 'Close'"
          class="px-3"
          @click="close"
        />
      </template>
    </v-card>
  </v-dialog>
</template>
