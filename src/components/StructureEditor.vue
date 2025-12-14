<script setup lang="ts">
import {computed, onMounted, type Ref, ref, defineExpose, onBeforeUnmount, watch, nextTick} from 'vue';
import { VAceEditor } from 'vue3-ace-editor';
import type { VAceEditorInstance } from 'vue3-ace-editor/types';
import type {IStructure} from '@/interfaces';
import {useStructure} from '@/composables/structure';
import '@/plugins/aceeditor';
import {useGlobalStore} from '@/stores/global';
import {useTypings} from "@/composables/typings";
import {useModelStore} from "@/stores/model";
// import yaml from 'js-yaml';

const emit = defineEmits(['save', 'create', 'change'])
const structure = defineModel<IStructure>({ required: true });
const { columns = false } = defineProps<{
  columns?: boolean
}>();
const { canSaveStructure, yamlException, structureStates } = useStructure();
const modelStore = useModelStore();
const { getTypescriptTypings, getTypescriptDefaultObj, isFolderSynced, lastStateTimestamp, askToSyncFolder, unSyncFolder } = useTypings();
const showParsingDelay = ref(false);
const progressBarValue = ref(0);
const progressBarCompleted = ref(false);
const globalStore = useGlobalStore();
const structureEditor: Ref<VAceEditorInstance | null> = ref(null);
const blueprintEditorTypings: Ref<VAceEditorInstance | null> = ref(null);
const blueprintEditorDefault: Ref<VAceEditorInstance | null> = ref(null);
const blueprintTypings = ref('')
const blueprintDefault = ref('')
const blueprintLanguage = ref<'typescript' | 'php'>('typescript')

const tab = computed({
  get: () => {
    return globalStore.admin.structure ? globalStore.admin.editorTab : 'structure';
  },
  set: (tab: any) => {
    globalStore.setAdmin({
      editorTab: tab,
    })
  },
})

let parseInterval: any;
let showParseInterval: any;
let parseValueInterval: any;
const value = computed({
  get() {
    return structure.value.content;
  },
  set(value: string) {
    if (globalStore.userSettings.data.editorLiveUpdate) {
      emit('change', value);
    } else {
      modelStore.setTemporaryContent(value);

      clearInterval(parseInterval);
      clearInterval(showParseInterval);
      clearInterval(parseValueInterval);

      progressBarCompleted.value = false;
      showParsingDelay.value = false;
      progressBarValue.value = 0;
      showParseInterval = setTimeout(() => showParsingDelay.value = true);
      parseValueInterval = setTimeout(() => progressBarValue.value = 100, 100);

      parseInterval = setTimeout(() => {
        emit('change', value);
        progressBarCompleted.value = true;
        setTimeout(() => showParsingDelay.value = true);
        setTimeout(() => {
          progressBarCompleted.value = false;
          showParsingDelay.value = false;
          progressBarValue.value = 0;
        }, 500);
      }, globalStore.userSettings.data.editorUpdateTimeout + 250)
    }
  }
});

const setFocus = () => {
  structureEditor.value?.focus();
  structureEditor.value?.getAceInstance().selection.moveTo(0, 0)
  structureEditor.value?.getAceInstance().renderer.scrollToLine(0, false, true);
}

const setCaretToOriginalPosition = () => {
  if (lastPosition) {
    structureEditor.value?.focus();
    structureEditor.value?.getAceInstance().selection.moveTo(lastPosition.row, lastPosition.column)
    lastPosition = null;
  }
}

const onSaveStructure = () => {
  emit('save', structure.value);
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
  const instance = structureEditor.value?.getAceInstance();
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

const updateBlueprintContent = () => {
  if (blueprintLanguage.value === 'typescript') {
    blueprintTypings.value = getTypescriptTypings();
    blueprintDefault.value = getTypescriptDefaultObj();
  }
}
watch(blueprintLanguage, updateBlueprintContent)
watch(tab, () => {
  if (tab.value === 'blueprints') {
    updateBlueprintContent();
  } else if (tab.value === 'structure') {
    nextTick(tryToAddCommands)
  }
})
updateBlueprintContent();

const onUnSync = () => {
  unSyncFolder(modelStore.structure, 'typescript', true);
}
const onSync = () => {
  askToSyncFolder(modelStore.structure, 'typescript');
}

let lastPosition: { row: number, column: number } | null;
let hasAddedCommands = false;
const tryToAddCommands = () => {
  if (!hasAddedCommands) {
    const instance = structureEditor.value?.getAceInstance();
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

            // If live update not enabled and parsing not completed, emit changes first.
            emit('change', instance.getValue());
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

      hasAddedCommands = true;
    }
  }
}
onMounted(() => {
  tryToAddCommands();
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
  const instance = structureEditor.value?.getAceInstance();
  if (instance) {
    instance.session.setAnnotations(yamlException.value);
  }
})

defineExpose({
  scrollToSection,
  setFocus,
  setCaretToOriginalPosition,
});

// const suggestions = [
//   { key: "global", required: true, children: [
//     { key: "title", required: true },
//     { key: "logo" },
//     { key: "preview" }
//   ]},
//   // { key: 'sections', required: true, children: [
//   //   { key: 'string', children: [
//   //     { key: 'label', required: true },
//   //     { key: 'icon' },
//   //     { key: 'fields', children: [
//   //       { key: 'string',  }
//   //     ] },
//   //   ]}
//   // ]}
// ];

// function validateYamlStructure(editor: any) {
//   const annotations = [];
//   try {
//     const session = editor.getSession();
//     const yamlText = session.getValue();
//     const parsed = yaml.load(yamlText);
//     if (parsed) {
//       suggestions.forEach(section => {
//         const sectionValue = parsed[section.key];
//
//         // Section is missing
//         if (!sectionValue) return;
//
//         const allowedKeys = section.children.map(c => c.key);
//
//         for (const key in sectionValue) {
//           if (!allowedKeys.includes(key)) {
//             const lineIndex = findLineNumber(yamlText, `${key}:`);
//             annotations.push({
//               row: lineIndex,
//               column: 0,
//               text: `Unexpected key "${key}" in "${section.key}"`,
//               type: "error",
//             });
//           }
//         }
//       });
//     }
//   } catch (e: Error) {
//     annotations.push({
//       row: 0,
//       column: 0,
//       text: e.message,
//       type: "error"
//     });
//   }
//
//   return annotations;
// }

// function updateAnnotations(editor) {
//   const annotations = validateYamlStructure(editor);
//   editor.getSession().setAnnotations(annotations);
// }

// Utility to find the line number of a key (naive approach)
// function findLineNumber(yamlText: string, search: string) {
//   const lines = yamlText.split("\n");
//   return lines.findIndex(line => line.trim().startsWith(search));
// }

function onChange() {
  if (structureEditor.value) {
//     updateAnnotations(editor.value?.getAceInstance());
  }
}

// function getCompletionsFromSuggestions(parsed, suggestions, path = []) {
//   const completions = [];
//
//   suggestions.forEach(suggestion => {
//     const fullPath = [...path, suggestion.key];
//     const currentValue = getNestedValue(parsed, path);
//
//     // Suggest the missing parent key if it doesn't exist
//     const parentExists = path.length === 0 || currentValue !== undefined;
//     if (!parentExists) return;
//
//     const currentSection = getNestedValue(parsed, fullPath);
//     const hasSection = currentSection && typeof currentSection === 'object';
//
//     // Suggest the parent key itself if it doesn't exist
//     if (getNestedValue(parsed, fullPath) === undefined) {
//       completions.push({
//         caption: suggestion.key,
//         value: `${suggestion.key}:\n  `,
//         meta: `Missing ${suggestion.key} key`,
//       });
//     }
//
//     if (suggestion.children && hasSection) {
//       const existingKeys = Object.keys(currentSection);
//       const missingKeys = suggestion.children.filter(child =>
//         !existingKeys.includes(child.key)
//       );
//
//       missingKeys.forEach(child => {
//         completions.push({
//           caption: child.key,
//           value: `${child.key}: `,
//           meta: `missing key in ${fullPath.join('.')}`,
//         });
//       });
//
//       // Recurse into children
//       completions.push(...getCompletionsFromSuggestions(parsed, suggestion.children, fullPath));
//     }
//   });
//
//   return completions;
// }

// function getNestedValue(obj, path) {
//   return path.reduce((acc, key) => acc && acc[key], obj);
// }

const options = ref({
  fontSize: 14,
  showPrintMargin: false,
  tabSize: 2,
  useSoftTabs: true,
  // enableBasicAutocompletion: [{
  //   getCompletions: function(editor, session, pos, prefix, callback) {
  //     const yamlText = session.getValue();
  //     let completions = [];
  //
  //     try {
  //       const parsed = yaml.load(yamlText);
  //       completions = getCompletionsFromSuggestions(parsed, suggestions);
  //     } catch (e) {
  //       // ignore parse errors
  //     }
  //
  //     callback(null, completions);
  //   }
  // }],
  // enableLiveAutocompletion: true,
});
const structureOptions = computed(() => {
  return { ...options.value, tabSize: 2 };
});

watch(() => globalStore.userSettings.data, () => {
  options.value.fontSize = globalStore.userSettings.data.editorFontSize;
  options.value.tabSize = globalStore.userSettings.data.editorTabSize;
  options.value.showPrintMargin = globalStore.userSettings.data.editorShowPrintMargin;

  if (structureEditor.value) {
    const instance = structureEditor.value.getAceInstance();
    instance.setOptions(structureOptions.value);
  }
  if (blueprintEditorTypings.value) {
    const instance = blueprintEditorTypings.value.getAceInstance();
    instance.setOptions(options.value);
  }
  if (blueprintEditorDefault.value) {
    const instance = blueprintEditorDefault.value.getAceInstance();
    instance.setOptions(options.value);
  }

  updateBlueprintContent();
}, { immediate: true })
</script>

<template>
  <v-empty-state
    v-if="!canEditContent"
    icon="mdi-pencil-off-outline"
    title="Unauthorized"
    text="Access to this template has not been granted by the owner."
  />
  <div v-else class="d-flex flex-column">
    <v-tabs v-model="tab">
      <v-tab value="structure">
        <v-icon icon="mdi-invoice-text-edit-outline" start />
        Structure
      </v-tab>
      <v-tab value="blueprints">
        <v-icon icon="mdi-ruler-square" start />
        Blueprints
      </v-tab>
      <v-spacer />
      <div class="d-flex align-center pr-1" style="gap: 0.5rem">
        <v-tooltip
          text="Save (CTRL+S)"
          location="bottom"
        >
          <template #activator="{ props }">
            <v-btn
              v-if="structure"
              v-bind="props"
              :loading="structureStates.saving"
              :disabled="!canSaveStructure || structureStates.saving || structureStates.saved"
              :prepend-icon="!structureStates.saved ? 'mdi-content-save' : 'mdi-check'"
              variant="text"
              color="primary"
              size="small"
              @mousedown.stop.prevent="onSaveStructure"
            >
              <span v-if="!structureStates.saved">Save</span>
              <span v-else>Saved!</span>
            </v-btn>
          </template>
        </v-tooltip>
        <v-tooltip
          text="Toggle local folder synchronization"
          location="bottom"
        >
          <template #activator="{ props }">
            <v-btn
              v-if="isFolderSynced(modelStore.structure, 'typescript')"
              v-bind="props"
              :key="lastStateTimestamp"
              color="secondary"
              size="small"
              prepend-icon="mdi-sync-circle"
              variant="text"
              @click="onUnSync"
            >
              Synced!
            </v-btn>
            <v-btn
              v-else
              v-bind="props"
              :key="lastStateTimestamp + '_'"
              size="small"
              prepend-icon="mdi-sync-off"
              variant="text"
              @click="onSync"
            >
              Sync
            </v-btn>
          </template>
        </v-tooltip>

        <div
          v-if="!globalStore.userSettings.data.editorLiveUpdate"
          :style="{
            '--parsing-delay': globalStore.userSettings.data.editorUpdateTimeout + 'ms'
          }"
          class="mr-3 d-flex align-center position-relative"
        >
          <v-icon
            v-if="progressBarCompleted"
            icon="mdi-check-circle"
            color="secondary"
            size="16"
            class="position-absolute"
            style="top: 1px"
          />
          <v-progress-circular
            v-if="showParsingDelay"
            :model-value="progressBarValue"
            color="secondary"
            size="16"
            width="2"
          />
          <v-progress-circular
            v-else
            size="16"
            width="2"
          />
        </div>
      </div>
    </v-tabs>
    <v-tabs-window v-model="tab" style="flex: 1" class="fill-height">
      <v-tabs-window-item value="structure" class="fill-height">
        <v-ace-editor
          ref="structureEditor"
          v-model:value="value"
          :options="structureOptions"
          :style="{
            '--tooltip-position': globalStore.admin.drawer
              ? 'translateY(-4rem) translateX(-261px)'
              : 'translateY(-4rem)'
          }"
          lang="yaml"
          theme="github_dark"
          class="fill-height"
          @change="onChange"
        />
      </v-tabs-window-item>
      <v-tabs-window-item value="blueprints" class="fill-height">
        <div
          :class="['d-flex fill-height', {
            'flex-column': !columns
          }]"
        >
          <div v-if="globalStore.userSettings.data.blueprintsIncludeTypings" class="d-flex flex-column" style="flex: 1">
            <v-alert tile class="py-6">
              <strong>Readonly:</strong> Typings are generated automatically.
            </v-alert>
            <v-ace-editor
              ref="blueprintEditorTypings"
              v-model:value="blueprintTypings"
              :options="options"
              :lang="blueprintLanguage"
              theme="github_dark"
              class="fill-height"
              readonly
            />
          </div>
          <div class="d-flex flex-column" style="flex: 1">
            <v-alert tile class="py-6">
              <strong>Readonly:</strong> Default objects are generated automatically.
            </v-alert>
            <v-ace-editor
              ref="blueprintEditorDefault"
              v-model:value="blueprintDefault"
              :options="options"
              :lang="blueprintLanguage"
              theme="github_dark"
              class="fill-height"
              readonly
            />
          </div>
        </div>
      </v-tabs-window-item>
    </v-tabs-window>
  </div>
</template>

<style>
:root {
  --tooltip-position: none;
  --parsing-delay: 1000ms;
}
.ace_tooltip {
  transform: var(--tooltip-position);
}
.v-progress-circular__overlay {
  transition: all var(--parsing-delay) linear;
}
</style>
