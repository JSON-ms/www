<script setup lang="ts">
import type {VForm} from 'vuetify/components';
import FieldItem from '@/components/FieldItem.vue';
import {computed, defineExpose, ref} from 'vue';
import {useRoute} from 'vue-router';
import type {IField, IInterface, IInterfaceData, IServerSettings} from '@/interfaces';

const interfaceModel = defineModel<IInterface>({ required: true });
const { interfaceData, userData, serverSettings, loading = false } = defineProps<{
  interfaceData: IInterfaceData,
  userData: any,
  serverSettings: IServerSettings,
  loading?: boolean,
}>();

const currentRoute = useRoute();

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
});
</script>

<template>
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
</template>

