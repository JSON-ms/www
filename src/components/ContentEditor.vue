<script setup lang="ts">
import { computed, ref, toRaw, watch } from 'vue';
import { useDisplay } from 'vuetify'
import type { IData, IInterface, IServerSettings } from '@/interfaces';
import LocaleSwitcher from '@/components/LocaleSwitcher.vue';
import SessionPanel from '@/components/SessionPanel.vue';
import InterfaceSelector from '@/components/InterfaceSelector.vue';
import FieldItem from '@/components/FieldItem.vue';
import { useGlobalStore } from '@/stores/global';
import { getDefaultInterfaceContent, getInterface, getParsedInterface, objectsAreDifferent, parseInterfaceDataToAdminData } from '@/utils';
import router from '@/router';
import { Services } from '@/services';
import { useRoute } from 'vue-router';
import Changes from '@/changes';
import type { VForm } from 'vuetify/components';

const selectedInterface = defineModel<IInterface>({ required: true });
const computedSelectedInterface = computed({
  get(): IInterface {
    return selectedInterface.value;
  },
  set(model: IInterface): void {
    if (preview) {
      goToSection('');
    } else {
      router.push('/admin/' + model.hash);
    }
  }
})
const serverSettings = ref<IServerSettings>({
  postMaxSize: '8M',
  publicUrl: '',
  uploadMaxSize: '2M',
})
const { preview = false, interfaces = [], autoload = false } = defineProps<{
  preview?: boolean,
  autoload?: boolean,
  interfaces?: IInterface[],
}>();
const { smAndDown } = useDisplay()
const drawer = ref(!smAndDown.value);

const showAppBar = computed((): boolean => {
  return true;
})

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

const showNavigationDrawer = computed((): boolean => {
  return Object.keys(interfaceData.value.sections).length > 1
    || (interfaces.length > 1 && smAndDown.value);
})

const showContent = computed((): boolean => {
  return !!(selectedSection.value);
})

const toggleDrawer = () => {
  drawer.value = !drawer.value;
}

const interfaceData = computed((): IData => {
  return getParsedInterface(selectedInterface.value);
})

const canInteractWithServer = computed((): boolean => {
  return !!(selectedInterface.value.server_url)
   && !!(selectedInterface.value.hash);
})

const currentRoute = useRoute();
const adminData = parseInterfaceDataToAdminData(interfaceData.value);
const userData = ref(adminData);
const originalUserData = ref(adminData);

const selectedSection = computed(() => {
  return interfaceData.value.sections[selectedSectionKey.value];
})

const locales = computed(() => {
  return Object.entries(interfaceData.value.locales).map(item => ({ value: item[0], title: item[1] }));
})

const getDefaultLocale = (data: IData) => {
  const entries = Object.entries(data.locales);
  if (entries[0] && entries[0][0]) {
    return entries[0][0];
  }
  return 'en-US';
}
const selectedLocale = ref(getDefaultLocale(interfaceData.value));
const selectedSectionKey = ref(Object.keys(interfaceData.value.sections)[0]);
const routeSection = interfaceData.value.sections[currentRoute.params.section?.toString()];
if (currentRoute.params.section && routeSection) {
  selectedSectionKey.value = currentRoute.params.section.toString();
}

const globalStore = useGlobalStore();

const onLogout = () => {
  goToSection();
  selectedInterface.value = getInterface(getDefaultInterfaceContent());
}

// Check for changes and ask user before redirecting
const goToSection = (section: string = '') => {
  if (preview) {
    selectedSectionKey.value = section;
  } else {
    router.push('/admin/' + selectedInterface.value.hash + '/' + section)
  }
}

const formIsValid = ref(false);
const saving = ref(false);
const saved = ref(false);
const save = async (): Promise<any> => {
  saving.value = true;
  return Services.post(selectedInterface.value.server_url || '', {
    hash: selectedInterface.value.hash,
    data: userData.value,
  }, {
    'Content-Type': 'application/json',
    'X-Jms-Api-Key': selectedInterface.value.server_secret,
  })
    .then(() => {
      originalUserData.value = structuredClone(toRaw(userData.value));
      form.value?.resetValidation();
    })
    .catch(globalStore.catchError)
    .finally(() => {
      saving.value = false;
      saved.value = true;
      setTimeout(() => saved.value = false, 1000);
    });
}

const isDemo = ref(selectedInterface.value.hash === 'demo');
const loading = ref(false);
const refresh = () => {
  return new Promise((resolve, reject) => {
    if (selectedInterface.value.hash && selectedInterface.value.server_url) {
      loading.value = true;
      Services.get((selectedInterface.value.server_url + '?hash=' + selectedInterface.value.hash) || '', {
        'Content-Type': 'application/json',
        'X-Jms-Api-Key': selectedInterface.value.server_secret,
      })
        .then(response => {
          form.value?.resetValidation();
          serverSettings.value = response.settings;
          userData.value = parseInterfaceDataToAdminData(interfaceData.value, response.data);
          originalUserData.value = structuredClone(toRaw(userData.value));
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

const form = ref<VForm | null>(null);
const cancel = () => {
  userData.value = structuredClone(toRaw(originalUserData.value));
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

const appBarFlat = ref(true);
const onScroll = (event: Event) => {
  appBarFlat.value = event.target === document
    ? window.scrollY === 0
    : (event.target as HTMLElement).scrollTop === 0;
}

if (!preview) {
  watch(selectedSectionKey, () => {
    goToSection(selectedSectionKey.value);
  });
}

watch(() => selectedInterface.value.content, () => {

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
});

watch(() => selectedInterface.value.hash, () => {
  const newUserData = parseInterfaceDataToAdminData(interfaceData.value);
  userData.value = structuredClone(newUserData);
  originalUserData.value = structuredClone(newUserData);
  form.value?.resetValidation();
  if (autoload && selectedInterface.value.hash && !isDemo.value) {
    setTimeout(() => {
      refresh().catch(() => {
        userData.value = newUserData;
        originalUserData.value = structuredClone(toRaw(userData.value));
      });
    })
  }
});

if (autoload && !isDemo.value) {
  refresh();
}

// Detect changes..
const dataHasChanged = computed((): boolean => objectsAreDifferent(userData.value, originalUserData.value));
Changes.applySet('admin', userData, originalUserData);
router.afterEach((to) => {
  userData.value = structuredClone(toRaw(originalUserData.value));
  if (to.params.section) {
    selectedSectionKey.value = to.params.section.toString();
  }
  if (smAndDown.value) {
    drawer.value = false;
  }
})
</script>

<template>
  <!-- EMPTY -->
  <div v-if="!showNavigationDrawer && !showContent" class="d-flex align-center justify-center text-center w-100">
    No section yet
  </div>

  <!-- TOOLBAR -->
  <v-app-bar v-if="showAppBar" :flat="appBarFlat" border>
    <template v-if="showNavigationDrawer && smAndDown" #prepend>
      <v-app-bar-nav-icon @click="toggleDrawer" />
    </template>

    <v-app-bar-title>
      <div class="d-flex align-center" style="gap: 1rem">
        <img
          v-if="interfaceData.global.logo"
          :src="interfaceData.global.logo"
          height="32"
          alt="Logo"
        >
        <span class="text-truncate overflow-hidden">{{ interfaceData.global.title }}</span>
      </div>
    </v-app-bar-title>

    <div class="d-flex align-center mx-3" style="gap: 1rem">
      <v-btn
        v-if="showFetchUserData"
        :loading="loading"
        :icon="smAndDown"
        :disabled="loading || !canInteractWithServer"
        @click="refresh"
      >
        <v-icon :start="!smAndDown" icon="mdi-monitor-arrow-down" />
        <span v-if="!smAndDown">Fetch user data</span>
      </v-btn>
      <template v-if="!preview && globalStore.session.loggedIn">
        <template v-if="!smAndDown && interfaces.length > 1">
          <InterfaceSelector
            v-model="computedSelectedInterface"
            :interfaces="interfaces"
            type="admin"
            style="max-width: 25rem; width: 15rem"
          />
          <v-divider class="mx-3" inset vertical />
        </template>
        <SessionPanel @logout="onLogout" />
      </template>
    </div>
  </v-app-bar>

  <!-- SIDEBAR -->
  <v-navigation-drawer
    v-if="showNavigationDrawer"
    v-model="drawer"
    :permanent="!smAndDown"
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
    <template v-if="smAndDown && interfaces.length > 1" #prepend>
      <div class="pa-3">
        <InterfaceSelector
          v-model="computedSelectedInterface"
          :interfaces="interfaces"
          type="admin"
        />
      </div>
      <v-divider />
    </template>
    <template #append>
      <v-divider />
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
      'pa-4': !smAndDown,
      'overflow-y-scroll': preview,
      'bg-surface': smAndDown,
      'fill-height': smAndDown && !preview,
    }"
    :style="{
      maxWidth: preview && !smAndDown && showNavigationDrawer ? 'calc(100% - 250px)' : undefined,
      marginTop: preview ? '64px' : undefined,
      marginLeft: preview && !smAndDown && showNavigationDrawer ? '250px' : undefined,
      marginBottom: showActionBar && !smAndDown && preview ? '64px' : undefined,
    }"
  >
    <v-card
      :flat="smAndDown"
      :tile="smAndDown"
      :class="{
        'pa-4 w-100': true,
        'height': 'min-content',
      }"
      :style="{
        gap: '1rem',
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
              :dense="smAndDown"
              style="max-width: 12rem"
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
            :interface="selectedInterface"
            :server-settings="serverSettings"
          />
          <FieldItem
            v-else
            v-model="userData[selectedSectionKey][key].general"
            :field="field"
            :locale="selectedLocale"
            :locales="interfaceData.locales"
            :structure="interfaceData"
            :interface="selectedInterface"
            :server-settings="serverSettings"
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
