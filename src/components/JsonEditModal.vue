<script setup lang="ts">
import {VAceEditor} from 'vue3-ace-editor';
import {useGlobalStore} from '@/stores/global';

const emit = defineEmits(['apply']);
const content = defineModel<string>({ required: true });
const visible = defineModel<boolean>('visible');
const options = {
  fontSize: 14,
  showPrintMargin: false,
  tabSize: 2,
};
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
          v-model:value="content"
          :options="options"
          style="height: 66vh"
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
