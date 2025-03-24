<script setup lang="ts">
import type {VForm} from 'vuetify/components';
import FieldItem from '@/components/FieldItem.vue';
import Settings from '@/components/Settings.vue';
import Docs from '@/components/Docs.vue';
import {useGlobalStore} from '@/stores/global';
import {computed, defineExpose, ref} from 'vue';
import {useRoute} from 'vue-router';
import type {IField, IInterface, IInterfaceData, IServerSettings} from '@/interfaces';
import {useInterface} from '@/composables/interface';

const interfaceModel = defineModel<IInterface>({ required: true });
const { interfaceData, userData, serverSettings, loading = false } = defineProps<{
  interfaceData: IInterfaceData,
  userData: any,
  serverSettings: IServerSettings,
  loading?: boolean,
}>();

const globalStore = useGlobalStore();
const currentRoute = useRoute();
const { interfaceHasSettingsError } = useInterface(interfaceModel);

const tab = computed({
  get: () => {
    return globalStore.admin.interface ? globalStore.admin.tab : 'data';
  },
  set: (tab: any) => {
    globalStore.setAdmin({
      tab,
    })
  },
})

const userDataSection = computed(() => {
  return userData[currentRoute.params.section.toString()];
})

const selectedSection = computed(() => {
  return interfaceData.sections[currentRoute.params.section.toString()] || {};
})

const showContent = computed((): boolean => {
  return Object.keys(fields.value).length > 0;
})

const fields = computed((): {[key: string]: IField } => {
  return selectedSection.value.fields ?? {};
})

const form = ref<VForm | null>(null);
const resetValidation = () => {
  form.value?.resetValidation();
}

defineExpose({
  resetValidation,
  tab,
});
</script>

<template>
  <v-form
    ref="form"
    class="fill-height"
  >
    <v-expand-transition group>
      <div v-if="globalStore.admin.interface">
        <v-tabs v-model="tab" grow>
          <v-tab value="data">
            <v-icon icon="mdi-pencil" start />
            Data
          </v-tab>
          <v-tab value="settings">
            <v-icon start icon="mdi-cog" />
            Settings
            <v-icon v-if="interfaceHasSettingsError" color="warning" class="ml-3">
              mdi-alert
            </v-icon>
          </v-tab>
          <v-tab value="docs">
            <v-icon start icon="mdi-book" />
            Docs
          </v-tab>
        </v-tabs>
      </div>
    </v-expand-transition>
    <v-tabs-window v-model="tab" class="fill-height">
      <v-tabs-window-item value="data" class="fill-height">
        <v-empty-state
          v-if="!showContent"
          icon="mdi-beaker-question-outline"
          title="No field available"
          text="It appears that you have not created a section containing fields in your YAML template yet. Please ensure to define the necessary sections to avoid errors in your configuration."
        />
        <div v-else class="d-flex flex-column pa-4" style="gap: 1rem">
          <div>
            <h1 class="mb-2">{{ selectedSection.label }}</h1>
            <v-divider />
          </div>
          <p v-if="selectedSection.prepend">
            {{ selectedSection.prepend }}
          </p>
          <template
            v-for="(field, key) in fields"
            :key="key"
          >
            <FieldItem
              v-if="field.type.includes('i18n') && userDataSection"
              v-model="userDataSection[key][currentRoute.params.locale.toString()]"
              :field="field"
              :field-key="currentRoute.params.section + '.' + key"
              :user-data="userData"
              :locale="currentRoute.params.locale.toString()"
              :locales="interfaceData.locales"
              :structure="interfaceData"
              :interface="interfaceModel"
              :server-settings="serverSettings"
              :loading="loading"
            />
            <FieldItem
              v-else-if="userDataSection"
              v-model="userDataSection[key]"
              :field="field"
              :field-key="currentRoute.params.section.toString() + '.' + key"
              :user-data="userData"
              :locale="currentRoute.params.locale.toString()"
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
      </v-tabs-window-item>
      <v-tabs-window-item value="settings">
        <Settings
          v-model="interfaceModel"
          :demo="!globalStore.session.loggedIn"
          :disabled="interfaceModel.type !== 'owner'"
        />
      </v-tabs-window-item>
      <v-tabs-window-item value="docs">
        <Docs />
      </v-tabs-window-item>
    </v-tabs-window>
  </v-form>
</template>

