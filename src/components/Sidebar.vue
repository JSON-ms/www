<script setup lang="ts">
import {useGlobalStore} from '@/stores/global';
import type {IInterface, IInterfaceData, ISection} from '@/interfaces';
import {computed} from 'vue';
import {useRoute} from 'vue-router';
import router from '@/router';
import {useUserData} from '@/composables/user-data';
import {useLayout} from '@/composables/layout';
import {useInterface} from '@/composables/interface';

const interfaceModel = defineModel<IInterface>({ required: true });
const { interfaceData } = defineProps<{
  interfaceData: IInterfaceData,
}>();
const { layoutSize } = useLayout();
const globalStore = useGlobalStore();
const currentRoute = useRoute();
const { getUserDataErrors, userDataLoading } = useUserData();
const { interfaceParsedData } = useInterface();

const selectedSectionKey = computed((): string => {
  return currentRoute.params.section.toString();
})

const hasSections = computed((): boolean => {
  return Object.keys(interfaceData.sections).length > 0;
})

const goToSection = (section: string = '') => {
  router.push('/admin/' + currentRoute.params.hash + '/' + section + '/' + currentRoute.params.locale);
}

const getErrors = (section: ISection, sectionKey: string | number): { i18n: string[], currentI18n: string[], general: string[] } => {
  const locale = currentRoute.params.locale.toString();
  const locales = interfaceParsedData.value.locales;
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
  const locales = interfaceParsedData.value.locales;
  if (errors.general.length > 0) {
    const path = errors.general[0];
    return `Field path "${path}" has an issue`
  } else if (errors.currentI18n.length > 0) {
    const items = errors.currentI18n[0].split('.');
    items.pop();
    const path = items.join('.')
    return `Field path "${path}" has an issue`;
  } else if (errors.i18n.length > 0) {
    const items = errors.i18n[0].split('.');
    const locale = items.pop();
    const path = items.join('.');
    if (locale) {
      return `Field path "${path}" field has an issue in ${locales[locale]}`
    }
  }
  return null;
}

const onFileManagerClick = () => {
  globalStore.showFileManager(false)
}

// @ts-expect-error Need to declare typings for process.env
const version = JSON.parse(process.env.APP_VERSION);
</script>

<template>
  <!-- SIDEBAR -->
  <v-navigation-drawer
    v-model="globalStore.admin.drawer"
    :temporary="layoutSize.drawer.temporary"
    :width="layoutSize.drawer.width"
    disable-resize-watcher
  >
    <v-empty-state
      v-if="!hasSections"
      icon="mdi-folder-question-outline"
      title="No section available"
      text="It appears that you have not created a section in your YAML template yet. Please ensure to define the necessary sections to avoid errors in your configuration."
    />
    <v-list v-else v-model="selectedSectionKey" nav>
      <v-list-subheader>Sections</v-list-subheader>
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
                <v-icon v-bind="props" icon="mdi-alert" color="warning" />
              </template>
            </v-tooltip>
            <v-tooltip
              v-else-if="getErrors(section, sectionKey).i18n.length > 0"
              :text="getErrorMsg(section, sectionKey) || ''"
              location="right"
              max-width="400"
            >
              <template #activator="{ props }">
                <v-icon v-bind="props" icon="mdi-alert-outline" color="warning" />
              </template>
            </v-tooltip>
          </template>
        </v-list-item>
      </template>

      <v-divider class="my-2" />
      <v-list-subheader>Tools</v-list-subheader>
      <v-list-item
        title="File Manager"
        prepend-icon="mdi-file-multiple"
        color="primary"
        @click="onFileManagerClick"
      />
    </v-list>
    <template #append>
      <v-divider />
      <div class="pa-3 d-flex flex-column" style="gap: 0.5rem">
        <v-btn
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
          prepend-icon="mdi-github"
          href="https://github.com/JSON-ms"
          target="_blank"
          variant="outlined"
          block
        >
          Github
        </v-btn>
      </div>
      <v-footer color="#f9f9f9">
        <small style="font-size: 0.6rem">JSON.ms v{{ version }}. Licensed under the BSD-3-Clause.</small>
      </v-footer>
    </template>
  </v-navigation-drawer>
</template>
