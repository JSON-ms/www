<script setup lang="ts">
import Logo from '@/components/Logo.vue';
import LocaleSwitcher from '@/components/LocaleSwitcher.vue';
import SessionPanel from '@/components/SessionPanel.vue';
import GoogleSignInButton from '@/components/GoogleSignInButton.vue';
import InterfaceSelector from '@/components/InterfaceSelector.vue';
import {useDisplay} from 'vuetify';
import {useGlobalStore} from '@/stores/global';
import {getDefaultInterfaceContent, getInterface} from '@/utils';
import router from '@/router';
import {computed, ref, watch} from 'vue';
import type {IInterface, IInterfaceData} from '@/interfaces';
import {useUserData} from '@/composables/user-data';
import {useRoute} from 'vue-router';
import {useInterface} from '@/composables/interface';
import type {VAppBar} from 'vuetify/components';
import {useLayout} from '@/composables/layout';

const interfaceModel = defineModel<IInterface>({ required: true });
const { interfaceData, userData, interfaces = [], defaultLocale = 'en-US' } = defineProps<{
  interfaceData: IInterfaceData,
  userData: any,
  interfaces: IInterface[],
  defaultLocale?: string,
}>();

const currentRoute = useRoute();
const selectedLocale = ref(defaultLocale);
const globalStore = useGlobalStore();
const { smAndDown } = useDisplay();
const { windowWidth } = useLayout();
const { setInterfaceData, serverSettings, createInterface } = useInterface(interfaceModel)
const { downloadUserData, downloading, userDataLoading, fetchUserData, userDataLoaded, canFetchUserData, applyUserData, canInteractWithServer, getUserDataErrors } = useUserData(interfaceModel, userData);
const emit = defineEmits(['locale', 'preview', 'refresh', 'update:model-value', 'create', 'save', 'delete', 'edit-json'])

const locales = computed(() => {
  return Object.entries(interfaceData.locales).map(item => ({ value: item[0], title: item[1] }));
})

const showLocaleSwitcher = computed((): boolean => {
  return Object.keys(locales.value).length > 1;
})

const showSitePreview = computed((): boolean => {
  return !smAndDown.value && !!(globalStore.admin.previewMode) && sitePreviewUrl.value !== null || false;
})

const sitePreviewUrl = computed((): string | null => {
  return interfaceData.global.preview || null;
})

const userDataErrorList = computed((): {[key: string]: string} => {
  return getUserDataErrors(interfaceData.sections);
})

const onEditJson = () => {
  emit('edit-json');
}

const onCreateInterface = (model: IInterface) => {
  createInterface().then(() => {
    emit('create', model);
  })
}

const onSaveInterface = (model: IInterface) => {
  emit('save', model);
}

const onDeleteInterface = (model: IInterface) => {
  emit('delete', model);
}

const onRefreshPreview = () => {
  emit('refresh');
}

const onPreviewModeChange = (mode: null | 'mobile' | 'desktop') => {
  globalStore.admin.previewMode = mode === undefined ? null : mode;
  emit('preview', globalStore.admin.previewMode);
}

const onLocaleChange = (locale: string) => {
  emit('locale', locale);
}

const onFetchUserData = () => {
  fetchUserData().then((response: any) => {
    applyUserData(response.data);
    serverSettings.value = response.settings;
  })
}

const onLogout = () => {
  router.push('/admin/' + interfaceModel.value.hash + '/' + currentRoute.params.section + '/' + currentRoute.params.locale);
  setInterfaceData(getInterface(getDefaultInterfaceContent()));
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
        text="Sections (ALT+S)"
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
    <div v-else class="mr-4"></div>

    <div v-if="!smAndDown && !globalStore.session.loggedIn" style="flex: 75">
      <span class="text-left">Generate an admin panel from a YAML interface that communicates with a remote server using JSON.</span>
    </div>
    <div v-else-if="globalStore.session.loggedIn" class="d-flex align-center" style="gap: 1rem; flex: 75">
      <InterfaceSelector
        v-model="interfaceModel"
        :interfaces="interfaces"
        :actions="windowWidth > 900"
        :show-icon="windowWidth > 450"
        :style="{
          width: 'min-content',
          maxWidth: windowWidth < 1000 ? 'auto' : '25rem'
        }"
        type="admin"
        density="compact"
        variant="solo-filled"
        flat
        large-text
        @create="onCreateInterface"
        @save="onSaveInterface"
        @delete="onDeleteInterface"
      />

      <v-btn-toggle
        v-if="windowWidth > 900"
        v-model="globalStore.admin.interface"
        color="primary"
        variant="text"
      >
        <v-tooltip
          text="Editor (CTRL+E)"
          location="bottom"
        >
          <template #activator="{ props }">
            <v-btn v-bind="props" :value="true">
              <v-icon icon="mdi-code-tags" style="top: 1px" :start="windowWidth > 1400" />
              <span v-if="windowWidth > 1400">Template</span>
            </v-btn>
          </template>
        </v-tooltip>
      </v-btn-toggle>
    </div>

    <div class="d-flex align-center mx-3" :style="{ gap: smAndDown ? 0 : '1rem'}">
      <template v-if="globalStore.session.loggedIn">
        <v-tooltip
          v-if="windowWidth > 1000"
          text="Refresh Preview (CTRL+R)"
          location="bottom"
        >
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              :disabled="!showSitePreview"
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
          <template v-if="userDataLoaded" #prepend-inner-selection>
            <v-icon v-if="Object.keys(userDataErrorList).find(key => key.endsWith(selectedLocale))" icon="mdi-alert" color="warning"></v-icon>
            <v-icon v-else-if="Object.keys(userDataErrorList).find(key => locales.find(locale => key.endsWith(locale.value)))" icon="mdi-alert-outline" />
          </template>
          <template v-if="userDataLoaded" #prepend-inner-item="{ item }">
            <v-icon v-if="Object.keys(userDataErrorList).find(key => key.endsWith(item.value))" icon="mdi-alert" color="warning" class="mr-n4" />
          </template>
        </LocaleSwitcher>

        <SessionPanel
          :show-username="windowWidth > 1500"
          @logout="onLogout"
        >
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
            title="Edit JSON"
            prepend-icon="mdi-code-json"
            @click="onEditJson"
          />
        </SessionPanel>
      </template>
      <template v-else>
        <GoogleSignInButton block />
      </template>
    </div>
  </v-app-bar>
</template>

