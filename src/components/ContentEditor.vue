<script setup lang="ts">
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from 'vue';
import { useDisplay } from 'vuetify'
import type {IInterfaceData, IInterface, IServerSettings} from '@/interfaces';
import LocaleSwitcher from '@/components/LocaleSwitcher.vue';
import SessionPanel from '@/components/SessionPanel.vue';
import InterfaceSelector from '@/components/InterfaceSelector.vue';
import FieldItem from '@/components/FieldItem.vue';
import { useGlobalStore } from '@/stores/global';
import {
  deepToRaw,
  getDefaultInterfaceContent,
  getInterface,
  getParsedInterface,
  objectsAreDifferent,
  parseInterfaceDataToAdminData
} from '@/utils';
import router from '@/router';
import { Services } from '@/services';
import { useRoute } from 'vue-router';
import type { VForm } from 'vuetify/components';
import type InterfaceModel from '@/models/interface.model';
import Changes from '@/changes';

const model = defineModel<InterfaceModel>({ required: true });
const { preview = false, interfaces = [], autoload = false } = defineProps<{
  preview?: boolean,
  autoload: boolean,
  interfaces: IInterface[],
}>();

const interfaceModel = model.value;
const { smAndDown } = useDisplay()
const windowWidth = ref(window.innerWidth);
const updateWindowWidth = () => {windowWidth.value = window.innerWidth};
const currentRoute = useRoute();
const globalStore = useGlobalStore();
const sitePreviewMode = ref<'off' | 'mobile' | 'desktop'>('off');
const formIsValid = ref(false);
const saving = ref(false);
const saved = ref(false);
const fetched = ref(false);
const isDemo = ref(interfaceModel.data.hash === 'demo');
const downloading = ref(false);
const loading = ref(false);
const form = ref<VForm | null>(null);
const appBarFlat = ref(true);
const serverSettings = ref<IServerSettings>({
  postMaxSize: '8M',
  publicUrl: '',
  uploadMaxSize: '2M',
})

const showAppBar = computed((): boolean => {
  return true;
})
const showSitePreview = computed((): string | false => {
  return !preview && sitePreviewMode.value !== 'off' && sitePreviewUrl.value || false;
})
const sitePreviewUrl = computed((): string | null => {
  return getParsedInterface(interfaceModel.data).global.preview || null;
})
if (sitePreviewUrl.value) {
  sitePreviewMode.value = 'mobile';
}
const showActionBar = computed((): boolean => {
  return globalStore.session.loggedIn
    && canInteractWithServer.value;
})
const showFetchUserData = computed((): boolean => {
  return preview
    && globalStore.session.loggedIn
    && canInteractWithServer.value;
})
const showLocaleSwitcher = computed((): boolean => {
  return Object.keys(locales.value).length > 1;
})
const mobileMode = computed((): boolean => {
  return smAndDown.value || (preview && windowWidth.value < 1400);
})
const showNavigationDrawer = computed((): boolean => {
  return Object.keys(interfaceData.value.sections).length > 1
    || (interfaces.length > 1 && mobileMode.value);
})
const showContent = computed((): boolean => {
  return !!(selectedSection.value);
})
const interfaceData = computed((): IInterfaceData => {
  return interfaceModel.getParsedData();
})
const canInteractWithServer = computed((): boolean => {
  return !!(interfaceModel.data.server_url)
    && !!(interfaceModel.data.hash);
})
const selectedSection = computed(() => {
  return interfaceData.value.sections[selectedSectionKey.value];
})
const locales = computed(() => {
  return Object.entries(interfaceData.value.locales).map(item => ({ value: item[0], title: item[1] }));
})

const getDefaultLocale = (data: IInterfaceData) => {
  const entries = Object.entries(data.locales);
  if (entries[0] && entries[0][0]) {
    return entries[0][0];
  }
  return 'en-US';
}

const adminData = parseInterfaceDataToAdminData(interfaceData.value);
const userData = ref(structuredClone(adminData));
const originalUserData = ref(structuredClone(adminData));
const drawer = ref(!mobileMode.value);
const selectedLocale = ref(getDefaultLocale(interfaceData.value));
const selectedSectionKey = ref(Object.keys(interfaceData.value.sections)[0]);
const routeSection = interfaceData.value.sections[currentRoute.params.section?.toString()];

if (currentRoute.params.section && routeSection) {
  selectedSectionKey.value = currentRoute.params.section.toString();
}

const onLogout = () => {
  goToSection();
  interfaceModel.data = getInterface(getDefaultInterfaceContent());
}

// Check for changes and ask user before redirecting
const goToSection = (section: string = '') => {
  if (preview) {
    selectedSectionKey.value = section;
    if (showNavigationDrawer.value && mobileMode.value) {
      drawer.value = false;
    }
  } else {
    router.push('/admin/' + interfaceModel.data.hash + '/' + section);
  }
}

const toggleDrawer = () => {
  drawer.value = !drawer.value;
}

const save = async (): Promise<any> => {
  saving.value = true;

  const parsedInterface = getParsedInterface(interfaceModel.data);
  return Services.post(interfaceModel.data.server_url || '', {
    hash: interfaceModel.data.hash,
    data: userData.value,
    interface: parsedInterface,
  }, {
    'Content-Type': 'application/json',
    'X-Jms-Api-Key': interfaceModel.data.server_secret,
  })
    .then(() => {
      originalUserData.value = structuredClone(deepToRaw(userData.value));
      form.value?.resetValidation();
    })
    .catch(globalStore.catchError)
    .finally(() => {
      saving.value = false;
      saved.value = true;
      setTimeout(() => saved.value = false, 1000);
    });
}

const onLocaleChange = (locale: string) => {
  sendMessageToIframe('locale', locale)
}

const fetchData = () => {
  refresh().then(() => {
    fetched.value = true;
    setTimeout(() => fetched.value = false, 2000);
  })
}

const download = () => {
  downloading.value = true;
  return Services.get((interfaceModel.data.server_url + '?hash=' + interfaceModel.data.hash) || '', {
    'Content-Type': 'application/json',
    'X-Jms-Api-Key': interfaceModel.data.server_secret,
  }, true)
    .then(response => {
      const json = JSON.stringify(response, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = interfaceModel.data.label + '.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    })
    .catch(globalStore.catchError)
    .finally(() => downloading.value = false);
}

const refresh = () => {
  return new Promise((resolve, reject) => {
    if (interfaceModel.data.hash && interfaceModel.data.server_url) {
      loading.value = true;
      Services.get((interfaceModel.data.server_url + '?hash=' + interfaceModel.data.hash) || '', {
        'Content-Type': 'application/json',
        'X-Jms-Api-Key': interfaceModel.data.server_secret,
      })
        .then(response => {
          form.value?.resetValidation();
          serverSettings.value = response.settings;
          applyUserData(parseInterfaceDataToAdminData(interfaceData.value, response.data));
          resolve(userData.value);
        })
        .catch(reason => {
          globalStore.catchError(reason);
          reject(reason);
        })
        .finally(() => loading.value = false);
    }
  })
}

const cancel = () => {
  userData.value = structuredClone(deepToRaw(originalUserData.value));
  form.value?.resetValidation();
}

const canSave = computed((): boolean => {
  return !saving.value
    && formIsValid.value
    && canInteractWithServer.value
    && dataHasChanged.value
})

const theme = computed((): { primary: string } => {
  // @ts-expect-error It will always be available
  return interfaceData.value.global.theme[globalStore.theme];
})

const onScroll = (event: Event) => {
  appBarFlat.value = event.target === document
    ? window.scrollY === 0
    : (event.target as HTMLElement).scrollTop === 0;
}

const applyUserData = (data: any) => {
  userData.value = structuredClone(deepToRaw(data));
  originalUserData.value = structuredClone(deepToRaw(data));
  Changes.applySet('admin', userData, originalUserData);
}

// Detect changes..
const dataHasChanged = computed((): boolean => objectsAreDifferent(userData, originalUserData));

router.afterEach((to) => {
  applyUserData(originalUserData.value);
  if (to.params.section) {
    selectedSectionKey.value = to.params.section.toString();
  }
  if (mobileMode.value) {
    drawer.value = false;
  }
  form.value?.resetValidation();
  nextTick(() => form.value?.resetValidation());
  sendMessageToIframe('section', to.params.section.toString());
})

watch(() => interfaceModel.data.hash, () => {
  const newUserData = parseInterfaceDataToAdminData(interfaceData.value);
  applyUserData(newUserData);
  form.value?.resetValidation();
  if (autoload && interfaceModel.data.hash && !isDemo.value) {
    setTimeout(() => {
      refresh().catch(() => {
        applyUserData(newUserData);
      });
    })
  }
  interfaceModel.copyDataToOriginalData();
  nextTick(() => form.value?.resetValidation());
}, { immediate: true });

watch(() => selectedSectionKey.value, () => {
  form.value?.resetValidation();
  nextTick(() => form.value?.resetValidation());
}, { immediate: true })

watch(() => interfaceModel.data.content, () => {

  // Locale does not exist, fallback to first one
  if (!interfaceData.value.locales[selectedLocale.value]) {
    selectedLocale.value = getDefaultLocale(interfaceData.value);
  }

  // Section does not exist, fallback to first one
  const sections = Object.keys(interfaceData.value.sections);
  if (!interfaceData.value.sections[selectedSectionKey.value] && sections.length > 0) {
    selectedSectionKey.value = sections[0];
  }

  // Make sure current data structure matches the userData
  userData.value = parseInterfaceDataToAdminData(interfaceData.value, userData.value);
}, { immediate: true });

const iframe = ref<HTMLIFrameElement>();
const sendMessageToIframe = (type: string, data: string) => {
  if (iframe.value) {
    iframe.value.contentWindow?.postMessage({
      name: 'jsonms',
      type,
      data,
    }, '*');
  }
}
const sendUserDataToIframe = () => {
  sendMessageToIframe('data', JSON.stringify({
    data: deepToRaw(userData.value),
    settings: deepToRaw(serverSettings.value),
    locale: selectedLocale.value,
  }));
  sendMessageToIframe('section', (currentRoute.params.section || '').toString());
}
const listenMessage = (event: MessageEvent) => {
  if (event.data.name === 'jsonms') {
    switch (event.data.type) {
      case 'init':
        sendUserDataToIframe();
        break;
      case 'route':
        if (interfaceData.value.sections[event.data.data]) {
          router.push('/admin/' + interfaceModel.data.hash + '/' + event.data.data);
        }
        break;
      case 'locale':
        selectedLocale.value = event.data.data;
        break;
    }
  }
}
watch(() => userData.value, () => {
  if (sitePreviewMode.value !== 'off') {
    sendUserDataToIframe();
  }
}, { deep: true })

onMounted(() => {
  window.addEventListener('resize', updateWindowWidth)
  window.addEventListener('message', listenMessage)
});
onUnmounted(() => {
  window.removeEventListener('resize', updateWindowWidth)
  window.removeEventListener('message', listenMessage)
});
</script>

<template>
  <!-- EMPTY -->
  <div v-if="!showNavigationDrawer && !showContent" class="d-flex align-center justify-center text-center w-100">
    No section yet
  </div>

  <!-- TOOLBAR -->
  <v-app-bar v-if="showAppBar" :flat="appBarFlat" border>
    <template v-if="showNavigationDrawer && mobileMode" #prepend>
      <v-app-bar-nav-icon @click="toggleDrawer" />
    </template>

    <v-app-bar-title class="ml-2">
      <div class="d-flex align-center" style="gap: 1rem">
        <template v-if="interfaces.length > 1 && !preview">
          <InterfaceSelector
            v-model="interfaceModel"
            :interfaces="interfaces"
            :label="null"
            type="admin"
            density="comfortable"
            variant="solo"
            flat
            large-text
            :style="{
              maxWidth: smAndDown ? 'auto' : 'max-content'
            }"
          />
        </template>
        <div v-else class="d-flex align-center ml-2 text-truncate" style="gap: 1rem">
          <img
            v-if="interfaceData.global.logo"
            :src="interfaceData.global.logo"
            height="32"
            alt="Logo"
          >
          <span class="text-truncate overflow-hidden">{{ interfaceData.global.title }}</span>
        </div>
      </div>
    </v-app-bar-title>

    <div class="d-flex align-center mx-3" style="gap: 1rem">
      <v-btn
        v-if="showFetchUserData"
        :loading="loading"
        :icon="mobileMode"
        :disabled="loading || !canInteractWithServer || fetched"
        @click="fetchData"
      >
        <v-icon v-if="!fetched" :start="!mobileMode" icon="mdi-monitor-arrow-down" />
        <v-icon v-else :start="!mobileMode" icon="mdi-check" />
        <span v-if="!mobileMode && !fetched">Fetch user data</span>
        <span v-else-if="!mobileMode">Fetched!</span>
      </v-btn>
      <template v-if="!preview && globalStore.session.loggedIn">
        <v-btn-toggle
          v-model="sitePreviewMode"
          :color="theme.primary"
          :disabled="!sitePreviewUrl"
          mandatory
          group
          variant="text"
        >
          <v-tooltip
            text="Data"
            location="bottom"
          >
            <template #activator="{ props }">
              <v-btn v-bind="props" value="off">
                <v-icon icon="mdi-form-textarea" />
              </v-btn>
            </template>
          </v-tooltip>

          <v-tooltip
            text="Mobile"
            location="bottom"
          >
            <template #activator="{ props }">
              <v-btn v-bind="props" value="mobile">
                <v-icon icon="mdi-cellphone" />
              </v-btn>
            </template>
          </v-tooltip>

          <v-tooltip
            text="Desktop"
            location="bottom"
          >
            <template #activator="{ props }">
              <v-btn v-bind="props" value="desktop">
                <v-icon icon="mdi-monitor" />
              </v-btn>
            </template>
          </v-tooltip>
        </v-btn-toggle>

        <SessionPanel
          :show-username="!smAndDown"
          @logout="onLogout"
        >
          <v-list-item
            v-if="canInteractWithServer"
            :disabled="downloading"
            title="Download data"
            prepend-icon="mdi-tray-arrow-down"
            @click="download"
          />
        </SessionPanel>
      </template>
    </div>
  </v-app-bar>

  <!-- SIDEBAR -->
  <v-navigation-drawer
    v-if="showNavigationDrawer"
    v-model="drawer"
    :permanent="!mobileMode"
    :mobile-breakpoint="preview ? 1400 : 960"
    width="250"
  >
    <v-list v-model="selectedSectionKey" nav>
      <template
        v-for="(section, sectionKey) in interfaceData.sections"
        :key="sectionKey"
      >
        <v-divider v-if="sectionKey === 'separator'" class="my-2" />
        <v-list-item
          v-else
          :value="sectionKey"
          :title="section.label || sectionKey"
          :active="selectedSectionKey === sectionKey"
          :prepend-icon="section.icon"
          :color="theme.primary"
          @click="goToSection(sectionKey.toString())"
        />
      </template>
    </v-list>
    <template #append>
      <v-divider />
      <div v-if="!preview" class="pa-3">
        <v-btn
          to="/admin"
          color="secondary"
          prepend-icon="mdi-shield-account"
          variant="flat"
          block
        >
          Admin Directory
        </v-btn>
      </div>
      <v-footer color="#f9f9f9">
        <small style="font-size: 0.6rem">{{ interfaceData.global.copyright }}</small>
      </v-footer>
    </template>
  </v-navigation-drawer>

  <!-- MAIN CONTENT -->
  <v-form
    v-if="showContent"
    ref="form"
    v-model="formIsValid"
    v-scroll="onScroll"
    v-scroll.self="onScroll"
    :class="{
      'w-100': true,
      'd-flex align-start fill-height': !preview,
      'pa-4': !mobileMode,
      'overflow-y-scroll': preview,
      'bg-surface': mobileMode,
      'fill-height': mobileMode && !preview,
    }"
    :style="{
      gap: '1rem',
      maxWidth: preview && !mobileMode && showNavigationDrawer ? 'calc(100% - 250px)' : undefined,
      marginTop: preview ? '64px' : undefined,
      marginLeft: !mobileMode && showNavigationDrawer && preview ? '250px' : undefined,
      marginBottom: showActionBar && preview ? '64px' : undefined,
    }"
  >
    <!-- PREVIEW -->
    <div
      v-if="showSitePreview && sitePreviewUrl"
      :style="{
        width: sitePreviewMode === 'mobile' ? '23rem' : undefined,
        height: 'calc(100vh - 128px - 2rem)',
      }"
      :class="{
        'align-self-start': true,
        'w-100 fill-height': sitePreviewMode === 'desktop',
      }"
    >
      <v-responsive
        v-if="sitePreviewMode === 'mobile'"
        :aspect-ratio="9/16"
        class="position-fixed"
        style="z-index: 1; width: 23rem; height: calc(100vh - 128px - 2rem)"
      >
        <v-card class="fill-height w-100 pa-1">
          <iframe
            ref="iframe"
            :src="sitePreviewUrl"
            frameborder="0"
            style="float: left"
            class="w-100 fill-height"
          />
        </v-card>
      </v-responsive>
      <v-responsive v-if="sitePreviewMode === 'mobile'" :aspect-ratio="9/16" />
      <div v-else class="w-100 fill-height d-flex align-center justify-center">
        <v-card class="desktop-preview-container">
          <div class="w-100 fill-height">
            <iframe
              ref="iframe"
              :src="sitePreviewUrl"
              frameborder="0"
              style="float: left"
              class="w-100 fill-height"
            />
          </div>
        </v-card>
      </div>
    </div>

    <!-- DATA -->
    <v-card
      v-if="sitePreviewMode !== 'desktop'"
      :flat="mobileMode"
      :tile="mobileMode"
      :class="{
        'pa-4 w-100': true,
        'height': 'min-content',
      }"
      :style="{
        gap: '1rem',
        flex: 1,
      }"
    >
      <div class="d-flex flex-column" style="gap: 1rem">
        <div>
          <div class="d-flex align-center justify-space-between" style="gap: 1rem">
            <h1>{{ selectedSection.label }}</h1>
            <LocaleSwitcher
              v-if="showLocaleSwitcher"
              v-model="selectedLocale"
              :locales="locales"
              :dense="mobileMode"
              :disabled="loading"
              style="max-width: 12rem"
              @update:model-value="onLocaleChange"
            />
          </div>

          <p v-if="selectedSection.prepend" class="mt-6">
            {{ selectedSection.prepend }}
          </p>
        </div>
        <template
          v-for="(field, key) in interfaceData.sections[selectedSectionKey].fields"
          :key="key"
        >
          <FieldItem
            v-if="field.type.includes('i18n')"
            v-model="userData[selectedSectionKey][key][selectedLocale]"
            :field="field"
            :locale="selectedLocale"
            :locales="interfaceData.locales"
            :structure="interfaceData"
            :interface="interfaceModel"
            :server-settings="serverSettings"
            :loading="loading"
          />
          <FieldItem
            v-else
            v-model="userData[selectedSectionKey][key]"
            :field="field"
            :locale="selectedLocale"
            :locales="interfaceData.locales"
            :structure="interfaceData"
            :interface="interfaceModel"
            :server-settings="serverSettings"
            :loading="loading"
          />
        </template>

        <p v-if="selectedSection.append" class="mt-3">
          {{ selectedSection.append }}
        </p>
      </div>
    </v-card>

    <!-- ACTION BAR -->
    <v-app-bar v-if="showActionBar" location="bottom">
      <v-spacer />
      <div class="d-flex align-center pr-3" style="gap: 0.5rem">
        <v-btn
          :loading="saving"
          :disabled="!canSave"
          :variant="saved ? 'outlined' : 'flat'"
          :readonly="saved"
          :color="canSave ? 'primary' : undefined"
          @click.stop.prevent="save"
        >
          <template v-if="!saved">
            <v-icon start icon="mdi-content-save" />
            Save
          </template>
          <template v-else>
            <v-icon start icon="mdi-check" />
            Saved!
          </template>
        </v-btn>
        <v-btn
          :disabled="!dataHasChanged"
          variant="text"
          @click="cancel"
        >
          Reset
        </v-btn>
      </div>
    </v-app-bar>
  </v-form>
</template>

<style lang="scss" scoped>
.desktop-preview-container {
  max-width: 150%;
  width: calc((150vh - 192px - 3rem) * 1.7777777777777777);
  height: calc(150vh - 192px - 3rem);
  zoom: 0.666;
}
</style>
