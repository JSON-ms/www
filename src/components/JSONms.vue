<script setup lang="ts">
import Toolbar from '@/components/Toolbar.vue';
import Sidebar from '@/components/Sidebar.vue';
import InterfaceEditor from '@/components/InterfaceEditor.vue';
import SitePreview from '@/components/SitePreview.vue';
import DataEditor from '@/components/DataEditor.vue';
import JsonEditModal from '@/components/JsonEditModal.vue';
import ActionBar from '@/components/ActionBar.vue';
import type {IInterface} from '@/interfaces';
import {useIframe} from '@/composables/iframe';
import {computed, nextTick, ref, watch} from 'vue';
import {useGlobalStore} from '@/stores/global';
import {useUserData} from '@/composables/user-data';
import {type RouteLocationNormalizedGeneric, useRoute} from 'vue-router';
import router from '@/router';
import {useInterface} from '@/composables/interface';
import {useLayout} from '@/composables/layout';
import {useShortcut} from '@/composables/shortcut';
import {deepToRaw, getInterface} from '@/utils';
import NewInterfaceModal from '@/components/NewInterfaceModal.vue';

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
const editJsonContent = ref('');
const showNewInterfaceModal = ref(false);
const interfaceEditor = ref<InstanceType<typeof InterfaceEditor> | null>();
const sitePreview = ref<InstanceType<typeof SitePreview> | null>();
const dataEditor = ref<InstanceType<typeof DataEditor> | null>();
const { serverSettings, interfaceParsedData, getParsedInterfaceData, setInterfaceModel, getAvailableSection, deleteInterface, getAvailableLocale, interfaceHasSection, interfaceHasLocale, setInterfaceOriginalData, setInterfaceData, saveInterface, canSaveInterface, canDeleteInterface } = useInterface(interfaceModel);
const userData = ref({});
const { fetchUserData, applyUserData, userDataLoading, canSave, saveUserData, downloading, userDataLoaded } = useUserData(interfaceModel, userData);
const { sendMessageToIframe } = useIframe(interfaceModel, userData);

const updateRoute = (hash = currentRoute.params.hash, section = currentRoute.params.section, locale = currentRoute.params.locale) => {
  const toRoute = '/admin/' + hash + '/' + section + '/' + locale;
  if (toRoute !== currentRoute.fullPath) {
    router.replace(toRoute);
  }
}

// Make sure the selected interface has access to selected section and locale otherwise redirect
const availableSection = getAvailableSection();
const availableLocale = getAvailableLocale();
if (availableSection !== currentRoute.params.section || availableLocale !== currentRoute.params.locale) {
  updateRoute(currentRoute.params.hash || 'new', availableSection, availableLocale);
}

const showActionBar = computed((): boolean => {
  return ['data', 'settings'].includes((dataEditor.value?.tab || '').toString());
});

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
  newInterface.label = '';
  setInterfaceData(newInterface);
  setInterfaceOriginalData(oldInterface);
  showNewInterfaceModal.value = false;
  applyUserData({})

  // If template is blank
  if (template === '') {
    if (dataEditor.value) {
      dataEditor.value.tab = 'docs';
    }
    globalStore.admin.previewMode = null;
  }
  // If template has content
  else if (dataEditor.value && dataEditor.value.tab === 'docs') {
    dataEditor.value.tab = 'data';
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
}

const onSaveInterfaceContent = () => {
  onSaveInterface(interfaceModel.value);
}

const onSaveInterface = (model: IInterface = interfaceModel.value) => {
  if (canSaveInterface.value) {
    saveInterface().then(() => {
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
  applyUserData(userData.value, false)
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
    if (dataEditor.value) {
      dataEditor.value.tab = 'data';
    }
  }

  sitePreview.value?.interfaceEditor?.scrollToSection(getAvailableSection());
  interfaceEditor.value?.scrollToSection(getAvailableSection());
}
router.afterEach(checkRoute)
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
    <DataEditor
      ref="dataEditor"
      v-model="interfaceModel"
      :interface-data="interfaceParsedData"
      :user-data="userData"
      :server-settings="serverSettings"
      :loading="userDataLoading"
    />
  </v-card>

  <!-- ACTIONS -->
  <v-expand-transition>
    <ActionBar
      v-if="showActionBar"
      v-model="interfaceModel"
      :user-data="userData"
    />
  </v-expand-transition>

  <!-- EDIT JSON -->
  <JsonEditModal
    v-model="editJsonContent"
    v-model:visible="showEditJson"
    @apply="onApplyJsonContent"
  />

  <!-- DOWNLOAD DATA BOTTOM SHEET -->
  <v-bottom-sheet
    v-model="downloading"
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
        Downloading files and generating ZIP file. Please wait...
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
