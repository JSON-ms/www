<script setup lang="ts">
import {VAceEditor} from 'vue3-ace-editor';
import {useGlobalStore} from '@/stores/global';
import {type Ref, ref, watch} from "vue";
import type {VAceEditorInstance} from "vue3-ace-editor/types";

const emit = defineEmits(['apply']);
const editor: Ref<VAceEditorInstance | null> = ref(null);
const content = defineModel<string>({ required: true });
const visible = defineModel<boolean>('visible');
const options = ref({
  fontSize: 14,
  showPrintMargin: false,
  tabSize: 2,
});
const globalStore = useGlobalStore();

const apply = () => {
  try {
    const json = JSON.parse(content.value);
    emit('apply', json);
    visible.value = false;
  } catch (e: any) {
    globalStore.setError({
      title: 'JSON Error',
      icon: 'mdi-alert',
      visible: true,
      body: e.message,
    });
  }
}

const close = () => {
  visible.value = false;
}

watch(() => globalStore.userSettings.data, () => {
  options.value.fontSize = globalStore.userSettings.data.editorFontSize;
  options.value.tabSize = globalStore.userSettings.data.editorTabSize;
  options.value.showPrintMargin = globalStore.userSettings.data.editorShowPrintMargin;

  if (editor.value) {
    const instance = editor.value.getAceInstance();
    instance.setOptions(options.value);
  }
}, { immediate: true })
</script>

<template>
  <v-dialog
    v-model="visible"
    max-width="800"
    persistent
    scrollable
  >
    <v-card
      title="Edit JSON"
      prepend-icon="mdi-code-json"
    >
      <v-card theme="dark" class="pa-1 pl-0" tile elevation="0">
        <v-ace-editor
          ref="editor"
          v-model:value="content"
          :options="options"
          style="height: 66dvh"
          lang="json"
          theme="github_dark"
        />
      </v-card>
      <template #actions>
        <v-btn
          variant="flat"
          color="primary"
          text="Apply"
          class="px-3"
          @click="apply"
        />
        <v-btn
          text="Cancel"
          class="px-3"
          @click="close"
        />
      </template>
    </v-card>
  </v-dialog>
</template>
