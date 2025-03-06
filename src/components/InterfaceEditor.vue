<script setup lang="ts">
import { computed, onMounted, type Ref, ref } from 'vue';
import { VAceEditor } from 'vue3-ace-editor';
import 'ace-builds/src-noconflict/mode-yaml';
import 'ace-builds/src-noconflict/theme-github_dark';
import type { IInterface } from '@/interfaces';
import type { VAceEditorInstance } from 'vue3-ace-editor/types';

const emit = defineEmits(['save', 'create', 'changing', 'changed'])
const selectedInterface = defineModel<IInterface>({ required: true });
const {
  updateTimeout = 2000,
} = defineProps<{
  updateTimeout?: number,
}>();
let changeTimeout: any = 0;
const editor: Ref<VAceEditorInstance | null> = ref(null);
const value = computed({
  get() {
    return selectedInterface.value.content;
  },
  set(value: string) {
    emit('changing', value);
    clearTimeout(changeTimeout);
    changeTimeout = setTimeout(() => {
      selectedInterface.value.content = value;
      emit('changed', value);
    }, updateTimeout)
  }
});

onMounted(() => {
  const instance = editor.value?.getAceInstance();
  if (instance) {
    instance.commands.addCommand({
      name: "saveFile",
      bindKey: { win: "Ctrl-S", mac: "Command-S" },
      exec: function() {
        emit('save', instance.getValue());
      },
      readOnly: false
    });
    instance.commands.addCommand({
      name: "newFile",
      bindKey: { win: "Ctrl-N", mac: "Command-N" },
      exec: function() {
        emit('create', instance.getValue());
      },
      readOnly: false
    });
    // instance.session.setAnnotations([{
    //   row: 10,
    //   column: 0,
    //   text: "Just a test to display warnings",
    //   type: "error"
    // }]);
  }
})
</script>

<template>
  <v-sheet theme="dark" class="pa-2 pl-0">
    <v-ace-editor
      ref="editor"
      v-model:value="value"
      :options="{
        tabSize: 2,
        useSoftTabs: true
      }"
      lang="yaml"
      theme="github_dark"
      style="height: 100%"
    />
  </v-sheet>
</template>
