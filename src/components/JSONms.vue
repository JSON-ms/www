<script setup lang="ts">
import Toolbar from '@/components/Toolbar.vue';
import Sidebar from '@/components/Sidebar.vue';
import UserSettingsDialog from '@/components/UserSettingsDialog.vue';
import StructureEditor from '@/components/StructureEditor.vue';
import SitePreview from '@/components/SitePreview.vue';
import MigrationDialog from '@/components/MigrationDialog.vue';
import DataEditor from '@/components/DataEditor.vue';
import JsonEditModal from '@/components/JsonEditModal.vue';
import ActionBar from '@/components/ActionBar.vue';
import type {IStructure} from '@/interfaces';
import {useIframe} from '@/composables/iframe';
import {computed, nextTick, onMounted, ref, watch} from 'vue';
import {useGlobalStore} from '@/stores/global';
import {useUserData} from '@/composables/user-data';
import {type RouteLocationNormalizedGeneric, useRoute} from 'vue-router';
import router from '@/router';
import {useStructure} from '@/composables/structure';
import {useLayout} from '@/composables/layout';
import {useShortcut} from '@/composables/shortcut';
import {deepToRaw, getStructure} from '@/utils';
import NewStructureModal from '@/components/NewStructureModal.vue';
import type {VForm} from 'vuetify/components';
import Docs from '@/components/Docs.vue';
import FileManager from '@/components/FileManager.vue';
import {useModelStore} from '@/stores/model';
import structureMd from "../../docs/structure.md";
import {useSyncing} from "@/composables/syncing";
import { useTheme } from 'vuetify'

// Model & Props
const structure = defineModel<IStructure>({ required: true });
const { structures = [] } = defineProps<{
  structures: IStructure[],
}>();

const currentRoute = useRoute();
const globalStore = useGlobalStore();
const modelStore = useModelStore();
const { layoutSize, init: initLayout, windowWidth, mobileFrameWidth } = useLayout();
const showEditJson = ref(false);
const editJsonContent = ref('');
const showMigrationDialog = ref(false);
const showNewStructureModal = ref(false);
const structureEditor = ref<InstanceType<typeof StructureEditor> | null>();
const sitePreview = ref<InstanceType<typeof SitePreview> | null>();
const dataEditor = ref<InstanceType<typeof DataEditor> | null>();
const { serverSettings, structureParsedData, structureStates, structureHasSettingsError, getAvailableSection, deleteStructure, getAvailableLocale, structureHasSection, structureHasLocale, saveStructure, canSaveStructure, canDeleteStructure, resetStructure } = useStructure();
const { fetchUserData, canSave, saveUserData, downloading, userDataLoaded, userDataLoading, setUserData } = useUserData();
const { sendMessageToIframe } = useIframe();
const { isFolderSynced, syncFromFolder, autoAskToSyncFolder, syncToFolder, unSyncFolder, stopWatchSnapshotDirectory, watchSnapshotDirectory } = useSyncing();

globalStore.initUserSettings();
globalStore.initUIConfig();

const splitTabs = computed((): boolean => {
  if (![globalStore.uiConfig.data, globalStore.uiConfig.documentation].every(item => item)) {
    return false;
  }
  return globalStore.admin.structure && globalStore.userSettings.data.layoutAutoSplit && layoutSize.value.data >= (mobileFrameWidth.value * 2);
});
const tab = computed({
  get: () => {
    if (globalStore.uiConfig.data && !globalStore.uiConfig.documentation) {
      return 'data';
    }
    if (!globalStore.uiConfig.data && globalStore.uiConfig.documentation) {
      return 'docs';
    }
    const advancedMode = globalStore.admin.structure && windowWidth.value > 900;
    if (advancedMode && splitTabs.value) {
      return globalStore.admin.dataTab === 'data'
        ? 'docs'
        : globalStore.admin.dataTab
    }
    return advancedMode
      ? globalStore.admin.dataTab
      : 'data';
  },
  set: (tab: any) => {
    globalStore.setAdmin({
      dataTab: tab,
    })
  },
})

const updateRoute = (hash = currentRoute.params.hash, section = currentRoute.params.section, locale = currentRoute.params.locale): Promise<void> => {
  return new Promise(resolve => {
    const toRoute = '/admin/' + hash + '/' + section + '/' + locale;
    if (toRoute !== currentRoute.fullPath) {
      router.replace(toRoute).then(() => resolve());
    } else {
      resolve();
    }
  });
}

const showActionBar = computed((): boolean => {
  return ['data'].includes((tab.value || '').toString());
});

const showBottomSheet = computed((): boolean => {
  return globalStore.bottomSheet.visible || structureStates.value.saved;
});
watch(() => downloading.value, () => {
  if (downloading.value) {
    globalStore.showBottomSheet('Downloading files and generating ZIP file. Please wait...', null, null, true)
  } else {
    globalStore.hideBottomSheet();
  }
});
watch(() => userDataLoading.value, () => {
  if (userDataLoading.value) {
    globalStore.showBottomSheet('Fetching user data. Please wait...', null, null, true)
  } else {
    globalStore.hideBottomSheet();
  }
});

const showEditor = computed({
  get(): boolean {
    return windowWidth.value > 900
      && globalStore.admin.previewMode !== 'desktop'
      && globalStore.admin.structure;
  },
  set(visible: boolean) {
    globalStore.setAdmin({ structure: visible })
  }
});

const onRefreshPreview = () => {
  sitePreview.value?.refresh();
}

const onCreateStructure = () => {
  showNewStructureModal.value = true;
}

const onApplyNewStructure = (template: string) => {
  resetStructure();

  const newStructure = getStructure(template);
  modelStore.setStructure(getStructure(template))
  setUserData({}, true);

  newStructure.label = '';
  showNewStructureModal.value = false;

  // If template is blank
  if (template === '') {
    tab.value = 'docs';
    globalStore.admin.previewMode = null;
  }
  // If template has content
  else if (tab.value === 'docs') {
    tab.value = 'data';
  }

  globalStore.admin.structure = true;
  nextTick(() => {
    if (structureEditor.value) {
      structureEditor.value.setFocus();
      sitePreview.value?.structureEditor?.setFocus();
    }
    dataEditor.value?.resetValidation()
  })

  updateRoute('new', getAvailableSection(), getAvailableLocale());
}

const onSaveStructure = () => {
  if (canSaveStructure.value) {
    modelStore.structure.content = modelStore.temporaryContent || modelStore.structure.content;
    saveStructure().then(() => {
      globalStore.showBottomSheet('Structure saved!', 'success', 'mdi-check');
      syncToFolder(modelStore.structure, ['structure', 'default', 'typings', 'settings', 'index']);
      const newModel = modelStore.structure;
      globalStore.addStructure(newModel);
      updateRoute(newModel.hash, getAvailableSection(), getAvailableLocale()).then(() => {
        // Set cursor to original position
        setTimeout(() => {
          if (structureEditor.value) {
            structureEditor.value.setCaretToOriginalPosition();
          }
        }, 300)
      });
    })
  }
}

const onSaveUserData = () => {
  if (canSave.value) {
    saveUserData();
  }
}

const onDeleteStructure = (model: IStructure) => {
  if (canDeleteStructure.value) {
    deleteStructure().then(() => {
      globalStore.removeStructure(model);
      onApplyNewStructure('');
      showNewStructureModal.value = true;
    });
  }
}

const onLocaleChange = (locale: string) => {
  updateRoute(currentRoute.params.hash, currentRoute.params.section, locale);
  sendMessageToIframe('locale', locale)
}

const onLogout = (response: any) => {
  modelStore.setStructure(response.structures[0], {});
  userDataLoaded.value = false;
  setUserData({}, true);
  if (globalStore.userSettings.data.userDataAutoFetch) {
    updateRoute('demo', 'home', 'en-US');
    refreshUserData();
    dataEditor.value?.resetValidation()
  }
}

const onEditJson = () => {
  showEditJson.value = true;
  editJsonContent.value = JSON.stringify(deepToRaw(modelStore.userData), null, globalStore.userSettings.data.editorTabSize);
}

const onCleanJson = (data: any) => {
  editJsonContent.value = JSON.stringify(data || {}, null, globalStore.userSettings.data.editorTabSize);
}

const onApplyJsonContent = (json: any) => {
  setUserData(json);
}

const onMigrateData = () => {
  showMigrationDialog.value = true;
}

let oldModel: IStructure | null = null;
const onStructureChange = (model: IStructure) => {
  if (oldModel) {
    unSyncFolder(oldModel);
  }
  oldModel = model;
  resetStructure();
  modelStore.setStructure(model, {});
  userDataLoaded.value = false;
  if (globalStore.userSettings.data.userDataAutoFetch) {
    updateRoute(model.hash, getAvailableSection(), getAvailableLocale());
    setUserData({}, true);
    refreshUserData();
    dataEditor.value?.resetValidation()
  }
  if (globalStore.session.loggedIn) {
    autoAskToSyncFolder(model);
  }
}

const onStructureContentChange = (content: string) => {
  structure.value.content = content;
  setUserData(modelStore.userData)
}

watch(() => globalStore.admin.structure, () => {
  if (globalStore.admin.structure && globalStore.admin.drawer && layoutSize.value.drawer.temporary) {
    globalStore.admin.drawer = false;
  }
})

const autoSyncCallback = () => {
  stopWatchSnapshotDirectory();
  if (globalStore.userSettings.data.editorAutoSyncFrom) {
    watchSnapshotDirectory(globalStore.userSettings.data.editorAutoSyncInterval);
  }
}
watch(() => [
  globalStore.userSettings.data.editorAutoSyncFrom,
  globalStore.userSettings.data.editorAutoSyncInterval,
], autoSyncCallback, { deep: true });
autoSyncCallback();
window.addEventListener('fs-change', () => {
  syncFromFolder(structure.value);
})

const theme = useTheme();
const toggleDarkMode = () => {
  theme.change(globalStore.userSettings.data.appearanceDarkMode ? 'dark' : 'light');
}
watch(() => [
  globalStore.userSettings.data.appearanceDarkMode,
], toggleDarkMode);
toggleDarkMode();

const refreshUserData = async (): Promise<any> => {
  return fetchUserData().then((response: any) => {
    setUserData(response.data, true);
    serverSettings.value = response.settings;
    return response;
  }).then(() => {
    nextTick(() => {
      dataEditor.value?.resetValidation()
    })
  })
}

const checkRoute = (to: RouteLocationNormalizedGeneric, from: RouteLocationNormalizedGeneric) => {
  const validHashes = ['demo', 'new'];
  const structureFound = globalStore.session.structures.find(item => item.hash === to.params.hash);

  // Check if the structure is found or if the hash is one of the valid hashes
  if (!structureFound && !validHashes.includes(to.params.hash.toString())) {
    updateRoute('demo', getAvailableSection(), getAvailableLocale());
  } else if (!structureHasSection(to.params.section.toString()) || !structureHasLocale(to.params.locale.toString())) {
    updateRoute(to.params.hash, getAvailableSection(), getAvailableLocale());
  }

  if (from.params.section !== to.params.section) {
    tab.value = 'data';
  }

  sitePreview.value?.structureEditor?.scrollToSection(getAvailableSection());
  structureEditor.value?.scrollToSection(getAvailableSection());
}
router.afterEach(checkRoute);
checkRoute(currentRoute, currentRoute);

useShortcut({
  onCreate: onCreateStructure,
  onSave: onSaveUserData,
  onSiteRefresh: onRefreshPreview,
}).listen();
initLayout();

const envInitialUserData = import.meta.env.VITE_USER_DATA;
const initialUserData = JSON.parse(envInitialUserData || '{}') || {};
setUserData(initialUserData, true);
onMounted(() => {
  sitePreview.value?.structureEditor?.scrollToSection(getAvailableSection());
  structureEditor.value?.scrollToSection(getAvailableSection());
})
if (!envInitialUserData && globalStore.userSettings.data.userDataAutoFetch) {
  refreshUserData();
}
if (globalStore.session.loggedIn) {
  autoAskToSyncFolder(modelStore.structure);
}
</script>

<template>

  <!-- TOOLBAR -->
  <Toolbar
    v-if="globalStore.uiConfig.toolbar"
    v-model="structure"
    :structures="structures"
    :structure-data="structureParsedData"
    :default-locale="getAvailableLocale()"
    :user-data="modelStore.userData"
    @refresh="onRefreshPreview"
    @create="onCreateStructure"
    @save="onSaveStructure"
    @delete="onDeleteStructure"
    @locale="onLocaleChange"
    @edit-json="onEditJson"
    @migrate-data="onMigrateData"
    @update:model-value="onStructureChange"
    @logout="onLogout"
  />

  <!-- NEW STRUCTURE MODAL -->
  <NewStructureModal
    v-model="showNewStructureModal"
    @apply="onApplyNewStructure"
  />

  <!-- SIDEBAR -->
  <Sidebar
    v-if="globalStore.uiConfig.sidebar"
    :structure-data="structureParsedData"
    :user-data="modelStore.userData"
    :server-settings="serverSettings"
  />

  <!-- EDITOR -->
  <v-navigation-drawer
    v-if="globalStore.uiConfig.structure"
    v-model="showEditor"
    :width="layoutSize.editor.width"
    :temporary="layoutSize.editor.temporary"
    :permanent="showEditor && !layoutSize.editor.temporary"
    :location="globalStore.userSettings.data.layoutEditorLocation"
    :scrim="false"
    floating
    color="transparent"
    border="0"
    flat
    tile
    disable-resize-watcher
    disable-route-watcher
  >
    <v-card class="w-100 fill-height d-flex flex-column" theme="dark" :style="{ left: showEditor ? 0 : '-1px' }" tile flat>
      <StructureEditor
        ref="structureEditor"
        v-model="structure"
        :structure-data="structureParsedData"
        :user-data="modelStore.userData"
        style="flex: 1"
        @save="onSaveStructure"
        @create="onCreateStructure"
        @change="onStructureContentChange"
      />
    </v-card>
  </v-navigation-drawer>

  <!-- PREVIEW -->
  <SitePreview
    v-if="globalStore.uiConfig.site_preview"
    ref="sitePreview"
    v-model="structure"
    :structure-data="structureParsedData"
    :user-data="modelStore.userData"
    @save="onSaveStructure"
    @create="onCreateStructure"
    @change="onStructureContentChange"
  />

  <!-- DATA -->
  <v-card class="fill-height" tile flat>
    <v-form
      ref="form"
      class="fill-height"
    >
      <template v-if="!splitTabs && (globalStore.uiConfig.data && globalStore.uiConfig.documentation)">
        <v-expand-transition group>
          <div v-if="globalStore.admin.structure && windowWidth > 900">
            <v-tabs v-model="tab" height="44" grow>
              <v-tab v-if="globalStore.uiConfig.data" value="data">
                <v-icon icon="mdi-pencil" start />
                Data
              </v-tab>
              <v-tab v-if="globalStore.uiConfig.documentation" value="docs">
                <v-icon start icon="mdi-book" />
                Docs
              </v-tab>
            </v-tabs>
          </div>
        </v-expand-transition>
      </template>
      <v-tabs-window v-model="tab" class="fill-height" style="flex: 1">
        <v-tabs-window-item v-if="globalStore.uiConfig.data" value="data" class="fill-height">
          <DataEditor
            ref="dataEditor"
            v-model="structure"
            :structure-data="structureParsedData"
            :user-data="modelStore.userData"
            :server-settings="serverSettings"
            :loading="userDataLoading"
          />
        </v-tabs-window-item>
        <v-tabs-window-item v-if="globalStore.uiConfig.documentation" value="docs">
          <v-card tile flat>
            <v-card-text>
              <Docs v-model="structureMd" />
            </v-card-text>
          </v-card>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-form>
  </v-card>

  <v-navigation-drawer
    v-if="globalStore.uiConfig.data && splitTabs"
    :width="layoutSize.data / 2"
    location="start"
    disable-resize-watcher
    disable-route-watcher
  >
    <template v-if="globalStore.uiConfig.data && globalStore.uiConfig.data_footer" #append>
      <v-divider />
      <div class="d-flex align-center justify-space-between pl-3" style="height: 4rem">
        <ActionBar
          :model-value="structure"
          :structure-data="structureParsedData"
          :user-data="modelStore.userData"
        />
      </div>
    </template>

    <DataEditor
      v-if="globalStore.uiConfig.data"
      ref="dataEditor"
      v-model="structure"
      :structure-data="structureParsedData"
      :user-data="modelStore.userData"
      :server-settings="serverSettings"
      :loading="userDataLoading"
    />
  </v-navigation-drawer>

  <!-- ACTIONS -->
  <v-expand-transition>
    <v-app-bar
      v-if="globalStore.uiConfig.data && globalStore.uiConfig.data_footer && showActionBar"
      flat
      location="bottom"
      color="background"
      class="pl-3 py-0"
      height="44"
    >
      <div class="w-100 d-flex align-center justify-space-between">
        <ActionBar
          :model-value="structure"
          :structure-data="structureParsedData"
          :user-data="modelStore.userData"
        />
      </div>
    </v-app-bar>
  </v-expand-transition>

  <!-- EDIT JSON MODAL -->
  <JsonEditModal
    v-model="editJsonContent"
    v-model:visible="showEditJson"
    @apply="onApplyJsonContent"
    @clean="onCleanJson"
  />

  <!-- MIGRATION DIALOG -->
  <MigrationDialog
    v-model:visible="showMigrationDialog"
    :structures="structures"
  />

  <!-- DOWNLOAD DATA BOTTOM SHEET -->
  <v-bottom-sheet
    v-model="showBottomSheet"
    :scrim="false"
    inset
    persistent
    no-click-animation
    location="top"
    max-width="max-content"
  >
    <v-card theme="dark" style="margin: 0 auto">
      <template #prepend>
        <v-progress-circular v-if="globalStore.bottomSheet.loading" color="primary" indeterminate class="mr-4" />
        <v-icon v-else-if="globalStore.bottomSheet.icon" :color="globalStore.bottomSheet.color" :icon="globalStore.bottomSheet.icon" />
      </template>
      <template #item>
        {{ globalStore.bottomSheet.text }}
      </template>
    </v-card>
  </v-bottom-sheet>

  <!-- FILE MANAGER -->
  <FileManager
    v-model="structure"
    :selected="globalStore.fileManager.selected"
    :can-select="globalStore.fileManager.canSelect"
    :can-upload="globalStore.session.loggedIn"
    :can-add-to-local="isFolderSynced(structure)"
    :can-delete="globalStore.session.loggedIn || isFolderSynced(structure)"
    :server-settings="serverSettings"
    can-download
  />

  <!-- USER SETTINGS -->
  <UserSettingsDialog
    v-model:visible="globalStore.userSettings.visible"
  />
</template>

<style lang="scss">
.v-main {
  transition: padding-left 200ms ease,
    padding-right 200ms ease !important;
}
.v-bottom-sheet > .v-bottom-sheet__content.v-overlay__content {
  margin: 0 auto !important;
}
</style>
