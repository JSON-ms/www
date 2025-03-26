<script setup lang="ts">
import Toolbar from '@/components/Toolbar.vue';
import Sidebar from '@/components/Sidebar.vue';
import InterfaceEditor from '@/components/InterfaceEditor.vue';
import SitePreview from '@/components/SitePreview.vue';
import DataEditor from '@/components/DataEditor.vue';
import JsonEditModal from '@/components/JsonEditModal.vue';
import ActionBar from '@/components/ActionBar.vue';
import TypingsModal from '@/components/TypingsModal.vue';
import type {IInterface} from '@/interfaces';
import {useIframe} from '@/composables/iframe';
import {computed, nextTick, ref, watch} from 'vue';
import {useGlobalStore} from '@/stores/global';
import {useUserData} from '@/composables/user-data';
import {type RouteLocationNormalizedGeneric, useRoute} from 'vue-router';
import router from '@/router';
import {useInterface} from '@/composables/interface';
import {useTypings} from '@/composables/typings';
import {useLayout} from '@/composables/layout';
import {useShortcut} from '@/composables/shortcut';
import {deepToRaw, getInterface} from '@/utils';
import NewInterfaceModal from '@/components/NewInterfaceModal.vue';
import type {VForm} from 'vuetify/components';
import Settings from '@/components/Settings.vue';
import Docs from '@/components/Docs.vue';

// Model & Props
const interfaceModel = defineModel<IInterface>({ required: true });
const { interfaces = [], autoload = false } = defineProps<{
  autoload?: boolean,
  interfaces: IInterface[],
}>();

const currentRoute = useRoute();
const globalStore = useGlobalStore();
const { layoutSize, init: initLayout, windowWidth, mobileFrameWidth } = useLayout();
const showEditJson = ref(false);
const showTypings = ref(false);
const editJsonContent = ref('');
const showNewInterfaceModal = ref(false);
const interfaceEditor = ref<InstanceType<typeof InterfaceEditor> | null>();
const sitePreview = ref<InstanceType<typeof SitePreview> | null>();
const dataEditor = ref<InstanceType<typeof DataEditor> | null>();
const { serverSettings, interfaceParsedData, getParsedInterfaceData, interfaceHasSettingsError, setInterfaceModel, getAvailableSection, deleteInterface, getAvailableLocale, interfaceHasSection, interfaceHasLocale, setInterfaceOriginalData, setInterfaceData, saveInterface, canSaveInterface, canDeleteInterface } = useInterface(interfaceModel);
const userData = ref({});
const { fetchUserData, applyUserData, canSave, saveUserData, downloading, userDataLoaded, userDataLoading } = useUserData(interfaceModel, userData);
const { sendMessageToIframe } = useIframe(interfaceModel, userData);
const { syncTypings } = useTypings(interfaceModel, userData);

const tab = computed({
  get: () => {
    return globalStore.admin.interface ? globalStore.admin.tab : 'data';
  },
  set: (tab: any) => {
    globalStore.setAdmin({
      tab,
    })
  },
})

const updateRoute = (hash = currentRoute.params.hash, section = currentRoute.params.section, locale = currentRoute.params.locale) => {
  const toRoute = '/admin/' + hash + '/' + section + '/' + locale;
  if (toRoute !== currentRoute.fullPath) {
    router.replace(toRoute);
  }
}

const showActionBar = computed((): boolean => {
  return ['data'].includes((tab.value || '').toString());
});

const bottomSheetMsg = ref('');
const showBottomSheet = computed((): boolean => {
  return downloading.value || userDataLoading.value;
});
watch(() => downloading.value, () => bottomSheetMsg.value = 'Downloading files and generating ZIP file. Please wait...');
watch(() => userDataLoading.value, () => bottomSheetMsg.value = 'Fetching user data. Please wait...');

const showEditor = computed({
  get(): boolean {
    return windowWidth.value > 900
      && globalStore.admin.previewMode !== 'desktop'
      && globalStore.admin.interface;
  },
  set(visible: boolean) {
    globalStore.setAdmin({ interface: visible })
  }
});

const onRefreshPreview = () => {
  sitePreview.value?.refresh();
}

const onCreateInterface = () => {
  showNewInterfaceModal.value = true;
}

const onApplyNewInterface = (template: string) => {
  const newInterface = getInterface(template);
  const oldInterface = getInterface(template);
  setInterfaceModel(ref(getInterface(template)));
  nextTick(() => {
    newInterface.label = '';
    setInterfaceData(newInterface);
    setInterfaceOriginalData(oldInterface);
    showNewInterfaceModal.value = false;
    applyUserData({})

    // If template is blank
    if (template === '') {
      tab.value = 'docs';
      globalStore.admin.previewMode = null;
    }
    // If template has content
    else if (tab.value === 'docs') {
      tab.value = 'data';
    }

    globalStore.admin.interface = true;
    nextTick(() => {
      if (interfaceEditor.value) {
        interfaceEditor.value.setFocus();
        sitePreview.value?.interfaceEditor?.setFocus();
      }
      dataEditor.value?.resetValidation()
    })

    updateRoute('new', getAvailableSection(), getAvailableLocale());
  })
}

const onSaveInterfaceContent = () => {
  onSaveInterface(interfaceModel.value);
}

const onSaveInterface = (model: IInterface = interfaceModel.value) => {
  if (canSaveInterface.value) {
    saveInterface().then(() => {
      syncTypings();
      globalStore.addInterface(model);
      updateRoute(model.hash, getAvailableSection(), getAvailableLocale());
    })
  }
}

const onSaveUserData = () => {
  if (canSave.value) {
    saveUserData();
  }
}

const onDeleteInterface = (model: IInterface) => {
  if (canDeleteInterface.value) {
    deleteInterface().then(() => {
      globalStore.removeInterface(model);
      onApplyNewInterface('');
      showNewInterfaceModal.value = true;
    });
  }
}

const onLocaleChange = (locale: string) => {
  updateRoute(currentRoute.params.hash, currentRoute.params.section, locale);
  sendMessageToIframe('locale', locale)
}

const onEditJson = () => {
  showEditJson.value = true;
  editJsonContent.value = JSON.stringify(deepToRaw(userData.value), null, 2);
}

const onShowTypings = () => {
  showTypings.value = true;
}

const onApplyJsonContent = (json: any) => {
  applyUserData(json);
}

const onInterfaceModelChange = (model: IInterface) => {
  userDataLoaded.value = false;
  const parsedData = getParsedInterfaceData(model);
  updateRoute(model.hash, getAvailableSection(parsedData), getAvailableLocale(parsedData));
  applyUserData(userData.value)
  dataEditor.value?.resetValidation()
  if (autoload) {
    setTimeout(refreshUserData)
  }
}

const onInterfaceContentChange = (content: string) => {
  interfaceModel.value.content = content;
  applyUserData(userData.value)
}

watch(() => globalStore.admin.interface, () => {
  if (globalStore.admin.interface && globalStore.admin.drawer && layoutSize.value.drawer.temporary) {
    globalStore.admin.drawer = false;
  }
})

const refreshUserData = (): Promise<any> => {
  return fetchUserData().then((response: any) => {
    applyUserData(response.data);
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
  const interfaceFound = globalStore.session.interfaces.find(item => item.hash === to.params.hash);

  // Check if the interface is found or if the hash is one of the valid hashes
  if (!interfaceFound && !validHashes.includes(to.params.hash.toString())) {
    updateRoute('demo', getAvailableSection(), getAvailableLocale());
  } else if (!interfaceHasSection(to.params.section.toString()) || !interfaceHasLocale(to.params.locale.toString())) {
    updateRoute(to.params.hash, getAvailableSection(), getAvailableLocale());
  }

  if (from.params.section !== to.params.section) {
    tab.value = 'data';
  }

  sitePreview.value?.interfaceEditor?.scrollToSection(getAvailableSection());
  interfaceEditor.value?.scrollToSection(getAvailableSection());
}
router.afterEach(checkRoute);
checkRoute(currentRoute, currentRoute);

useShortcut({
  onCreate: onCreateInterface,
  onSave: onSaveUserData,
  onSiteRefresh: onRefreshPreview,
}).listen();
initLayout();

if (autoload) {
  refreshUserData();
}
</script>

<template>

  <!-- TOOLBAR -->
  <Toolbar
    v-model="interfaceModel"
    :interface-data="interfaceParsedData"
    :user-data="userData"
    :interfaces="interfaces"
    :default-locale="getAvailableLocale()"
    @refresh="onRefreshPreview"
    @create="onCreateInterface"
    @save="onSaveInterface"
    @delete="onDeleteInterface"
    @locale="onLocaleChange"
    @edit-json="onEditJson"
    @show-typings="onShowTypings"
    @update:model-value="onInterfaceModelChange"
  />

  <!-- NEW INTERFACE MODAL -->
  <NewInterfaceModal
    v-model="showNewInterfaceModal"
    @apply="onApplyNewInterface"
  />

  <!-- SIDEBAR -->
  <Sidebar
    v-model="interfaceModel"
    :interface-data="interfaceParsedData"
    :user-data="userData"
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
  >
    <v-card class="w-100 fill-height d-flex flex-column pa-2 pl-0" theme="dark">
      <InterfaceEditor
        ref="interfaceEditor"
        v-model="interfaceModel"
        style="flex: 1"
        @save="onSaveInterfaceContent"
        @create="onCreateInterface"
        @change="onInterfaceContentChange"
      />
    </v-card>
  </v-navigation-drawer>

  <!-- PREVIEW -->
  <SitePreview
    ref="sitePreview"
    v-model="interfaceModel"
    :interface-data="interfaceParsedData"
    :user-data="userData"
    @save="onSaveInterfaceContent"
    @create="onCreateInterface"
    @change="onInterfaceContentChange"
  />

  <!-- DATA -->
  <v-card class="fill-height" tile flat>
    <v-form
      ref="form"
      class="fill-height"
    >
      <v-expand-transition group>
        <div v-if="globalStore.admin.interface">
          <v-tabs v-model="tab" grow>
            <v-tab value="data">
              <v-icon icon="mdi-pencil" start />
              Data
            </v-tab>
            <v-tab value="settings">
              <v-icon start icon="mdi-cog" />
              Settings
              <v-icon v-if="interfaceHasSettingsError" color="warning" class="ml-3">
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
            v-model="interfaceModel"
            :interface-data="interfaceParsedData"
            :user-data="userData"
            :server-settings="serverSettings"
            :loading="userDataLoading"
          />
        </v-tabs-window-item>
        <v-tabs-window-item value="settings">
          <Settings
            v-model="interfaceModel"
            :demo="!globalStore.session.loggedIn"
            :disabled="interfaceModel.type !== 'owner'"
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
      v-model="interfaceModel"
      :user-data="userData"
      :tab="tab"
    />
  </v-expand-transition>

  <!-- EDIT JSON MODAL -->
  <JsonEditModal
    v-model="editJsonContent"
    v-model:visible="showEditJson"
    @apply="onApplyJsonContent"
  />

  <!-- TYPINGS MODAL -->
  <TypingsModal
    v-model="interfaceModel"
    v-model:visible="showTypings"
    :user-data="userData"
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
        <v-progress-circular color="primary" indeterminate class="mr-4" />
      </template>
      <template #item>
        {{ bottomSheetMsg }}
      </template>
    </v-card>
  </v-bottom-sheet>
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
