<script setup lang="ts">
import type {VForm} from 'vuetify/components';
import type {IField, IStructure, IStructureData, IServerSettings} from '@/interfaces';
import FieldItem from '@/components/FieldItem.vue';
import {computed, defineExpose, ref} from 'vue';
import {useRoute} from 'vue-router';
import {useModelStore} from '@/stores/model';
import {useStructure} from "@/composables/structure";
import {isFieldI18n} from "@/utils";

const modelStore = useModelStore();
const structure = defineModel<IStructure>({ required: true });
const { structureData, serverSettings, loading = false } = defineProps<{
  structureData: IStructureData,
  serverSettings: IServerSettings,
  loading?: boolean,
}>();

const currentRoute = useRoute();
const { isFieldVisible } = useStructure();

const userDataSection = computed(() => {
  return modelStore.userData[currentRoute.params.section.toString()];
})

const selectedSection = computed(() => {
  return structureData.sections[currentRoute.params.section.toString()] || {};
})

const showContent = computed((): boolean => {
  return Object.keys(fields.value).length > 0;
})

const fields = computed((): {[key: string]: IField } => {
  return Object.fromEntries(
    Object.entries(selectedSection.value.fields || {}).filter(item => isFieldVisible(item[1], currentRoute.params.section.toString()))
  ) ?? {};
})

const form = ref<VForm | null>(null);
const resetValidation = () => {
  form.value?.resetValidation();
}

defineExpose({
  resetValidation,
});

const canEditData = computed((): boolean => {
  const types = structure.value.type.split(',');
  for (let i = 0; i < types.length; i++) {
    const type = types[i];
    if (['owner', 'admin'].includes(type)) {
      return true;
    }
  }
  return false;
})
</script>

<template>
  <v-empty-state
    v-if="!showContent"
    icon="mdi-beaker-question-outline"
    title="No field available"
    text="It appears that you have not created a section containing fields in your YAML template yet. Please ensure to define the necessary sections to avoid errors in your configuration."
  />
  <v-empty-state
    v-else-if="!canEditData"
    icon="mdi-pencil-off-outline"
    title="Unauthorized"
    text="Access to this form has not been granted by the owner."
  />
  <div v-else class="d-flex flex-column pa-4" style="gap: 1rem">
    <div>
      <h1 class="mb-2">
        {{ selectedSection.label }}
      </h1>
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
        v-if="isFieldI18n(field) && userDataSection"
        v-model="userDataSection[key][currentRoute.params.locale.toString()]"
        :field="field"
        :field-key="currentRoute.params.section + '.' + key"
        :locale="currentRoute.params.locale.toString()"
        :locales="structureData.locales"
        :structure="structure"
        :structure-data="structureData"
        :server-settings="serverSettings"
        :loading="loading"
      />
      <FieldItem
        v-else-if="userDataSection"
        v-model="userDataSection[key]"
        :field="field"
        :field-key="currentRoute.params.section.toString() + '.' + key"
        :locale="currentRoute.params.locale.toString()"
        :locales="structureData.locales"
        :structure="structure"
        :structure-data="structureData"
        :server-settings="serverSettings"
        :loading="loading"
      />
    </template>

    <p v-if="selectedSection.append" class="mt-3">
      {{ selectedSection.append }}
    </p>
  </div>
</template>

