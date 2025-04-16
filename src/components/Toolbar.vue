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
import {useTypings} from '@/composables/typings';
import {useIframe} from '@/composables/iframe';
import {useModelStore} from "@/stores/model";

const structure = defineModel<IStructure>({ required: true });
const { structureData, structures = [], defaultLocale = 'en-US' } = defineProps<{
  structureData: IStructureData,
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
const { downloadUserData, migrating, downloading, userDataLoading, setUserData, fetchUserData, canFetchUserData, canInteractWithServer, getUserDataErrors } = useUserData();
const { hasSyncEnabled } = useTypings()
const { reloading } = useIframe()
const emit = defineEmits(['locale', 'preview', 'refresh', 'update:model-value', 'create', 'save', 'delete', 'edit-json', 'show-typings', 'migrate-data', 'logout'])

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

const onShowTypings = () => {
  emit('show-typings');
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
        text="Sections (CTRL+Q)"
        location="bottom"
      >
        <template #activator="{ props }">
          <v-app-bar-nav-icon v-bind="props" :icon="globalStore.admin.drawer ? 'mdi-menu-open' : 'mdi-menu'" @click="toggleDrawer" />
        </template>
      </v-tooltip>
    </template>

    <template v-if="!globalStore.session.loggedIn || windowWidth > 1200">
      <v-app-bar-title style="flex: 1; min-width: 110px" class="mr-8">
        <Logo />
      </v-app-bar-title>
    </template>
    <div v-else class="mr-4" />

    <div class="d-flex align-center" style="gap: 1rem; flex: 75">
      <StructureSelector
        v-if="globalStore.session.loggedIn"
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
        v-if="windowWidth > 900"
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
    </div>

    <div class="d-flex align-center mx-3" :style="{ gap: smAndDown ? 0 : '1rem'}">
      <v-tooltip
        v-if="windowWidth > 1000"
        text="Refresh Preview (CTRL+R)"
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
        v-if="windowWidth > 1000"
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

      <LocaleSwitcher
        v-if="showLocaleSwitcher"
        v-model="selectedLocale"
        :locales="locales"
        :dense="windowWidth < 1300"
        :disabled="userDataLoading"
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

      <template v-if="globalStore.session.loggedIn">
        <SessionPanel
          :show-username="windowWidth > 1500"
          @logout="onLogout"
        >
          <v-list-item
            title="Edit JSON"
            prepend-icon="mdi-code-json"
            @click="onEditJson"
          />
          <v-divider class="my-1" />
          <v-list-item
            :disabled="userDataLoading || !canFetchUserData"
            prepend-icon="mdi-monitor-arrow-down"
            title="Fetch data"
            @click="onFetchUserData"
          />
          <v-list-item
            :disabled="downloading || !canInteractWithServer"
            title="Download data"
            prepend-icon="mdi-tray-arrow-down"
            @click="downloadUserData"
          />
          <v-list-item
            :disabled="migrating || !canInteractWithServer"
            title="Migrate data"
            prepend-icon="mdi-folder-arrow-left-right-outline"
            @click="onMigrateData"
          />
          <v-list-item
            :disabled="userDataLoading"
            prepend-icon="mdi-close-box-outline"
            title="Clear data"
            @click="onClearUserData"
          />
          <v-divider class="my-1" />
          <v-list-item
            title="Typings"
            prepend-icon="mdi-language-typescript"
            @click="onShowTypings"
          >
            <template #append>
              <v-chip
                v-if="hasSyncEnabled"
                variant="tonal"
                label
                size="x-small"
                color="success"
                class="ml-4"
              >Synced!</v-chip>
            </template>
          </v-list-item>
        </SessionPanel>
      </template>
      <template v-else>
        <GoogleSignInButton />
      </template>
    </div>
  </v-app-bar>
</template>

