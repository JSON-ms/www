<script setup lang="ts">
import {useGlobalStore} from '@/stores/global';
import type {IInterface, IInterfaceData} from '@/interfaces';
import {computed} from 'vue';
import {useRoute} from 'vue-router';
import router from '@/router';
import {useUserData} from '@/composables/user-data';
import {useLayout} from '@/composables/layout';

const interfaceModel = defineModel<IInterface>({ required: true });
const { interfaceData, userData } = defineProps<{
  interfaceData: IInterfaceData,
  userData: any,
}>();
const { layoutSize } = useLayout();
const globalStore = useGlobalStore();
const currentRoute = useRoute();
const { getUserDataErrors, userDataLoaded } = useUserData(interfaceModel, userData);

const selectedSectionKey = computed((): string => {
  return currentRoute.params.section.toString();
})

const hasSections = computed((): boolean => {
  return Object.keys(interfaceData.sections).length > 0;
})

const goToSection = (section: string = '') => {
  router.push('/admin/' + currentRoute.params.hash + '/' + section + '/' + currentRoute.params.locale);
}

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
          <template v-if="userDataLoaded && Object.keys(getUserDataErrors(section.fields, sectionKey)).length > 0" #append>
            <v-icon icon="mdi-alert" color="warning" />
          </template>
        </v-list-item>
      </template>
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
        <small style="font-size: 0.6rem">JSON.ms v{{version}}. Licensed under the BSD-3-Clause.</small>
      </v-footer>
    </template>
  </v-navigation-drawer>
</template>
