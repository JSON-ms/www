<script setup lang="ts">
import Logo from '@/components/Logo.vue';
import LocaleSwitcher from '@/components/LocaleSwitcher.vue';
import SessionPanel from '@/components/SessionPanel.vue';
import GoogleSignInButton from '@/components/GoogleSignInButton.vue';
import StructureSelector from '@/components/StructureSelector.vue';
import {useDisplay} from 'vuetify';
import {useGlobalStore} from '@/stores/global';
import {computed, ref, watch} from 'vue';
import type {IField, IStructure, IStructureData} from '@/interfaces';
import {useUserData} from '@/composables/user-data';
import {useRoute} from 'vue-router';
import {useStructure} from '@/composables/structure';
import type {VAppBar} from 'vuetify/components';
import {useLayout} from '@/composables/layout';
import {useIframe} from '@/composables/iframe';
import {useModelStore} from "@/stores/model";
import {useMigration} from "@/composables/migration";
import TriggerMenu from "@/components/TriggerMenu.vue";

const structure = defineModel<IStructure>({ required: true });
const { structureData, structures = [], defaultLocale = 'en-US', userData } = defineProps<{
  structureData: IStructureData,
  userData: any,
  structures: IStructure[],
  defaultLocale?: string,
}>();

const currentRoute = useRoute();
const selectedLocale = ref(defaultLocale);
const globalStore = useGlobalStore();
const modelStore = useModelStore();
const { smAndDown } = useDisplay();
const { windowWidth, layoutSize } = useLayout();
const { serverSettings, createStructure } = useStructure()
const { migrating } = useMigration()
const { downloadUserData, downloading, userDataLoading, setUserData, fetchUserData, canFetchUserData, canInteractWithServer, getUserDataErrors } = useUserData();
const { reloading } = useIframe()
const emit = defineEmits(['locale', 'preview', 'refresh', 'update:model-value', 'create', 'save', 'delete', 'edit-json', 'migrate-data', 'logout'])

const locales = computed(() => {
  return Object.entries(structureData.locales).map(item => ({ value: item[0], title: item[1] }));
})

const showLocaleSwitcher = computed((): boolean => {
  return Object.keys(locales.value).length > 1;
})

const showSitePreview = computed((): boolean => {
  return !smAndDown.value && !!(globalStore.admin.previewMode) && sitePreviewUrl.value !== null || false;
})

const sitePreviewUrl = computed((): string | null => {
  return structureData.global.preview || null;
})

const userDataErrorList = computed((): {[key: string]: string} => {
  return getUserDataErrors(structureData.sections as unknown as { [key: string]: IField; });
})

const onEditJson = () => {
  emit('edit-json');
}

const onMigrateData = () => {
  emit('migrate-data');
}

const onCreateStructure = (model: IStructure) => {
  createStructure().then(() => {
    emit('create', model);
  })
}

const onSaveStructure = (model: IStructure) => {
  emit('save', model);
}

const onDeleteStructure = (model: IStructure) => {
  emit('delete', model);
}

const onRefreshPreview = () => {
  emit('refresh');
}

const onUserSettings = () => {
  globalStore.setUserSettingsVisible(true);
}

const onOpenSiteInNewTab = () => {
  window.open(structureData.global.preview, '_blank');
}

const onStructureSelectorInput = (model: IStructure) => {
  modelStore.setOriginalStructure(model);
}

const onPreviewModeChange = (mode: null | 'mobile' | 'desktop') => {
  if (layoutSize.value.editor.temporary && globalStore.admin.structure && mode === 'mobile') {
    globalStore.admin.structure = false;
  }

  globalStore.admin.previewMode = mode === undefined ? null : mode;
  emit('preview', globalStore.admin.previewMode);
}

const onLocaleChange = (locale: string) => {
  emit('locale', locale);
}

const onFetchUserData = () => {
  fetchUserData().then((response: any) => {
    setUserData(response.data, true);
    serverSettings.value = response.settings;
  })
}

const onClearUserData = () => {
  globalStore.setPrompt({
    ...globalStore.prompt,
    visible: true,
    title: 'Clear data',
    body: 'Are you sure you want to clear all data? Your JSON won\'t be updated until you save.',
    btnText: 'Clear data',
    btnIcon: 'mdi-close-box-outline',
    btnColor: 'warning',
    callback: () => new Promise(resolve => {
      setUserData({}, true)
      resolve();
    })
  })
}

const onLogout = (response: any) => {
  emit('logout', response);
}

const toggleDrawer = () => {
  globalStore.setAdmin({
    drawer: !globalStore.admin.drawer,
  })
}

watch(() => currentRoute.params.locale, () => {
  selectedLocale.value = currentRoute.params.locale.toString();
})
</script>

<template>
  <v-app-bar v-bind="$attrs" border>
    <template #prepend>
      <v-tooltip
        v-if="globalStore.uiConfig.toolbar_menu"
        text="Sections (ALT+Q)"
        location="bottom"
      >
        <template #activator="{ props }">
          <v-app-bar-nav-icon v-bind="props" :icon="globalStore.admin.drawer ? 'mdi-menu-open' : 'mdi-menu'" @click="toggleDrawer" />
        </template>
      </v-tooltip>
    </template>

    <template v-if="globalStore.uiConfig.toolbar_logo && (!globalStore.session.loggedIn || windowWidth > 1200)">
      <v-app-bar-title style="flex: 1; min-width: 110px" class="mr-8">
        <Logo />
      </v-app-bar-title>
    </template>
    <div v-else class="mr-4" />

    <div class="d-flex align-center" style="gap: 1rem; flex: 75">
      <StructureSelector
        v-if="globalStore.uiConfig.toolbar_project_selector && globalStore.session.loggedIn"
        v-model="structure"
        :structures="structures"
        :actions="windowWidth > 900"
        :show-icon="windowWidth > 450"
        :original-structure="modelStore.originalStructure"
        :style="{
          width: 'min-content',
          maxWidth: windowWidth < 1000 ? 'auto' : '25rem'
        }"
        type="admin"
        density="compact"
        variant="solo-filled"
        flat
        large-text
        @update:model-value="onStructureSelectorInput"
        @create="onCreateStructure"
        @save="onSaveStructure"
        @delete="onDeleteStructure"
      />

      <v-btn-toggle
        v-if="globalStore.uiConfig.toolbar_advanced && globalStore.uiConfig.structure && windowWidth > 900"
        v-model="globalStore.admin.structure"
        color="primary"
        variant="text"
        @update:model-value="value => globalStore.admin.structure = !!value"
      >
        <v-tooltip
          text="Advanced (CTRL+A)"
          location="bottom"
        >
          <template #activator="{ props }">
            <v-btn v-bind="props" :value="true">
              <v-icon icon="mdi-code-tags" style="top: 1px" :start="windowWidth > 1400" />
              <span v-if="windowWidth > 1400">Advanced</span>
            </v-btn>
          </template>
        </v-tooltip>
      </v-btn-toggle>

      <TriggerMenu
        v-if="globalStore.uiConfig.toolbar_trigger_menu"
        :model-value="structureData"
        :structure="structure"
        :user-data="userData"
        location="toolbar"
      />

<!--      <v-alert-->
<!--        v-if="globalStore.uiConfig.toolbar_info && !globalStore.session.loggedIn && windowWidth > 1700"-->
<!--        density="comfortable"-->
<!--        style="max-width: max-content"-->
<!--        variant="tonal"-->
<!--        type="info"-->
<!--        icon="mdi-information-outline"-->
<!--      >-->
<!--        <div class="text-truncate">-->
<!--          Free and open-source, with data securely hosted on your server.-->
<!--        </div>-->
<!--      </v-alert>-->
    </div>

    <div v-if="globalStore.uiConfig.toolbar_site_preview" class="d-flex align-center mx-3" :style="{ gap: smAndDown ? '0.5rem' : '1rem'}">
      <v-tooltip
        v-if="globalStore.uiConfig.toolbar_site_preview_refresh && windowWidth > 1000"
        text="Refresh Preview (ALT+R)"
        location="bottom"
      >
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            :disabled="!showSitePreview || reloading"
            icon
            @click="onRefreshPreview"
          >
            <v-icon icon="mdi-refresh" />
          </v-btn>
        </template>
      </v-tooltip>
      <v-btn-toggle
        v-if="globalStore.uiConfig.toolbar_site_preview_mobile && windowWidth > 1000"
        v-model="globalStore.admin.previewMode"
        group
        variant="text"
        color="primary"
        @update:model-value="onPreviewModeChange"
      >
        <v-tooltip
          text="Mobile (CTRL+M)"
          location="bottom"
        >
          <template #activator="{ props }">
            <v-btn v-bind="props" value="mobile">
              <v-icon icon="mdi-cellphone" />
            </v-btn>
          </template>
        </v-tooltip>

        <v-tooltip
          v-if="globalStore.uiConfig.toolbar_site_preview_desktop"
          text="Desktop (CTRL+D)"
          location="bottom"
        >
          <template #activator="{ props }">
            <v-btn v-bind="props" value="desktop">
              <v-icon icon="mdi-monitor" />
            </v-btn>
          </template>
        </v-tooltip>
      </v-btn-toggle>
      <v-tooltip
        v-if="globalStore.uiConfig.toolbar_site_preview_blank && windowWidth > 1000"
        text="Open site in new tab"
        location="bottom"
      >
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            :disabled="reloading || !structureData.global.preview"
            icon
            class="ml-n2"
            @click="onOpenSiteInNewTab"
          >
            <v-icon icon="mdi-open-in-new" size="small" />
          </v-btn>
        </template>
      </v-tooltip>

      <LocaleSwitcher
        v-if="globalStore.uiConfig.toolbar_locale_selector && showLocaleSwitcher && !smAndDown"
        v-model="selectedLocale"
        :locales="locales"
        :dense="windowWidth < 1300"
        :disabled="userDataLoading"
        label="Locale"
        style="width: 14rem"
        @update:model-value="onLocaleChange"
      >
        <template v-if="!userDataLoading" #prepend-inner-selection>
          <v-icon v-if="Object.keys(userDataErrorList).find(key => key.endsWith(selectedLocale))" icon="mdi-alert" color="warning" />
          <v-icon v-else-if="Object.keys(userDataErrorList).find(key => locales.find(locale => key.endsWith(locale.value)))" icon="mdi-alert-outline" color="warning" />
        </template>
        <template v-if="!userDataLoading" #prepend-inner-item="{ item }">
          <v-icon v-if="Object.keys(userDataErrorList).find(key => key.endsWith(item.value))" icon="mdi-alert" color="warning" class="mr-n4" />
        </template>
      </LocaleSwitcher>

      <GoogleSignInButton v-if="globalStore.uiConfig.toolbar_login && !globalStore.session.loggedIn" />

      <SessionPanel
        v-if="globalStore.uiConfig.toolbar_settings"
        :show-username="windowWidth > 1500"
        @logout="onLogout"
      >
        <div v-if="showLocaleSwitcher && smAndDown && globalStore.uiConfig.toolbar_locale_selector" class="px-4 pt-2">
          <LocaleSwitcher
            v-model="selectedLocale"
            :locales="locales"
            :disabled="userDataLoading"
            variant="filled"
            style="width: 100%"
            @click.stop
            @update:model-value="onLocaleChange"
          >
            <template v-if="!userDataLoading" #prepend-inner-selection>
              <v-icon v-if="Object.keys(userDataErrorList).find(key => key.endsWith(selectedLocale))" icon="mdi-alert" color="warning" />
              <v-icon v-else-if="Object.keys(userDataErrorList).find(key => locales.find(locale => key.endsWith(locale.value)))" icon="mdi-alert-outline" color="warning" />
            </template>
            <template v-if="!userDataLoading" #prepend-inner-item="{ item }">
              <v-icon v-if="Object.keys(userDataErrorList).find(key => key.endsWith(item.value))" icon="mdi-alert" color="warning" class="mr-n4" />
            </template>
          </LocaleSwitcher>
          <v-divider class="my-1 mt-4" />
        </div>
        <template v-if="globalStore.uiConfig.toolbar_settings_edit_json">
          <v-list-item
            title="Edit JSON"
            prepend-icon="mdi-code-json"
            @click="onEditJson"
          />
          <v-divider class="my-1" />
        </template>
        <v-list-item
          v-if="globalStore.uiConfig.toolbar_settings_fetch_data"
          :disabled="userDataLoading || !canFetchUserData"
          :subtitle="!canFetchUserData ? 'Requires an endpoint' : ''"
          prepend-icon="mdi-monitor-arrow-down"
          title="Fetch data"
          @click="onFetchUserData"
        />
        <v-list-item
          v-if="globalStore.uiConfig.toolbar_settings_download_data"
          :disabled="downloading || !canInteractWithServer"
          :subtitle="!canInteractWithServer ? 'Requires an endpoint' : ''"
          title="Download data"
          prepend-icon="mdi-tray-arrow-down"
          @click="downloadUserData"
        />
        <v-list-item
          v-if="globalStore.uiConfig.toolbar_settings_mirate_data"
          :disabled="migrating || !canInteractWithServer"
          :subtitle="!canInteractWithServer ? 'Requires an endpoint' : ''"
          title="Migrate data"
          prepend-icon="mdi-folder-arrow-left-right-outline"
          @click="onMigrateData"
        />
        <v-list-item
          v-if="globalStore.uiConfig.toolbar_settings_clear_data"
          :disabled="userDataLoading"
          prepend-icon="mdi-close-box-outline"
          title="Clear data"
          @click="onClearUserData"
        />
        <template v-if="globalStore.uiConfig.toolbar_settings_settings">
          <v-divider class="my-1" />
          <v-list-item
            prepend-icon="mdi-tune"
            title="Settings"
            @click="onUserSettings"
          />
        </template>
      </SessionPanel>
    </div>
  </v-app-bar>
</template>

