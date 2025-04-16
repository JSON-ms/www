<script setup lang="ts">
import {computed, onMounted, type Ref, ref, defineExpose, onBeforeUnmount, watch} from 'vue';
import { VAceEditor } from 'vue3-ace-editor';
import type { VAceEditorInstance } from 'vue3-ace-editor/types';
import type {IStructure} from '@/interfaces';
import {useStructure} from '@/composables/structure';
import '@/plugins/aceeditor';
import {useGlobalStore} from '@/stores/global';
import yaml from 'js-yaml';

const emit = defineEmits(['save', 'create', 'change'])
const structure = defineModel<IStructure>({ required: true });
const { canSaveStructure, yamlException } = useStructure();
const globalStore = useGlobalStore();
const editor: Ref<VAceEditorInstance | null> = ref(null);
const value = computed({
  get() {
    return structure.value.content;
  },
  set(value: string) {
    // console.log(structureParsedData.value)
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
    const line = findNeedleInString(structure.value.content, '  ' + section + ':');
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
        if (canSaveStructure.value) {
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
  onChange();
})
onBeforeUnmount(() => {
  // editor.value?.destroy();
})

const canEditContent = computed((): boolean => {
  const types = structure.value.type.split(',');
  for (let i = 0; i < types.length; i++) {
    const type = types[i];
    if (['owner', 'structure'].includes(type)) {
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

const suggestions = [
  { key: "global", required: true, children: [
    { key: "title", required: true },
    { key: "logo" },
    { key: "preview" }
  ]},
  // { key: 'sections', required: true, children: [
  //   { key: 'string', children: [
  //     { key: 'label', required: true },
  //     { key: 'icon' },
  //     { key: 'fields', children: [
  //       { key: 'string',  }
  //     ] },
  //   ]}
  // ]}
];

function validateYamlStructure(editor: any) {
  const annotations = [];
  try {
    const session = editor.getSession();
    const yamlText = session.getValue();
    const parsed = yaml.load(yamlText);

    suggestions.forEach(section => {
      const sectionValue = parsed[section.key];

      // Section is missing
      if (!sectionValue) return;

      const allowedKeys = section.children.map(c => c.key);

      for (const key in sectionValue) {
        if (!allowedKeys.includes(key)) {
          const lineIndex = findLineNumber(yamlText, `${key}:`);
          annotations.push({
            row: lineIndex,
            column: 0,
            text: `Unexpected key "${key}" in "${section.key}"`,
            type: "error",
          });
        }
      }
    });

  } catch (e) {
    annotations.push({
      row: 0,
      column: 0,
      text: e.message,
      type: "error"
    });
  }

  return annotations;
}

function updateAnnotations(editor) {
  const annotations = validateYamlStructure(editor);
  editor.getSession().setAnnotations(annotations);
}

// Utility to find the line number of a key (naive approach)
function findLineNumber(yamlText: string, search: string) {
  const lines = yamlText.split("\n");
  return lines.findIndex(line => line.trim().startsWith(search));
}

function onChange() {
  if (editor.value) {
    updateAnnotations(editor.value?.getAceInstance());
  }
}

function getCompletionsFromSuggestions(parsed, suggestions, path = []) {
  const completions = [];

  suggestions.forEach(suggestion => {
    const fullPath = [...path, suggestion.key];
    const currentValue = getNestedValue(parsed, path);

    // Suggest the missing parent key if it doesn't exist
    const parentExists = path.length === 0 || currentValue !== undefined;
    if (!parentExists) return;

    const currentSection = getNestedValue(parsed, fullPath);
    const hasSection = currentSection && typeof currentSection === 'object';

    // Suggest the parent key itself if it doesn't exist
    if (getNestedValue(parsed, fullPath) === undefined) {
      completions.push({
        caption: suggestion.key,
        value: `${suggestion.key}:\n  `,
        meta: `Missing ${suggestion.key} key`,
      });
    }

    if (suggestion.children && hasSection) {
      const existingKeys = Object.keys(currentSection);
      const missingKeys = suggestion.children.filter(child =>
        !existingKeys.includes(child.key)
      );

      missingKeys.forEach(child => {
        completions.push({
          caption: child.key,
          value: `${child.key}: `,
          meta: `missing key in ${fullPath.join('.')}`,
        });
      });

      // Recurse into children
      completions.push(...getCompletionsFromSuggestions(parsed, suggestion.children, fullPath));
    }
  });

  return completions;
}

function getNestedValue(obj, path) {
  return path.reduce((acc, key) => acc && acc[key], obj);
}

const options = {
  fontSize: 14,
  showPrintMargin: false,
  enableBasicAutocompletion: [{
    getCompletions: function(editor, session, pos, prefix, callback) {
      const yamlText = session.getValue();
      let completions = [];

      try {
        const parsed = yaml.load(yamlText);
        completions = getCompletionsFromSuggestions(parsed, suggestions);
      } catch (e) {
        // ignore parse errors
      }

      callback(null, completions);
    }
  }],
  enableLiveAutocompletion: true,
  tabSize: 2,
  useSoftTabs: true,
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
    @change="onChange"
  />
</template>

<style>
.ace_tooltip {
  transform: var(--tooltip-position);
}
</style>
