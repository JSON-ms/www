<script lang="ts" setup>
import blankInterface from '@/assets/blank-interface.yaml'
import InterfaceEditor from '@/components/InterfaceEditor.vue';
import Logo from '@/components/Logo.vue';
import ContentEditor from '@/components/ContentEditor.vue';
import Docs from '@/components/Docs.vue';
import Settings from '@/components/Settings.vue';
import SessionPanel from '@/components/SessionPanel.vue';
import Integration from '@/components/Integration.vue';
import { computed, type Ref, ref, toRaw, watch } from 'vue';
import { useDisplay } from 'vuetify';
import GoogleSignInButton from '@/components/GoogleSignInButton.vue';
import { useGlobalStore } from '@/stores/global';
import type { IInterface } from '@/interfaces';
import { getDefaultInterfaceContent, getParsedInterface, getInterface } from '@/utils';
import { Services } from '@/services';
import InterfaceSelector from '@/components/InterfaceSelector.vue';
import NewInterfaceModal from '@/components/NewInterfaceModal.vue';
import router from '@/router';
import { useRoute } from 'vue-router';
import Rules from '@/rules';

const { smAndDown } = useDisplay()
const drawer = ref(false);
const selectTemplate = ref(false);
const tab = ref(smAndDown.value ? 'interface' : 'preview');
const toggleDrawer = () => {
  drawer.value = !drawer.value;
}
const gotoTab = (key: string) => {
  tab.value = key;
  drawer.value = false;
}

let interfaceChangedTimeout: any;
const interfaceChanging = ref(false);
const interfaceChanged = ref(false);
const onInterfaceChanging = () => {
  interfaceChanging.value = true;
  interfaceChanged.value = false;
}
const onInterfaceChanged = () => {
  interfaceChanging.value = false;
  interfaceChanged.value = true;
  clearTimeout(interfaceChangedTimeout);
  interfaceChangedTimeout = setTimeout(() => interfaceChanged.value = false, 2000);
}
const currentRawValue = ref('');
const onInterfaceRawChange = (value: string) => {
  currentRawValue.value = value;
}

const defaultInterface = getDefaultInterfaceContent();
const globalStore = useGlobalStore();
const currentRoute = useRoute();
const hasParamInterfaceAndNotNew = currentRoute.params.interface && currentRoute.params.interface !== 'new';
const selectedInterface: Ref<IInterface> = ref(getInterface(defaultInterface));
const validInterfaces = globalStore.session.interfaces.filter(item => ['owner', 'interface'].includes(item.type));

if (!currentRoute.params.interface && validInterfaces.length > 0) {
  validInterfaces.sort((a, b) => {
    if (a.type === 'owner' && b.type !== 'owner') {
      return -1;
    }
    if (a.type !== 'owner' && b.type === 'owner') {
      return 1;
    }
    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  });
  selectedInterface.value = validInterfaces[0];
} else if (globalStore.session.loggedIn) {
  const found = validInterfaces.find(item => item.hash === currentRoute.params.interface);
  if (found) {
    selectedInterface.value = found;
  } else if (hasParamInterfaceAndNotNew) {
    globalStore.catchError(new Error('Unfortunately, you don\'t have access to edit the interface of the selected admin panel.'));
  }
} else if (hasParamInterfaceAndNotNew) {
  router.replace('/');
}

const onLogout = () => {
  selectedInterface.value = getInterface(defaultInterface);
  if (smAndDown.value) {
    tab.value = 'interface';
  }
}

const settingsHasError = computed((): boolean => {
  return !Rules.isUrl(selectedInterface.value.server_url || '');
})

const showSettingsHasError = computed((): boolean => {
  return globalStore.session.loggedIn && settingsHasError.value;
})

// @ts-expect-error process.env is parsed from backend
const version = JSON.parse(process.env.APP_VERSION);
const copyright = ref('JSON.ms v' + version + '. Licensed under the BSD-3-Clause.');

const create = () => {
  globalStore.setPrompt({
    ...globalStore.prompt,
    visible: true,
    title: 'New Document',
    body: 'If you create a new document, you may lose any unsaved work. Do you want to continue?',
    btnText: 'Create',
    btnIcon: 'mdi-plus',
    btnColor: 'secondary',
    callback: () => new Promise(resolve => {
      tab.value = smAndDown.value ? 'interface' : 'docs';
      selectTemplate.value = true;
      selectedInterface.value = getInterface(blankInterface);
      selectedInterface.value.hash = 'new';
      resolve();
    })
  })
}

const saving = ref(false);
const saved = ref(false);
const canSave = computed((): boolean => {
  return originalSelectedInterface.value.content !== currentRawValue.value;
})
const save = () => {
  if (!canSave.value) {
    return;
  }
  saving.value = true;

  const wasNew = !(selectedInterface.value.uuid);
  const parsedInterface = getParsedInterface(selectedInterface.value);
  Services.post(import.meta.env.VITE_SERVER_URL + '/interface', {
    interface: {
      ...selectedInterface.value,
      label: parsedInterface.global.title || 'Untitled',
    },
  })
    .then(response => {
      selectedInterface.value = response.interface;
      originalSelectedInterface.value = structuredClone(response.interface);
      currentRawValue.value = selectedInterface.value.content;
      selectedInterface.value.type = wasNew ? 'owner' : selectedInterface.value.type;
      if (wasNew) {
        globalStore.addInterface(selectedInterface.value);
      }
    })
    .catch(globalStore.catchError)
    .finally(() => {
      saving.value = false;
      saved.value = true;
      setTimeout(() => saved.value = false, 2000);
    });
}

const deleting = ref(false);
const remove = () => {
  globalStore.setPrompt({
    ...globalStore.prompt,
    visible: true,
    title: 'Delete interface',
    body: 'By proceeding, you will delete your interface and your users won\'t be able to access this admin panel anymore. Are you sure you want to continue?',
    btnText: 'Delete',
    btnIcon: 'mdi-delete-outline',
    btnColor: 'error',
    callback: () => new Promise(resolve => {
      deleting.value = true;
      Services.delete(import.meta.env.VITE_SERVER_URL + '/interface', {
        interface: selectedInterface.value,
      })
        .then(() => {
          const oldInterface = selectedInterface.value;

          tab.value = smAndDown.value ? 'interface' : 'docs';
          selectTemplate.value = true;
          selectedInterface.value = getInterface(blankInterface);
          selectedInterface.value.hash = 'new';

          globalStore.removeInterface(oldInterface);
        })
        .then(resolve)
        .catch(globalStore.catchError)
        .finally(() => deleting.value = false);
    })
  })
}

const applyTemplate = (template: string) => {
  selectedInterface.value.content = template;
}

watch(() => selectedInterface.value.hash, (hash: string | undefined) => {
  if (hash) {
    router.replace('/editor/' + hash);
  } else if (hasParamInterfaceAndNotNew) {
    router.replace('/');
  }
}, { immediate: true })

// Keep at the end..
const originalSelectedInterface: Ref<IInterface> = ref(structuredClone(toRaw(selectedInterface.value)));
currentRawValue.value = selectedInterface.value.content;
</script>

<template>
  <v-app-bar :elevation="2">
    <v-app-bar-nav-icon v-if="smAndDown" @click="toggleDrawer" />

    <v-app-bar-title style="flex: 1; min-width: 110px">
      <Logo />
    </v-app-bar-title>

    <template v-if="!smAndDown">
      <v-divider class="mx-4" inset vertical />
      <div style="flex: 12" class="mr-3">
        <template v-if="!globalStore.session.loggedIn">
          <span class="text-left">Generate an admin panel from a YAML interface that communicates with a remote server using JSON.</span>
        </template>
        <div v-else class="d-flex align-center" style="gap: 0.5rem">
          <InterfaceSelector
            v-model="selectedInterface"
            :disabled="selectTemplate"
            :interfaces="globalStore.session.interfaces"
            :saving="saving"
            :saved="saved"
            :can-save="canSave"
            :deleting="deleting"
            type="interface"
            style="max-width: 25rem"
            actions
            @create="create"
            @save="save"
            @delete="remove"
          />

          <div v-if="interfaceChanging || interfaceChanged" class="ml-4">
            <v-progress-circular
              v-if="interfaceChanging"
              indeterminate
              color="primary"
              class="mr-2"
              size="24"
              width="2"
            />
            <v-icon
              v-if="interfaceChanged"
              icon="mdi-check"
              start
              color="success"
            />
            <span v-if="interfaceChanging">Parsing...</span>
            <span v-if="interfaceChanged">Parsed!</span>
          </div>
        </div>
      </div>
    </template>

    <div class="d-flex align-center mr-3" style="gap: 1rem">
      <!--      <div>-->
      <!--        <v-tooltip-->
      <!--          text="Github"-->
      <!--          location="bottom"-->
      <!--        >-->
      <!--          <template #activator="{ props }">-->
      <!--            <v-btn-->
      <!--              v-bind="props"-->
      <!--              icon-->
      <!--              href="https://github.com/dannycoulombe/jsonms"-->
      <!--              target="_blank"-->
      <!--            >-->
      <!--              <v-icon icon="mdi-github" />-->
      <!--            </v-btn>-->
      <!--          </template>-->
      <!--        </v-tooltip>-->
      <!--      </div>-->
      <GoogleSignInButton
        v-if="!globalStore.session.loggedIn"
      />
      <SessionPanel
        v-else
        @logout="onLogout"
      />
    </div>
  </v-app-bar>

  <v-navigation-drawer
    v-if="smAndDown"
    v-model="drawer"
    temporary
    width="250"
  >
    <v-list v-model="tab" color="primary" nav>
      <v-list-item
        :active="tab === 'interface'"
        prepend-icon="mdi-square-edit-outline"
        title="Editor"
        @click="gotoTab('interface')"
      />
      <v-list-item
        :active="tab === 'preview'"
        prepend-icon="mdi-monitor-eye"
        title="Preview"
        @click="gotoTab('preview')"
      />
      <v-list-item
        :active="tab === 'settings'"
        :append-icon="showSettingsHasError ? 'mdi-alert' : undefined"
        prepend-icon="mdi-cog"
        title="Settings"
        @click="gotoTab('settings')"
      >
        <template v-if="showSettingsHasError" #append>
          <v-icon color="warning" class="ml-3">
            mdi-alert
          </v-icon>
        </template>
      </v-list-item>
      <v-list-item
        :active="tab === 'integration'"
        prepend-icon="mdi-progress-download"
        title="Integration"
        @click="gotoTab('integration')"
      />
      <v-list-item
        :active="tab === 'docs'"
        prepend-icon="mdi-book"
        title="Docs"
        @click="gotoTab('docs')"
      />
    </v-list>
    <template v-if="smAndDown && globalStore.session.loggedIn" #prepend>
      <div class="pa-3">
        <InterfaceSelector
          v-model="selectedInterface"
          :saving="saving"
          :saved="saved"
          :can-save="canSave"
          :deleting="deleting"
          :disabled="selectTemplate"
          :interfaces="globalStore.session.interfaces"
          type="admin"
          class="mt-2"
        />
      </div>
      <v-divider />
    </template>
    <template #append>
      <v-divider />
      <v-footer color="#f9f9f9">
        <small style="font-size: 0.6rem">{{ copyright }}</small>
      </v-footer>
    </template>
  </v-navigation-drawer>

  <v-container class="pa-0 fill-height" fluid>
    <v-row no-gutters class="fill-height">
      <v-col
        v-if="!smAndDown"
        cols="12"
        md="5"
        class="d-flex flex-column justify-center"
        style="position: relative"
      >
        <NewInterfaceModal
          v-model="selectTemplate"
          @apply="applyTemplate"
        />
        <InterfaceEditor
          v-model="selectedInterface"
          style="flex: 1"
          @create="create"
          @save="save"
          @changing="onInterfaceChanging"
          @changed="onInterfaceChanged"
          @raw-change="onInterfaceRawChange"
        />
      </v-col>
      <v-col cols="12" md="7" class="d-flex flex-column justify-center">
        <v-tabs v-if="!smAndDown" v-model="tab" bg-color="surface">
          <v-tab value="preview">
            <v-icon start icon="mdi-monitor-eye" />
            Preview
          </v-tab>
          <v-tab value="settings">
            <v-icon start icon="mdi-cog" />
            Settings
            <v-icon v-if="showSettingsHasError" color="warning" class="ml-3">
              mdi-alert
            </v-icon>
          </v-tab>
          <v-tab value="integration">
            <v-icon start icon="mdi-progress-download" />
            Integration
          </v-tab>
          <v-tab value="docs">
            <v-icon start icon="mdi-book" />
            Docs
          </v-tab>
        </v-tabs>
        <v-sheet color="background" style="flex: 1">
          <v-tabs-window v-model="tab" class="fill-height">
            <v-tabs-window-item value="interface" class="fill-height">
              <v-layout class="d-flex fill-height w-100">
                <NewInterfaceModal
                  v-if="globalStore.session.loggedIn"
                  v-model="selectTemplate"
                  @apply="applyTemplate"
                />
                <v-main>
                  <InterfaceEditor
                    v-model="selectedInterface"
                    class="fill-height w-100"
                  />
                </v-main>
                <v-app-bar
                  v-if="globalStore.session.loggedIn"
                  theme="dark"
                  location="bottom"
                  class="px-3"
                >
                  <InterfaceSelector
                    v-model="selectedInterface"
                    :saving="saving"
                    :saved="saved"
                    :can-save="canSave"
                    :deleting="deleting"
                    :disabled="selectTemplate"
                    :interfaces="globalStore.session.interfaces"
                    :menu-props="{
                      theme: 'light'
                    }"
                    type="interface"
                    actions
                    @create="create"
                    @save="save"
                    @delete="remove"
                  />
                </v-app-bar>
              </v-layout>
            </v-tabs-window-item>
            <v-tabs-window-item value="preview" class="fill-height">
              <div
                :style="{
                  maxHeight: smAndDown ? 'calc(100vh - 64px)' : 'calc(100vh - (64px + 48px))',
                }"
                :class="{
                  'pa-4 fill-height': !smAndDown,
                  'pa-2 fill-height': smAndDown,
                }"
              >
                <v-layout class="elevation-2 fill-height">
                  <ContentEditor
                    v-model="selectedInterface"
                    preview
                    autoload
                  />
                </v-layout>
              </div>
            </v-tabs-window-item>
            <v-tabs-window-item value="settings" class="fill-height">
              <div class="pa-4 fill-height">
                <Settings
                  v-model="selectedInterface"
                  :demo="!globalStore.session.loggedIn"
                  :disabled="selectedInterface.type !== 'owner'"
                  :saving="saving"
                  :saved="saved"
                  :can-save="canSave"
                  @save="save"
                />
              </div>
            </v-tabs-window-item>
            <v-tabs-window-item value="integration" class="fill-height">
              <div class="pa-4 fill-height">
                <Integration
                  v-model="selectedInterface"
                />
              </div>
            </v-tabs-window-item>
            <v-tabs-window-item value="docs" class="fill-height">
              <div
                class="pa-md-4 fill-height overflow-y-scroll"
                :style="{
                  maxHeight: smAndDown ? undefined : 'calc(100vh - 112px)',
                }"
              >
                <Docs />
              </div>
            </v-tabs-window-item>
          </v-tabs-window>
        </v-sheet>
      </v-col>
    </v-row>
  </v-container>
</template>
