<script lang="ts" setup>
import blankInterface from '@/assets/blank-interface.yaml'
import InterfaceEditor from '@/components/InterfaceEditor.vue';
import Logo from '@/components/Logo.vue';
import ContentEditor from '@/components/ContentEditor.vue';
import Docs from '@/components/Docs.vue';
import Settings from '@/components/Settings.vue';
import SessionPanel from '@/components/SessionPanel.vue';
import Integration from '@/components/Integration.vue';
import { type Ref, ref } from 'vue';
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

const defaultInterface = getDefaultInterfaceContent();
const globalStore = useGlobalStore();
const currentRoute = useRoute();
const selectedInterface: Ref<IInterface> = ref(getInterface(defaultInterface));
if (!currentRoute.params.interface && globalStore.session.interfaces.length > 0) {
  globalStore.session.interfaces.sort((a, b) => {
    if (a.type === 'owner' && b.type !== 'owner') {
      return -1;
    }
    if (a.type !== 'owner' && b.type === 'owner') {
      return 1;
    }
    return new Date(a.created_at) - new Date(b.created_at);
  });
  router.replace('/editor/' + globalStore.session.interfaces[0].hash);
  selectedInterface.value = globalStore.session.interfaces[0];
} else if (globalStore.session.loggedIn) {
  const found = globalStore.session.interfaces.find(item => item.hash === currentRoute.params.interface);
  if (found && ['owner', 'interface'].includes(found.type || '')) {
    selectedInterface.value = found;
  } else {
    globalStore.catchError(new Error('Unfortunately, you don\'t have access to edit the interface of the selected admin panel.'));
  }
} else if (currentRoute.params.interface) {
  router.replace('/');
}

const onLogout = () => {
  selectedInterface.value = getInterface(defaultInterface);
  if (smAndDown.value) {
    tab.value = 'interface';
  }
}

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
      resolve();
    })
  })
}

const version = JSON.parse(process.env.APP_VERSION);
const copyright = ref('JSON.ms v' + version + '. Licensed under the BSD-3-Clause.');

const saving = ref(false);
const saved = ref(false);
const save = () => {
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
          globalStore.removeInterface(selectedInterface.value);
          selectedInterface.value = getInterface(blankInterface);
          tab.value = 'docs';
          selectTemplate.value = true;
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
            :interfaces="globalStore.session.interfaces"
            type="interface"
            style="max-width: 25rem"
            actions
            @create="create"
            @save="save"
            @delete="remove"
            @change="item => router.replace('/editor/' + item.hash)"
          />
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
      <v-list-item :active="tab === 'interface'" @click="gotoTab('interface')">
        <v-icon start icon="mdi-square-edit-outline" />
        Editor
      </v-list-item>
      <v-list-item :active="tab === 'preview'" @click="gotoTab('preview')">
        <v-icon start icon="mdi-monitor-eye" />
        Preview
      </v-list-item>
      <v-list-item :active="tab === 'settings'" @click="gotoTab('settings')">
        <v-icon start icon="mdi-cog" />
        Settings
      </v-list-item>
      <v-list-item :active="tab === 'integration'" @click="gotoTab('integration')">
        <v-icon start icon="mdi-progress-download" />
        Integration
      </v-list-item>
      <v-list-item :active="tab === 'docs'" @click="gotoTab('docs')">
        <v-icon start icon="mdi-book" />
        Docs
      </v-list-item>
    </v-list>
    <template v-if="smAndDown && globalStore.session.loggedIn" #prepend>
      <div class="pa-3">
        <InterfaceSelector
          v-model="selectedInterface"
          :interfaces="globalStore.session.interfaces"
          type="admin"
          class="mt-2"
          @change="item => router.replace('/editor/' + item.hash)"
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
                <v-app-bar v-if="globalStore.session.loggedIn" theme="dark" location="bottom" class="px-3">
                  <InterfaceSelector
                    v-model="selectedInterface"
                    :interfaces="globalStore.session.interfaces"
                    :menu-props="{
                      theme: 'light'
                    }"
                    type="interface"
                    actions
                    @create="create"
                    @save="save"
                    @delete="remove"
                    @change="item => router.replace('/editor/' + item.hash)"
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
