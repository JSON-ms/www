<script setup lang="ts">
import {useUserData} from '@/composables/user-data';
import {useStructure} from '@/composables/structure';
import {useLayout} from '@/composables/layout';
import {useGlobalStore} from '@/stores/global';
import {computed} from "vue";
import {useTypings} from "@/composables/typings";
import {useModelStore} from "@/stores/model";
import TriggerMenu from "@/components/TriggerMenu.vue";
import type {IStructure, IStructureData} from "@/interfaces";

const structure = defineModel<IStructure>({ required: true });
const { structureData, userData } = defineProps<{
  structureData: IStructureData,
  userData: any,
}>();

const globalStore = useGlobalStore();
const modelStore = useModelStore();
const { structureIsPristine, setDefaultValues } = useStructure();
const { windowWidth, layoutSize } = useLayout();
const { saveUserData, resetUserData, userDataHasChanged, canInteractWithServer, canInteractWithSyncedFolder, userDataSaving, userDataSaved, canSave } = useUserData();

const saveMaxWidth = computed((): string => {
  const long = canInteractWithServer.value && canInteractWithSyncedFolder.value;
  return windowWidth.value > 800
    ? long ? '25rem' : '20rem'
    : '100%'
})

const onSetAsDefaultValues = () => {
  globalStore.setPrompt({
    ...globalStore.prompt,
    visible: true,
    title: 'Set Data As Default',
    body: 'The process will take the data entered in the form and apply it as default values in your YAML structure. Previous default values will be cleared and replaced with the new ones.',
    btnText: 'Proceed',
    btnIcon: 'mdi-text-box-check-outline',
    btnColor: 'warning',
    callback: () => new Promise(resolve => {
      setDefaultValues(modelStore.structure, modelStore.userData);
      resolve();
    })
  })
}

const onSyncWithLocalOnly = () => {
  useTypings().syncToFolder(modelStore.structure, ['data']);
  userDataSaved.value = true;
  setTimeout(() => userDataSaved.value = false, 1000);
}

const onSyncWithEnpointOnly = () => {
  saveUserData(modelStore.structure, modelStore.userData, true);
}

const save = () => {
  saveUserData();
}

const reset = () => {
  resetUserData();
}
</script>

<template>
  <TriggerMenu
    :model-value="structureData"
    :structure="structure"
    :user-data="userData"
    location="data"
  />
  <div
    v-if="globalStore.session.loggedIn"
    class="w-100 pr-3"
    style="gap: 1rem; max-width: max-content"
  >
    <v-scroll-y-transition group hide-on-leave>
      <div v-if="!structureIsPristine">
        <v-tooltip v-if="layoutSize.data < 850" location="top" text="Please save your structure before continuing.">
          <template #activator="{ props }">
            <v-btn icon color="error" variant="tonal" style="cursor: default">
              <v-icon v-bind="props" icon="mdi-alert" />
            </v-btn>
          </template>
        </v-tooltip>
        <v-alert
          v-else
          density="compact"
          variant="tonal"
          type="warning"
        >
          <div class="d-flex">
            <span class="text-truncate">Please save your structure before continuing.</span>
          </div>
        </v-alert>
      </div>
<!--        <div v-else-if="userDataLoaded && (structureHasError() || userDataHasError)">-->
<!--          <v-tooltip v-if="layoutSize.data < 850" location="top" text="Please correct the errors in the form before submitting.">-->
<!--            <template #activator="{ props }">-->
<!--              <v-btn icon color="warning" variant="tonal" style="cursor: default">-->
<!--                <v-icon v-bind="props" icon="mdi-alert" />-->
<!--              </v-btn>-->
<!--            </template>-->
<!--          </v-tooltip>-->
<!--          <v-alert-->
<!--            v-else-->
<!--            density="compact"-->
<!--            variant="tonal"-->
<!--            type="warning"-->
<!--            icon="mdi-alert"-->
<!--          >-->
<!--            <div class="d-flex">-->
<!--              <span class="text-truncate">Please correct the errors in the form before submitting.</span>-->
<!--            </div>-->
<!--          </v-alert>-->
<!--        </div>-->
      <div v-else-if="!canInteractWithServer && !canInteractWithSyncedFolder">
        <v-tooltip v-if="layoutSize.data < 850" location="top" text="You need to define your endpoint URL or sync with a local folder.">
          <template #activator="{ props }">
            <v-btn icon color="error" variant="tonal" style="cursor: default">
              <v-icon v-bind="props" icon="mdi-alert" />
            </v-btn>
          </template>
        </v-tooltip>
        <v-alert
          v-else
          density="compact"
          variant="tonal"
          type="error"
          icon="mdi-alert"
        >
          <div class="d-flex">
            <span class="text-truncate">You need to define your endpoint URL or sync with a local folder.</span>
          </div>
        </v-alert>
      </div>
    </v-scroll-y-transition>
  </div>
  <v-spacer v-if="windowWidth > 800" style="flex: 0" />
  <div
    class="d-flex align-center pr-3"
    :style="[{
      flex: 1,
      maxWidth: saveMaxWidth,
    }, 'gap: 0.5rem; flex: 1']"
  >
    <v-menu location="top right">
      <template #activator="{ props }">
        <div class="position-relative" style="flex: 1">
          <v-btn
            :loading="userDataSaving"
            :disabled="!canSave"
            :variant="userDataSaved ? 'outlined' : 'flat'"
            :readonly="userDataSaved"
            :color="canSave ? 'primary' : undefined"
            :class="['w-100', {
              'pr-16': globalStore.admin.structure
            }]"
            @click.stop.prevent="save"
          >
            <template v-if="!userDataSaved">
              <v-icon v-if="canInteractWithSyncedFolder" start icon="mdi-sync-circle" />
              <v-icon v-else start icon="mdi-content-save" />
              <span v-if="canInteractWithServer && canInteractWithSyncedFolder">Save & Sync</span>
              <span v-else-if="canInteractWithServer">Save</span>
              <span v-else>Sync</span>
            </template>
            <template v-else>
              <v-icon start icon="mdi-check" />
              <span v-if="canInteractWithServer && canInteractWithSyncedFolder">Saved!</span>
              <span v-else-if="canInteractWithServer">Saved!</span>
              <span v-else>Synced!</span>
            </template>
          </v-btn>
          <v-btn
            v-if="globalStore.admin.structure"
            v-bind="props"
            :disabled="!userDataHasChanged"
            variant="flat"
            :color="userDataHasChanged ? 'primary' : undefined"
            class="position-absolute"
            style="right: 0; border-top-left-radius: 0; border-bottom-left-radius: 0"
            min-width="0"
          >
            <v-icon icon="mdi-chevron-up" />
          </v-btn>
        </div>
      </template>
      <v-list>
        <v-list-item
          title="Set as default values"
          prepend-icon="mdi-text-box-check-outline"
          @click="onSetAsDefaultValues"
        />
        <v-list-item
          title="Sync with local file only"
          prepend-icon="mdi-sync-circle"
          :disabled="!canInteractWithSyncedFolder || !canSave"
          @click="onSyncWithLocalOnly"
        />
        <v-list-item
          title="Sync with endpoint only"
          prepend-icon="mdi-webhook"
          :disabled="!canInteractWithServer || !canSave"
          @click="onSyncWithEnpointOnly"
        />
      </v-list>
    </v-menu>
    <v-btn
      :disabled="!userDataHasChanged"
      variant="text"
      style="flex: 1"
      @click="reset"
    >
      Reset
    </v-btn>
  </div>
</template>

