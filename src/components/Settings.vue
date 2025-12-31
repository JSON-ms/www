<script setup lang="ts">
import {ref, watch} from 'vue';
import { useDisplay } from 'vuetify';
import type {IStructure} from '@/interfaces';
import {useStructure} from '@/composables/structure';

// Definitions
const { secretKey, cypherKey, saveStructureSimple, structureStates, getStructureRules } = useStructure();

const { smAndDown } = useDisplay()
const formIsValid = ref(false);
const structure = defineModel<IStructure>({ required: true });

// Props
const {
  demo = false,
  disabled = false,
} = defineProps<{
  demo?: boolean,
  disabled?: boolean,
}>();


watch(() => structure.value.endpoint, () => {
  secretKey.value = '';
  cypherKey.value = '';
  structureStates.value.secretKeyLoaded = false;
  structureStates.value.cypherKeyLoaded = false;
})
watch(() => structure.value.hash, () => {
  secretKey.value = '';
  cypherKey.value = '';
  structureStates.value.secretKeyLoaded = false;
  structureStates.value.cypherKeyLoaded = false;
})
watch(() => [structure.value.permission_structure, structure.value.permission_admin], () => {
  saveStructureSimple(structure.value);
})
</script>

<template>
  <v-form
    v-model="formIsValid"
    class="d-flex flex-column"
    :style="{ gap: smAndDown ? '0' : '0.66rem' }"
    autocomplete="off"
  >
    <v-alert
      v-if="demo || disabled"
      tile
      elevation="0"
      border="start"
      type="warning"
      variant="elevated"
    >
      <span v-if="demo">You are currently in demo mode. Please log in to your account to make any changes.</span>
      <span v-else-if="disabled">Only the owner of this structure is allowed to modify the settings.</span>
    </v-alert>

    <v-card tile flat>
      <v-card-title>Permissions</v-card-title>
      <v-card-text class="d-flex flex-column" style="gap: 1rem">
        <v-alert variant="tonal" icon="mdi-information-slab-box-outline">
          No emails will be sent to users. Please ensure that the Google account email addresses entered match the accounts that users are connected with when accessing the application.
        </v-alert>
        <v-combobox
          v-model="structure.permission_structure"
          :disabled="demo || disabled"
          :items="[]"
          :rules="getStructureRules('permission_structure')"
          prepend-inner-icon="mdi-account-multiple-check"
          label="Structure User(s)"
          hide-details="auto"
          hint="This field contains a list of Google email accounts who have permission to edit the YAML structure used to generate the admin panel, ensuring that only authorized individuals can make changes to the structure."
          persistent-hint
          clearable
          chips
          closable-chips
          multiple
        />
        <v-combobox
          v-model="structure.permission_admin"
          :disabled="demo || disabled"
          :items="[]"
          :rules="getStructureRules('permission_admin')"
          prepend-inner-icon="mdi-account-multiple-check"
          label="Admin User(s)"
          hide-details="auto"
          hint="This field contains a list of Google email accounts who have permission to access the admin panel and modify its data, ensuring that only authorized individuals can make changes to the data."
          persistent-hint
          clearable
          chips
          closable-chips
          multiple
        />
      </v-card-text>
    </v-card>
  </v-form>
</template>
