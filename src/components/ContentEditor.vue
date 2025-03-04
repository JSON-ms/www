<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDisplay } from 'vuetify'
import type { IData, IField, IInterface } from '@/interfaces';
import LocaleSwitcher from '@/components/LocaleSwitcher.vue';
import SessionPanel from '@/components/SessionPanel.vue';
import InterfaceSelector from '@/components/InterfaceSelector.vue';
import FieldList from '@/components/FieldList.vue';
import { useGlobalStore } from '@/stores/global';
import { getDefaultInterfaceContent, getInterface, getParsedInterface, parseInterfaceDataToAdminData } from '@/utils';
import router from '@/router';
import { Services } from '@/services';

const selectedInterface = defineModel<IInterface>({ required: true });
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

const showNavigationDrawer = computed((): boolean => {
  return Object.keys(data.value.sections).length > 0;
})

const showContent = computed((): boolean => {
  return !!(selectedSection.value);
})

const toggleDrawer = () => {
  drawer.value = !drawer.value;
}

const gotoTab = (key: string) => {
  selectedSectionKey.value = key;
  if (smAndDown.value) {
    drawer.value = false;
  }
}

const data = computed((): IData => {
  return getParsedInterface(selectedInterface.value);
})

const canInteractWithServer = computed((): boolean => {
  return !!(selectedInterface.value.server_url)
   && !!(selectedInterface.value.hash);
})

const userData = ref(parseInterfaceDataToAdminData(data.value));

const selectedSection = computed(() => {
  return data.value.sections[selectedSectionKey.value];
})

const locales = computed(() => {
  return Object.entries(data.value.locales).map(item => ({ value: item[0], title: item[1] }));
})
const selectedLocale = ref(Object.entries(data.value.locales)[0][0]);
const selectedSectionKey = ref(Object.keys(data.value.sections)[0]);

const globalStore = useGlobalStore();

const onLogout = () => {
  router.replace('/admin/' + selectedInterface.value.hash);
  selectedInterface.value = getInterface(getDefaultInterfaceContent());
}

const formIsValid = ref(false);
const saving = ref(false);
const saved = ref(false);
const save = (): Promise<any> => {
  saving.value = true;
  return Services.post(selectedInterface.value.server_url || '', {
    hash: selectedInterface.value.hash,
    data: userData.value,
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
    if (selectedInterface.value.hash) {
      Services.get((selectedInterface.value.server_url + '?hash=' + selectedInterface.value.hash) || '')
        .then(response => {
          userData.value = parseInterfaceDataToAdminData(data.value, response);
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

}

watch(selectedInterface, () => {
  if (autoload && selectedInterface.value.hash && !isDemo.value) {
    setTimeout(() => {
      refresh().catch(() => {
        userData.value = parseInterfaceDataToAdminData(data.value);
      });
    })
  }
});

if (autoload && !isDemo.value) {
  refresh();
}


</script>

<template>
  <div v-if="!showNavigationDrawer && !showContent" class="d-flex align-center justify-center text-center w-100">
    No section yet
  </div>

  <v-app-bar v-if="showAppBar" flat border>
    <template v-if="smAndDown" #prepend>
      <v-app-bar-nav-icon @click="toggleDrawer" />
    </template>

    <v-app-bar-title>
      <div class="d-flex align-center" style="gap: 1rem">
        <img
          v-if="data.global.logo"
          :src="data.global.logo"
          height="32"
          alt="Logo"
        >
        <span class="text-truncate overflow-hidden">{{ data.global.title }}</span>
      </div>
    </v-app-bar-title>

    <div class="d-flex align-center mr-3" style="gap: 1rem">
      <v-btn
        v-if="preview"
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
            v-model="selectedInterface"
            :interfaces="interfaces"
            type="admin"
            style="max-width: 25rem; width: 15rem"
            @change="item => router.replace('/admin/' + item.hash)"
          />
          <v-divider class="mx-3" inset vertical />
        </template>
        <SessionPanel @logout="onLogout" />
      </template>
    </div>
  </v-app-bar>

  <v-navigation-drawer
    v-if="showNavigationDrawer"
    v-model="drawer"
    :permanent="!smAndDown"
    width="250"
  >
    <v-list v-model="selectedSectionKey" nav>
      <template
        v-for="(section, sectionKey) in data.sections"
        :key="sectionKey"
      >
        <v-divider v-if="sectionKey === 'separator'" class="my-2" />
        <v-list-item
          v-else
          :value="sectionKey"
          :title="section.label || sectionKey"
          :active="selectedSectionKey === sectionKey"
          :prepend-icon="section.icon"
          :color="data.global.theme[globalStore.theme].primary"
          @click="gotoTab(sectionKey.toString())"
        />
      </template>
    </v-list>
    <template v-if="smAndDown" #prepend>
      <div class="pa-3">
        <InterfaceSelector
          v-model="selectedInterface"
          :interfaces="interfaces"
          type="admin"
          @change="item => router.replace('/admin/' + item.hash)"
        />
      </div>
      <v-divider />
    </template>
    <template #append>
      <v-divider />
      <div v-if="smAndDown" class="pa-3">
        <LocaleSwitcher
          v-model="selectedLocale"
          :locales="locales"
          class="w-100"
          style="width: 12rem"
        />
      </div>
      <v-footer color="#f9f9f9">
        <small style="font-size: 0.6rem">{{ data.global.copyright }}</small>
      </v-footer>
    </template>
  </v-navigation-drawer>

  <v-form
    v-if="showContent"
    v-model="formIsValid"
    :class="{
      'w-100': true,
      'pa-4': !smAndDown,
      'overflow-y-scroll': preview,
    }"
    :style="{
      maxWidth: preview && !smAndDown ? 'calc(100% - 250px)' : undefined,
      marginTop: preview ? '64px' : undefined,
      marginLeft: preview && !smAndDown ? '250px' : undefined,
      marginBottom: preview ? '64px' : undefined,
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
      <div
        :class="{
          'd-flex flex-column': true,
        }"
        style="gap: 1rem"
      >
        <div>
          <div class="d-flex align-center justify-space-between">
            <h1>{{ selectedSection.label }}</h1>
            <LocaleSwitcher
              v-if="!smAndDown"
              v-model="selectedLocale"
              :locales="locales"
              style="max-width: 12rem"
            />
          </div>

          <p v-if="selectedSection.prepend" class="mb-6">
            {{ selectedSection.prepend }}
          </p>
        </div>

        <FieldList
          :fields="selectedSection.fields"
          :data="userData"
          :locale="selectedLocale"
        />
      </div>
      <template v-if="!preview">
        <v-divider class="mt-3 mx-n4" />
      </template>
    </v-card>

    <v-app-bar location="bottom">
      <v-spacer />
      <div class="d-flex align-center pr-3" style="gap: 0.5rem">

        <v-btn
          :loading="saving"
          :disabled="saving || !formIsValid || !canInteractWithServer"
          :variant="saved ? 'outlined' : 'flat'"
          :readonly="saved"
          color="primary"
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
          variant="text"
          @click="cancel"
        >
          Cancel
        </v-btn>
      </div>
    </v-app-bar>
  </v-form>
</template>
