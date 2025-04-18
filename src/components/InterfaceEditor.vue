<script setup lang="ts">
import {computed, onMounted, type Ref, ref, defineExpose, onBeforeUnmount, watch} from 'vue';
import { VAceEditor } from 'vue3-ace-editor';
import type { VAceEditorInstance } from 'vue3-ace-editor/types';
import type {IInterface} from '@/interfaces';
import {useInterface} from '@/composables/interface';
import '@/plugins/aceeditor';
import {useGlobalStore} from '@/stores/global';

const emit = defineEmits(['save', 'create', 'change'])
const interfaceModel = defineModel<IInterface>({ required: true });
const { canSaveInterface, yamlException } = useInterface();
const globalStore = useGlobalStore();
const editor: Ref<VAceEditorInstance | null> = ref(null);
const value = computed({
  get() {
    return interfaceModel.value.content;
  },
  set(value: string) {
    // console.log(interfaceParsedData.value)
    emit('change', value);
  }
});

const setFocus = () => {
  editor.value?.focus();
  editor.value?.getAceInstance().selection.moveTo(0, 0)
  editor.value?.getAceInstance().renderer.scrollToLine(0, false, true);
}

const setCaretToOriginalPosition = () => {
  if (lastPosition) {
    editor.value?.focus();
    editor.value?.getAceInstance().selection.moveTo(lastPosition.row, lastPosition.column)
    lastPosition = null;
  }
}

const findNeedleInString = (haystack: string, needle: string) => {
  const lines = haystack.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(needle)) {
      return i;
    }
  }
  return -1;
}

const scrollToSection = (section: string) => {
  const instance = editor.value?.getAceInstance();
  if (instance) {
    const annotations = [];
    const line = findNeedleInString(interfaceModel.value.content, '  ' + section + ':');
    if (line) {
      instance.renderer.scrollToLine(line, false, true);
      annotations.push({
        row: line,
        column: 0,
        text: "Current section",
        type: "info"
      });
    }
    instance.session.setAnnotations(annotations);
  }
}

let lastPosition: { row: number, column: number } | null;
onMounted(() => {
  const instance = editor.value?.getAceInstance();
  if (instance) {
    instance.commands.addCommand({
      name: "saveFile",
      bindKey: { win: "Ctrl-S", mac: "Command-S" },
      exec: function() {
        if (canSaveInterface.value) {
          lastPosition = {
            column: instance.selection.anchor.column,
            row: instance.selection.anchor.row,
          };
          emit('save', instance.getValue());
        }
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
  }
})
onBeforeUnmount(() => {
  // editor.value?.destroy();
})

const canEditContent = computed((): boolean => {
  const types = interfaceModel.value.type.split(',');
  for (let i = 0; i < types.length; i++) {
    const type = types[i];
    if (['owner', 'interface'].includes(type)) {
      return true;
    }
  }
  return false;
})

watch(() => yamlException.value, () => {
  const instance = editor.value?.getAceInstance();
  if (instance) {
    instance.session.setAnnotations(yamlException.value);
  }
})

defineExpose({
  scrollToSection,
  setFocus,
  setCaretToOriginalPosition,
});

// const yamlStructure = {
//   global: ['title', 'copyright', 'logo', 'preview', 'theme'],
//   theme: ['default', 'light', 'dark'],
//   light: ['primary'],
//   dark: ['primary']
// };

const options = {
  // enableBasicAutocompletion: [{
  //   getCompletions: (editor, session, pos, prefix, callback) => {
  //     console.log(pos, prefix)
  //     callback(null, [
  //       {value: 'global', score: 1, meta: 'Global site configurations'},
  //       {value: 'locales', score: 2, meta: 'I18n Internationalization'},
  //     ]);
  //   },
  // }],
  fontSize: 14,
  showPrintMargin: false,
  // enableLiveAutocompletion: true,
  tabSize: 2,
  useSoftTabs: true
}
</script>

<template>
  <v-empty-state
    v-if="!canEditContent"
    icon="mdi-pencil-off-outline"
    title="Unauthorized"
    text="Access to this template has not been granted by the owner."
  />
  <v-ace-editor
    v-else
    ref="editor"
    v-model:value="value"
    :options="options"
    :style="{
      '--tooltip-position': globalStore.admin.drawer
        ? 'translateY(-4rem) translateX(-261px)'
        : 'translateY(-4rem)'
    }"
    class="fill-height"
    lang="yaml"
    theme="github_dark"
  />
</template>

<style>
.ace_tooltip {
  transform: var(--tooltip-position);
}
</style>
