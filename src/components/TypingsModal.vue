<script setup lang="ts">
import {VAceEditor} from 'vue3-ace-editor';
import {computed, ref, watch} from 'vue';
import type {IInterface} from '@/interfaces';
import {useTypings} from '@/composables/typings';

const interfaceModel = defineModel<IInterface>({ required: true });
const visible = defineModel<boolean>('visible');

const language = ref<'typescript' | 'php'>('typescript')
const content = ref('')
const defaultObjOnly = ref(false)
const options = {
  fontSize: 14,
  showPrintMargin: false,
  tabSize: 2,
};
const { getTypescriptTypings, getPhpTypings, typingFileHandle, askForSyncTypings, syncTypings } = useTypings();

const sync = async () => {
  await askForSyncTypings('typescript');
  await syncTypings();
}

const unsync = async () => {
  if (interfaceModel.value.hash) {
    const instance = typingFileHandle.value[interfaceModel.value.hash];
    if (instance) {
      instance[language.value] = null;
    }
  }
}

const close = () => {
  visible.value = false;
}

const updateContent = () => {
  if (language.value === 'typescript') {
    content.value = getTypescriptTypings(defaultObjOnly.value);
  } else if (language.value === 'php') {
    content.value = getPhpTypings(defaultObjOnly.value);
  }
}

const handle = computed((): FileSystemFileHandle | null => {
  if (interfaceModel.value.hash) {
    const instance = typingFileHandle.value[interfaceModel.value.hash];
    if (instance) {
      return instance[language.value] || null;
    }
  }
  return null;
})

watch(language, updateContent)
watch(defaultObjOnly, updateContent)
watch(visible, () => {
  if (visible.value) {
    updateContent();
  }
})
</script>

<template>
  <v-dialog
    v-model="visible"
    :max-width="800"
    scrollable
  >
    <v-card
      title="Typings"
      prepend-icon="mdi-language-typescript"
    >
      <template #append>
        <v-checkbox
          v-model="defaultObjOnly"
          label="Default objects only"
          hide-details
        />
<!--        <v-tabs v-model="language" class="my-n8">-->
<!--          <v-tab value="typescript">-->
<!--            <v-icon icon="mdi-language-typescript" start />-->
<!--            Typescript-->
<!--          </v-tab>-->
<!--          <v-tab value="php">-->
<!--            <v-icon icon="mdi-language-php" start />-->
<!--            PHP-->
<!--          </v-tab>-->
<!--        </v-tabs>-->
      </template>
      <v-card theme="dark" class="pa-1 pl-0" tile elevation="0">
        <v-ace-editor
          v-model:value="content"
          :options="options"
          style="height: 66vh"
          :lang="language"
          theme="github_dark"
          class="px-3"
          readonly
        />
      </v-card>
      <template #actions>
        <span v-if="handle" class="text-truncate">
          Automatically synced with local file <strong>{{ handle.name }}
        </strong></span>
        <v-spacer />
        <v-btn
          v-if="!handle"
          prepend-icon="mdi-file-sync"
          variant="flat"
          color="primary"
          text="Sync with local file system"
          class="px-3"
          @click="sync"
        />
        <v-btn
          v-else
          prepend-icon="mdi-close"
          variant="outlined"
          color="primary"
          text="Unsync"
          class="px-3"
          @click="unsync"
        ></v-btn>
        <v-btn
          text="Close"
          @click="close"
        />
      </template>
    </v-card>
  </v-dialog>
</template>
