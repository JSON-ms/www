<script setup lang="ts">
import {useGlobalStore} from '@/stores/global';
import type {IStructureData, ISection, IServerSettings} from '@/interfaces';
import {computed, ref, watch} from 'vue';
import {useRoute} from 'vue-router';
import router from '@/router';
import {useUserData} from '@/composables/user-data';
import {useLayout} from '@/composables/layout';
import {useStructure} from '@/composables/structure';
import {useModelStore} from "@/stores/model";

const { structureData, serverSettings } = defineProps<{
  structureData: IStructureData,
  serverSettings: IServerSettings,
}>();
const { layoutSize } = useLayout();
const globalStore = useGlobalStore();
const modelStore = useModelStore();
const currentRoute = useRoute();
const { getUserDataErrors, userDataLoading, canInteractWithServer } = useUserData();
const { structureParsedData } = useStructure();

const selectedSectionKey = computed((): string => {
  return currentRoute.params.section.toString();
})

const hasSections = computed((): boolean => {
  return Object.keys(structureData.sections).length > 0;
})

const goToSection = (section: string = '') => {
  router.push('/admin/' + currentRoute.params.hash + '/' + section + '/' + currentRoute.params.locale);

  if (layoutSize.value.drawer.temporary) {
    globalStore.admin.drawer = false;
  }
}

const getErrors = (section: ISection, sectionKey: string | number): { i18n: string[], currentI18n: string[], general: string[] } => {
  const locale = currentRoute.params.locale.toString();
  const locales = structureParsedData.value.locales;
  const allErrors = Object.keys(getUserDataErrors(section.fields, sectionKey.toString()));
  const i18n = allErrors.filter(item => Object.keys(locales).find(subLocale => item.endsWith(subLocale)));
  return {
    i18n,
    currentI18n: i18n.filter(item => item.endsWith(locale)),
    general: allErrors.filter(item => Object.keys(locales).every(subLocale => !item.endsWith(subLocale))),
  }
}

const getErrorMsg = (section: ISection, sectionKey: string | number): string | null => {
  const errors = getErrors(section, sectionKey);
  const locales = structureParsedData.value.locales;
  if (errors.general.length > 0) {
    const path = errors.general[0];
    return `Field path "${path}" is missing a value`
  } else if (errors.currentI18n.length > 0) {
    const items = errors.currentI18n[0].split('.');
    items.pop();
    const path = items.join('.')
    return `Field path "${path}" is missing a value`;
  } else if (errors.i18n.length > 0) {
    const items = errors.i18n[0].split('.');
    const locale = items.pop();
    const path = items.join('.');
    if (locale) {
      return `Field path "${path}" is missing a value in ${locales[locale]}`
    }
  }
  return null;
}

const onFileManagerClick = () => {
  globalStore.showFileManager()
}

// @ts-expect-error Need to declare typings for process.env
const version = JSON.parse(process.env.APP_VERSION);

const lastDetails = ref({
  hash: '',
  version: '',
  uploadMaxSize: '',
});
const updateLastDetails = () => {
  lastDetails.value.hash = modelStore.structure.hash || 'Unknown';
  lastDetails.value.version = serverSettings.version || 'Unknown';
  lastDetails.value.uploadMaxSize = serverSettings.uploadMaxSize || 'Unknown';
}
watch(() => serverSettings.version, () => {
  if (serverSettings.version) {
    updateLastDetails();
  }
}, { immediate: true })
</script>

<template>
  <!-- SIDEBAR -->
  <v-navigation-drawer
    v-model="globalStore.admin.drawer"
    :temporary="layoutSize.drawer.temporary"
    :width="layoutSize.drawer.width"
    disable-resize-watcher
    disable-route-watcher
  >
    <v-empty-state
      v-if="!hasSections"
      icon="mdi-folder-question-outline"
      title="No section available"
      text="It appears that you have not created a section in your YAML template yet. Please ensure to define the necessary sections to avoid errors in your configuration."
    />
    <v-list v-else v-model="selectedSectionKey" nav>
      <template v-if="globalStore.uiConfig.sidebar_sections">
        <v-list-subheader title="Sections" />
        <template
          v-for="(section, sectionKey) in structureData.sections"
          :key="sectionKey"
        >
          <v-divider v-if="sectionKey === 'separator'" class="my-2" />
          <v-list-item
            v-else
            :value="sectionKey"
            :title="section.label || sectionKey"
            :active="selectedSectionKey === sectionKey"
            :prepend-icon="section.icon"
            color="primary"
            @click="goToSection(sectionKey.toString())"
          >
            <template v-if="!userDataLoading" #append>
              <v-tooltip
                v-if="getErrors(section, sectionKey).general.length > 0 || getErrors(section, sectionKey).currentI18n.length > 0"
                :text="getErrorMsg(section, sectionKey) || ''"
                location="right"
                max-width="400"
              >
                <template #activator="{ props }">
                  <v-icon v-bind="props" icon="mdi-asterisk" color="warning" />
                </template>
              </v-tooltip>
              <v-tooltip
                v-else-if="getErrors(section, sectionKey).i18n.length > 0"
                :text="getErrorMsg(section, sectionKey) || ''"
                location="right"
                max-width="400"
              >
                <template #activator="{ props }">
                  <v-icon v-bind="props" icon="mdi-asterisk" color="warning" />
                </template>
              </v-tooltip>
            </template>
          </v-list-item>
        </template>
      </template>

      <template v-if="globalStore.uiConfig.sidebar_tools">
        <v-list-subheader title="Tools" />
        <v-list-item
          v-if="globalStore.uiConfig.sidebar_tools_file_manager"
          title="File Manager"
          color="primary"
          subtitle="Organize Your Files"
          prepend-icon="mdi-file-cabinet"
          @click="onFileManagerClick"
        />
<!--        <v-expand-transition>-->
<!--          <div v-if="globalStore.uiConfig.sidebar_developer && globalStore.admin.structure && canInteractWithServer">-->
<!--            <v-list-subheader title="Developer details" />-->
<!--            <v-list-item-->
<!--              v-if="globalStore.uiConfig.sidebar_developer_hash"-->
<!--              title="Hash"-->
<!--              :subtitle="lastDetails.hash || 'Loading...'"-->
<!--            />-->
<!--            <v-list-item-->
<!--              v-if="globalStore.uiConfig.sidebar_developer_server"-->
<!--              title="Server version"-->
<!--              :subtitle="lastDetails.version || 'Loading...'"-->
<!--            />-->
<!--            <v-list-item-->
<!--              v-if="globalStore.uiConfig.sidebar_developer_upload"-->
<!--              title="Upload max size"-->
<!--              :subtitle="lastDetails.uploadMaxSize || 'Loading...'"-->
<!--            />-->
<!--          </div>-->
<!--        </v-expand-transition>-->
      </template>
    </v-list>
    <template #append>
      <v-divider
        v-if="globalStore.uiConfig.sidebar_tutorial || globalStore.uiConfig.sidebar_github"
      />
      <div class="pa-3 d-flex flex-column" style="gap: 0.5rem">
        <v-btn
          v-if="globalStore.uiConfig.sidebar_tutorial"
          href="https://www.youtube.com/@jsonms"
          target="_blank"
          color="secondary"
          prepend-icon="mdi-cast-education"
          variant="flat"
          block
        >
          Tutorials
        </v-btn>
        <v-btn
          v-if="globalStore.uiConfig.sidebar_github"
          prepend-icon="mdi-github"
          href="https://github.com/JSON-ms"
          target="_blank"
          variant="outlined"
          block
        >
          Github
        </v-btn>
      </div>
      <v-footer v-if="globalStore.uiConfig.sidebar_footer" color="footer">
        <small style="font-size: 0.6rem">JSON.ms v{{ version }}. Licensed under the BSD-3-Clause.</small>
      </v-footer>
    </template>
  </v-navigation-drawer>
</template>
