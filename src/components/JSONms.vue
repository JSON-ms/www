<script setup lang="ts">
import Toolbar from '@/components/Toolbar.vue';
import Sidebar from '@/components/Sidebar.vue';
import StructureEditor from '@/components/StructureEditor.vue';
import SitePreview from '@/components/SitePreview.vue';
import MigrationDialog from '@/components/MigrationDialog.vue';
import DataEditor from '@/components/DataEditor.vue';
import JsonEditModal from '@/components/JsonEditModal.vue';
import ActionBar from '@/components/ActionBar.vue';
import TypingsModal from '@/components/TypingsModal.vue';
import type {IStructure} from '@/interfaces';
import {useIframe} from '@/composables/iframe';
import {computed, nextTick, onMounted, ref, watch} from 'vue';
import {useGlobalStore} from '@/stores/global';
import {useUserData} from '@/composables/user-data';
import {type RouteLocationNormalizedGeneric, useRoute} from 'vue-router';
import router from '@/router';
import {useStructure} from '@/composables/structure';
import {useTypings} from '@/composables/typings';
import {useLayout} from '@/composables/layout';
import {useShortcut} from '@/composables/shortcut';
import {deepToRaw, getStructure} from '@/utils';
import NewStructureModal from '@/components/NewStructureModal.vue';
import type {VForm} from 'vuetify/components';
import Settings from '@/components/Settings.vue';
import Docs from '@/components/Docs.vue';
import FileManager from '@/components/FileManager.vue';
import {useModelStore} from '@/stores/model';

// Model & Props
const structure = defineModel<IStructure>({ required: true });
const { structures = [], autoload = false } = defineProps<{
  autoload?: boolean,
  structures: IStructure[],
}>();

const currentRoute = useRoute();
const globalStore = useGlobalStore();
const modelStore = useModelStore();
const { layoutSize, init: initLayout, windowWidth, mobileFrameWidth } = useLayout();
const showEditJson = ref(false);
const showTypings = ref(false);
const editJsonContent = ref('');
const showMigrationDialog = ref(false);
const showNewStructureModal = ref(false);
const structureEditor = ref<InstanceType<typeof StructureEditor> | null>();
const sitePreview = ref<InstanceType<typeof SitePreview> | null>();
const dataEditor = ref<InstanceType<typeof DataEditor> | null>();
const { serverSettings, structureParsedData, structureStates, structureHasSettingsError, getAvailableSection, deleteStructure, getAvailableLocale, structureHasSection, structureHasLocale, saveStructure, canSaveStructure, canDeleteStructure, resetStructure } = useStructure();
const { fetchUserData, canSave, saveUserData, downloading, userDataLoaded, userDataLoading, setUserData } = useUserData();
const { sendMessageToIframe } = useIframe();
const { syncTypings } = useTypings();

const tab = computed({
  get: () => {
    return globalStore.admin.structure ? globalStore.admin.tab : 'data';
  },
  set: (tab: any) => {
    globalStore.setAdmin({
      tab,
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

const bottomSheetData = ref<{
  text: string,
  icon?: string,
  color?: string,
  loading?: boolean,
}>({
  text: '',
});
const showBottomSheet = computed((): boolean => {
  return downloading.value || userDataLoading.value || structureStates.value.saved;
});
watch(() => downloading.value, () => bottomSheetData.value = { text: 'Downloading files and generating ZIP file. Please wait...', loading: true });
watch(() => userDataLoading.value, () => bottomSheetData.value = { text: 'Fetching user data. Please wait...', loading: true });

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

const onSaveStructureContent = () => {
  onSaveStructure();
}

const onSaveStructure = () => {
  if (canSaveStructure.value) {
    saveStructure().then(() => {
      bottomSheetData.value = { text: 'Structure saved!', color: 'success', icon: 'mdi-check' };
      syncTypings();
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
  if (autoload) {
    updateRoute('demo', 'home', 'en-US');
    refreshUserData();
    dataEditor.value?.resetValidation()
  }
}

const onEditJson = () => {
  showEditJson.value = true;
  editJsonContent.value = JSON.stringify(deepToRaw(modelStore.userData), null, 2);
}

const onMigrateData = () => {
  showMigrationDialog.value = true;
}

const onShowTypings = () => {
  showTypings.value = true;
}

const onApplyJsonContent = (json: any) => {
  setUserData(json);
}

const onStructureChange = (model: IStructure) => {
  resetStructure();
  modelStore.setStructure(model, {});
  userDataLoaded.value = false;
  if (autoload) {
    updateRoute(model.hash, getAvailableSection(), getAvailableLocale());
    setUserData({}, true);
    refreshUserData();
    dataEditor.value?.resetValidation()
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

const refreshUserData = (): Promise<any> => {
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

setUserData({}, true);
onMounted(() => {
  sitePreview.value?.structureEditor?.scrollToSection(getAvailableSection());
  structureEditor.value?.scrollToSection(getAvailableSection());
})
if (autoload) {
  refreshUserData();
}
</script>

<template>

  <!-- TOOLBAR -->
  <Toolbar
    v-model="structure"
    :structures="structures"
    :structure-data="structureParsedData"
    :default-locale="getAvailableLocale()"
    @refresh="onRefreshPreview"
    @create="onCreateStructure"
    @save="onSaveStructure"
    @delete="onDeleteStructure"
    @locale="onLocaleChange"
    @edit-json="onEditJson"
    @migrate-data="onMigrateData"
    @show-typings="onShowTypings"
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
    v-model="structure"
    :structure-data="structureParsedData"
    :user-data="modelStore.userData"
  />

  <!-- EDITOR -->
  <v-navigation-drawer
    v-model="showEditor"
    :width="showEditor ? layoutSize.editor.width : mobileFrameWidth"
    :temporary="layoutSize.editor.temporary"
    :scrim="false"
    location="start"
    color="transparent"
    border="0"
    flat
    tile
    disable-resize-watcher
    disable-route-watcher
  >
    <v-card class="w-100 fill-height d-flex flex-column pa-2 pl-0" theme="dark">
      <StructureEditor
        ref="structureEditor"
        v-model="structure"
        style="flex: 1"
        @save="onSaveStructureContent"
        @create="onCreateStructure"
        @change="onStructureContentChange"
      />
    </v-card>
  </v-navigation-drawer>

  <!-- PREVIEW -->
  <SitePreview
    ref="sitePreview"
    v-model="structure"
    :structure-data="structureParsedData"
    :user-data="modelStore.userData"
    @save="onSaveStructureContent"
    @create="onCreateStructure"
    @change="onStructureContentChange"
  />

  <!-- DATA -->
  <v-card class="fill-height" tile flat>
    <v-form
      ref="form"
      class="fill-height"
    >
      <v-expand-transition group>
        <div v-if="globalStore.admin.structure">
          <v-tabs v-model="tab" grow>
            <v-tab value="data">
              <v-icon icon="mdi-pencil" start />
              Data
            </v-tab>
            <v-tab value="settings">
              <v-icon start icon="mdi-cog" />
              Settings
              <v-icon v-if="structureHasSettingsError" color="warning" class="ml-3">
                mdi-alert
              </v-icon>
            </v-tab>
            <v-tab value="docs">
              <v-icon start icon="mdi-book" />
              Docs
            </v-tab>
          </v-tabs>
        </div>
      </v-expand-transition>
      <v-tabs-window v-model="tab" class="fill-height">
        <v-tabs-window-item value="data" class="fill-height">
          <DataEditor
            ref="dataEditor"
            v-model="structure"
            :structure-data="structureParsedData"
            :user-data="modelStore.userData"
            :server-settings="serverSettings"
            :loading="userDataLoading"
          />
        </v-tabs-window-item>
        <v-tabs-window-item value="settings">
          <Settings
            v-model="structure"
            :demo="!globalStore.session.loggedIn"
            :disabled="structure.type !== 'owner'"
          />
        </v-tabs-window-item>
        <v-tabs-window-item value="docs">
          <Docs />
        </v-tabs-window-item>
      </v-tabs-window>
    </v-form>
  </v-card>

  <!-- ACTIONS -->
  <v-expand-transition>
    <ActionBar
      v-if="showActionBar"
      :tab="tab"
    />
  </v-expand-transition>

  <!-- EDIT JSON MODAL -->
  <JsonEditModal
    v-model="editJsonContent"
    v-model:visible="showEditJson"
    @apply="onApplyJsonContent"
  />

  <!-- MIGRATION DIALOG -->
  <MigrationDialog
    v-model:visible="showMigrationDialog"
    :structures="structures"
  />

  <!-- TYPINGS MODAL -->
  <TypingsModal
    v-model="structure"
    v-model:visible="showTypings"
    :user-data="modelStore.userData"
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
        <v-progress-circular v-if="bottomSheetData.loading" color="primary" indeterminate class="mr-4" />
        <v-icon v-else-if="bottomSheetData.icon" :color="bottomSheetData.color" :icon="bottomSheetData.icon" />
      </template>
      <template #item>
        {{ bottomSheetData.text }}
      </template>
    </v-card>
  </v-bottom-sheet>

  <!-- FILE MANAGER -->
  <FileManager
    v-model="structure"
    :selected="globalStore.fileManager.selected"
    :can-select="globalStore.fileManager.canSelect"
    :can-upload="globalStore.session.loggedIn"
    :can-delete="globalStore.session.loggedIn"
    :server-settings="serverSettings"
    can-download
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
