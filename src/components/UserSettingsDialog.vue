<script setup lang="ts">
import {useGlobalStore} from "@/stores/global";
import {computed, ref, watch} from "vue";
import type {IUserSettings} from "@/interfaces";
import {deepToRaw, objectsAreDifferent} from "@/utils";
import {useTypings} from "@/composables/typings";
import {useModelStore} from "@/stores/model";
import ModalDialog from '@/components/ModalDialog.vue';

const visible = defineModel<boolean>('visible', { required: true });
const globalStore = useGlobalStore();
const modelStore = useModelStore();
const userSettings = ref<IUserSettings>(structuredClone(deepToRaw(globalStore.userSettings.data)));

const locationList = [
  { title: 'Start', value: 'start' },
  { title: 'End', value: 'end' },
];

// Syncing From...
type TSyncFromValue = 'blueprintsReadFromData' | 'blueprintsReadFromStructure'
type TSyncFrom = { title: string, value: TSyncFromValue, hint?: string };
const syncingFromList: TSyncFrom[] = [
  { title: 'Data', value: 'blueprintsReadFromData', hint: 'Will update the user data based on your local data.json file.' },
  { title: 'Structure', value: 'blueprintsReadFromStructure', hint: 'Will update the structure based on your local structure.yml file.' },
];
const syncingFrom = computed({
  get(): TSyncFrom[] {
    return syncingFromList.filter(item => userSettings.value[item.value]);
  },
  set(itemList: TSyncFrom[]) {
    syncingFromList.forEach(syncingItem => {
      userSettings.value[syncingItem.value] = !!(itemList.find(item => item.value === syncingItem.value));
    })
  }
});

// Syncing To...
type TSyncToValue = 'blueprintsIncludeTypings' | 'blueprintsReadFromData' | 'blueprintsWriteToData' | 'blueprintsWriteToDefault' | 'blueprintsWriteToIndex' | 'blueprintsWriteToStructure' | 'blueprintsWriteToTypings' | 'blueprintsWriteToSettings'
type TSyncTo = { title: string, value: TSyncToValue, hint?: string };
const syncingToList: TSyncTo[] = [
  { title: 'Data', value: 'blueprintsWriteToData', hint: 'Will update your data.json file based on the data you save on this interface.' },
  { title: 'Default', value: 'blueprintsWriteToDefault', hint: 'Will update your default.ts file based on your parsed YAML structure.' },
  { title: 'Typings', value: 'blueprintsWriteToTypings', hint: 'Will update your typings.ts file based on your YAML structure.' },
  { title: 'Structure', value: 'blueprintsWriteToStructure', hint: 'Will update your structure.yml and structure.json files based on your YAML structure.' },
  { title: 'Settings', value: 'blueprintsWriteToSettings', hint: 'Will update your settings.js file according to your project\'s configuration.' },
  { title: 'Index', value: 'blueprintsWriteToIndex', hint: 'Will update a index.ts file that will import everything your need to use your synced files within your local project.' },
];
const syncingTo = computed({
  get(): TSyncTo[] {
    return syncingToList.filter(item => userSettings.value[item.value]);
  },
  set(itemList: TSyncTo[]) {
    syncingToList.forEach(syncingItem => {
      userSettings.value[syncingItem.value] = !!(itemList.find(item => item.value === syncingItem.value));
    })
  }
});


const hasChanges = computed((): boolean => {
  return objectsAreDifferent(userSettings.value, globalStore.userSettings.data);
})

const apply = () => {
  globalStore.setUserSettings(userSettings.value);
  useTypings().syncToFolder(modelStore.structure);
  visible.value = false;
}

const close = () => {
  visible.value = false;
}

watch(() => visible.value, () => {
  if (visible.value) {
    userSettings.value = structuredClone(deepToRaw(globalStore.userSettings.data));
  }
})
</script>

<template>
  <ModalDialog
    v-model="visible"
    :persistent="hasChanges"
    title="User Settings"
    prepend-icon="mdi-tune"
    width="1000"
    scrollable
  >
    <v-card-text class="bg-background pa-4">
      <v-row>
        <v-col cols="12" md="6" class="d-flex flex-column" style="gap: 1rem">
          <v-card title="Code Editor">
            <v-card-text class="d-flex flex-column" style="gap: 1rem">
              <v-number-input
                v-model="userSettings.editorFontSize"
                :min="6"
                label="Font size"
                hint="This shows the size of the text in the code editor, measured in pixels."
                persistent-hint
              />
              <v-number-input
                v-model="userSettings.editorTabSize"
                :min="2"
                :step="2"
                label="Tab size"
                hint="This sets how many spaces will be added when you press the tab key. Does not apply to the structure editor in YAML."
                persistent-hint
              />
              <v-checkbox
                v-model="userSettings.editorShowPrintMargin"
                label="Show print margin"
                hint="A vertical line will appear at 80 characters to help you write clearer code."
                persistent-hint
              />
            </v-card-text>
          </v-card>

          <v-card title="Layout">
            <v-card-text class="d-flex flex-column" style="gap: 1rem">
              <v-select
                v-model="userSettings.layoutEditorLocation"
                :items="locationList"
                label="Editor Location"
                hint="Displays the editor in a different location according to the layout."
                persistent-hint
              />
              <v-select
                v-model="userSettings.layoutSitePreviewLocation"
                :items="locationList"
                label="Site Preview Location"
                hint="Displays the site preview in a different location according to the layout."
                persistent-hint
              />
              <v-checkbox
                v-model="userSettings.layoutSitePreviewKeepRatio"
                label="Keep Site Preview Ratio"
                hint="It will zoom in and out to preserve the aspect ratio and adhere to a 16:9 format when in Desktop mode."
                persistent-hint
              />
              <v-checkbox
                v-model="userSettings.layoutSitePreviewPadding"
                label="Site Preview Inner Padding"
                hint="Adds a little padding that separates the site preview from the layout."
                persistent-hint
              />
              <v-checkbox
                v-model="userSettings.layoutAutoSplit"
                label="Auto-Split Data Section"
                hint="Whenever there is sufficient space, automatically divide the data section to maximize your available real estate."
                persistent-hint
              />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6" class="d-flex flex-column" style="gap: 1rem">
          <v-card title="Structure Editor">
            <v-card-text class="d-flex flex-column" style="gap: 1rem">
              <v-switch
                v-model="userSettings.editorLiveUpdate"
                color="primary"
                label="Live update"
                hint="Your admin panel will refresh automatically whenever you make a change, but it might slow down if your YAML file gets too big."
                persistent-hint
                inset
              />
              <v-number-input
                v-model="userSettings.editorUpdateTimeout"
                :disabled="userSettings.editorLiveUpdate"
                label="Update timeout (milliseconds)"
                hint="There will be a delay of X milliseconds before the admin panel updates after a change."
                persistent-hint
              />
              <v-switch
                v-model="userSettings.editorAutoSyncFrom"
                color="primary"
                label="Auto-sync from local files"
                hint="Updates the structure automatically whenever changes are detected in your locally synced files."
                persistent-hint
                inset
              />
              <v-number-input
                v-model="userSettings.editorAutoSyncInterval"
                :disabled="!userSettings.editorAutoSyncFrom"
                label="Update timeout (milliseconds)"
                hint="There will be a delay of X milliseconds before the structure updates after a change."
                persistent-hint
              />
              <v-switch
                v-model="userSettings.autoCleanData"
                color="primary"
                label="Auto-Clean Data"
                hint="Data is auto-cleaned on every edit. Anything not matching the updated structure will be lost."
                persistent-hint
                inset
              />
            </v-card-text>
          </v-card>

          <v-card title="User Form">
            <v-card-text class="d-flex flex-column" style="gap: 1rem">
              <v-switch
                v-model="userSettings.userDataAutoFetch"
                color="primary"
                label="Auto-fetch"
                hint="Data will be automatically retrieved when the structure is loaded."
                persistent-hint
                inset
              />
            </v-card-text>
          </v-card>

          <v-card title="Synchronization">
            <v-card-text class="d-flex flex-column" style="gap: 1rem">

              <v-checkbox
                v-model="userSettings.blueprintsIncludeTypings"
                label="Include Typings"
                hint="When enabled, typings will be included in your synced files."
                persistent-hint
              />

              <v-alert
                type="warning"
                variant="tonal"
                density="compact"
              >
                To prevent accidental overriding, <strong>Read From</strong> values are only synchronized once when loading the project.
              </v-alert>

              <v-select
                v-model="syncingFrom"
                :items="syncingFromList"
                :menu-props="{ maxWidth: '100%' }"
                :list-props="{ lines: 'two' }"
                label="Read From"
                multiple
                hint="Locale files that your project will read from."
                persistent-hint
                return-object
              >
                <template #item="{ props: itemProps, item }">
                  <v-list-item
                    v-bind="itemProps"
                    :subtitle="item.raw.hint"
                  >
                    <template #prepend>
                      <v-checkbox-btn :model-value="syncingFrom.includes(item.raw)" />
                    </template>
                  </v-list-item>
                </template>
              </v-select>

              <v-select
                v-model="syncingTo"
                :items="syncingToList"
                :menu-props="{ maxWidth: '100%' }"
                :list-props="{ lines: 'two' }"
                label="Write To"
                multiple
                hint="Locale files that your project will write to."
                persistent-hint
                return-object
              >
                <template #item="{ props: itemProps, item }">
                  <v-list-item
                    v-bind="itemProps"
                    :subtitle="item.raw.hint"
                  >
                    <template #prepend>
                      <v-checkbox-btn :model-value="syncingTo.includes(item.raw)" />
                    </template>
                  </v-list-item>
                </template>
              </v-select>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-actions>
      <v-btn
        :disabled="!hasChanges"
        :color="hasChanges ? 'primary' : undefined"
        variant="flat"
        @click="apply"
      >
        Apply
      </v-btn>
      <v-btn
        @click="close"
      >
        <span>Cancel</span>
      </v-btn>
    </v-card-actions>
  </ModalDialog>
</template>
