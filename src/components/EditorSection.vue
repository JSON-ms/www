<script lang="ts" setup>
import InterfaceEditor from '@/components/InterfaceEditor.vue';
import Logo from '@/components/Logo.vue';
import ContentEditor from '@/components/ContentEditor.vue';
import Docs from '@/components/Docs.vue';
import Settings from '@/components/Settings.vue';
import SessionPanel from '@/components/SessionPanel.vue';
import { computed, ref } from 'vue';
import { useDisplay } from 'vuetify';
import GoogleSignInButton from '@/components/GoogleSignInButton.vue';
import { useGlobalStore } from '@/stores/global';
import {getDefaultInterfaceContent, getInterface, objectsAreDifferent,} from '@/utils';
import InterfaceSelector from '@/components/InterfaceSelector.vue';
import NewInterfaceModal from '@/components/NewInterfaceModal.vue';
import InterfaceModel from '@/models/interface.model';
import Changes from '@/changes';

// @ts-expect-error process.env is parsed from backend
const version = JSON.parse(process.env.APP_VERSION);
const { smAndDown } = useDisplay()
const copyright = ref('JSON.ms v' + version + '. Licensed under the BSD-3-Clause.');
const tab = ref(smAndDown.value ? 'interface' : 'preview');
const drawer = ref(false);
const speedDial = ref(false);
const selectTemplate = ref(false);
const defaultInterface = getInterface(getDefaultInterfaceContent())
const globalStore = useGlobalStore();
const interfaceModel = new InterfaceModel(defaultInterface);

const showSettingsHasError = computed((): boolean => {
  return globalStore.session.loggedIn && interfaceModel.hasSettingsError;
})

const isPristine = computed((): boolean => {
  return !objectsAreDifferent(interfaceModel.data, interfaceModel.originalData, [
    'label', 'logo', 'content',
  ])
})

const gotoTab = (key: string) => {
  tab.value = key;
  drawer.value = false;
}

const onLogout = () => {
  interfaceModel.data = defaultInterface;
  if (smAndDown.value) {
    tab.value = 'interface';
  }
}

const applyTemplate = (template: string, hash?: string, updateLabel = true) => {

  if (hash === 'new') {
    interfaceModel.data = getInterface();
  }
  interfaceModel.data.content = template;
  interfaceModel.data.hash = hash || interfaceModel.data.hash;

  if (hash === 'new') { // Needs to be after... do not merge with hash === new condition upstairs
    if (updateLabel) {
      interfaceModel.data.content = interfaceModel.data.content.replace('title: Dynamic Admin Panel Example', 'title: Untitled');
    }
    interfaceModel.data.label = 'Untitled';
    interfaceModel.data.logo = undefined;
  } else {
    const parsedContent = interfaceModel.getParsedData();
    interfaceModel.data.label = parsedContent.global.title || '';
    interfaceModel.data.logo = parsedContent.global.logo || '';
  }

  interfaceModel.copyDataToOriginalData();
  Changes.applySet('interface', interfaceModel.data, interfaceModel.originalData);
}

if (globalStore.session.loggedIn) {
  applyTemplate(interfaceModel.data.content, 'new', true);
}

const onCreateInterface = () => {
  Changes.doIfNoChanges(() => {
    selectTemplate.value = true;
  });
}

const onSaveInterface = () => {
  interfaceModel.save().then(model => {
    globalStore.removeInterface(interfaceModel);
    globalStore.addInterface(model);
  })
}

const onDeleteInterface = () => {
  interfaceModel.delete().then(() => {
    globalStore.removeInterface(interfaceModel);
    applyTemplate(interfaceModel.data.content, 'new');
  })
}

const onInterfaceContentChange = (template: string) => {
  interfaceModel.data.content = template;
  const parsedContent = interfaceModel.getParsedData();
  interfaceModel.data.label = parsedContent.global.title || '';
  interfaceModel.data.logo = parsedContent.global.logo || '';
}

const onSelectInterface = () => {
  applyTemplate(interfaceModel.data.content, interfaceModel.data.hash, true);
}
</script>

<template>
  <!-- TOOLBAR -->
  <v-app-bar :elevation="2">
    <v-app-bar-nav-icon v-if="smAndDown" @click="drawer = !drawer;" />

    <v-app-bar-title v-if="!smAndDown || !globalStore.session.loggedIn" style="flex: 1; min-width: 110px">
      <Logo />
    </v-app-bar-title>

    <template v-if="true">
      <v-divider v-if="!smAndDown" class="mx-4" inset vertical />
      <div style="flex: 12" class="mr-3">
        <template v-if="!smAndDown && !globalStore.session.loggedIn">
          <span class="text-left">Generate an admin panel from a YAML interface that communicates with a remote server using JSON.</span>
        </template>
        <div v-else-if="globalStore.session.loggedIn" class="d-flex align-center" style="gap: 0.5rem">
          <InterfaceSelector
            v-model="interfaceModel"
            :interfaces="globalStore.session.interfaces"
            :actions="!smAndDown && globalStore.session.loggedIn"
            :large-text="!smAndDown"
            :can-save="!isPristine"
            type="interface"
            style="max-width: 35rem; width: 10rem; min-width: min-content"
            @change="onSelectInterface"
            @create="onCreateInterface"
            @save="onSaveInterface"
            @delete="onDeleteInterface"
          />
        </div>
      </div>
    </template>

    <div class="d-flex align-center mr-3" style="gap: 1rem">
      <div v-if="!smAndDown">
        <v-tooltip
          text="Github"
          location="bottom"
        >
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              href="https://github.com/JSON-ms"
              target="_blank"
            >
              <v-icon icon="mdi-github" />
            </v-btn>
          </template>
        </v-tooltip>
      </div>
      <v-btn
        v-if="!smAndDown"
        to="/admin"
        color="secondary"
        prepend-icon="mdi-shield-account"
        variant="flat"
      >
        Admin Panel
      </v-btn>
      <GoogleSignInButton
        v-if="!globalStore.session.loggedIn"
      />
      <SessionPanel
        v-else
        :dense="smAndDown"
        @logout="onLogout"
      />
    </div>
  </v-app-bar>

  <!-- SIDEBAR -->
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
        :active="tab === 'docs'"
        prepend-icon="mdi-book"
        title="Docs"
        @click="gotoTab('docs')"
      />
      <v-divider class="my-3" />
      <v-list-item
        prepend-icon="mdi-github"
        append-icon="mdi-open-in-new"
        title="Github"
        href="https://github.com/JSON-ms"
        target="_blank"
      />
    </v-list>
    <template #append>
      <v-divider />
      <div v-if="smAndDown" class="pa-3">
        <v-btn
          to="/admin"
          color="secondary"
          prepend-icon="mdi-shield-account"
          variant="flat"
          block
        >
          Admin Panel
        </v-btn>
      </div>
      <v-footer color="#f9f9f9">
        <small style="font-size: 0.6rem">{{ copyright }}</small>
      </v-footer>
    </template>
  </v-navigation-drawer>

  <!-- CONTENT -->
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
          @apply="content => applyTemplate(content, 'new')"
        />
        <InterfaceEditor
          v-model="interfaceModel"
          style="flex: 1"
          @change="onInterfaceContentChange"
          @save="onSaveInterface"
          @create="onCreateInterface"
        />
      </v-col>
      <v-col cols="12" md="7" class="d-flex flex-column justify-start">
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
                  @apply="content => applyTemplate(content, 'new')"
                />
                <v-main>
                  <InterfaceEditor
                    v-model="interfaceModel"
                    class="fill-height w-100"
                    @change="onInterfaceContentChange"
                    @save="onSaveInterface"
                    @create="onCreateInterface"
                  />
                  <v-fab
                    v-if="globalStore.session.loggedIn && smAndDown"
                    location="right bottom"
                    color="primary"
                    icon="mdi-dots-vertical"
                    app
                    style="z-index: 1;"
                  >
                    <v-icon>{{ speedDial ? 'mdi-close' : 'mdi-dots-vertical' }}</v-icon>
                    <v-speed-dial
                      v-model="speedDial"
                      transition="slide-y-transition"
                      activator="parent"
                    >
                      <v-btn
                        key="1"
                        :loading="interfaceModel.states.value.deleting"
                        :disabled="!interfaceModel.data.uuid"
                        :color="!interfaceModel.data.uuid ? undefined : 'error'"
                        icon="mdi-delete-outline"
                        @click="onDeleteInterface"
                      />
                      <v-btn
                        key="2"
                        :loading="interfaceModel.states.value.saving"
                        :disabled="isPristine"
                        :color="isPristine ? undefined : 'primary'"
                        icon="mdi-content-save"
                        @click="onSaveInterface"
                      />
                      <v-btn
                        key="3"
                        :disabled="!interfaceModel.canCreate"
                        color="secondary"
                        icon="mdi-file-plus"
                        @click="onCreateInterface"
                      />
                    </v-speed-dial>
                  </v-fab>
                </v-main>
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
                    v-model="interfaceModel"
                    :interfaces="globalStore.session.interfaces"
                    preview
                  />
                </v-layout>
              </div>
            </v-tabs-window-item>
            <v-tabs-window-item value="settings" class="fill-height">
              <div
                class="pa-md-4 fill-height overflow-y-scroll"
                :style="{
                  maxHeight: smAndDown ? undefined : 'calc(100vh - 112px)',
                }"
              >
                <Settings
                  v-model="interfaceModel"
                  :demo="!globalStore.session.loggedIn"
                  :disabled="interfaceModel.data.type !== 'owner'"
                  @save="onSaveInterface"
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
