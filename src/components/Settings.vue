<script setup lang="ts">
import {computed, ref} from 'vue';
import { useDisplay } from 'vuetify';
import { useGlobalStore } from '@/stores/global';
import type InterfaceModel from '@/models/interface.model';
import {objectsAreDifferent} from '@/utils';

// Definitions
const formIsValid = ref(false);
const model = defineModel<InterfaceModel>({ required: true });
const interfaceModel = model.value;
const states = interfaceModel.states;
const copied = ref(false);
const globalStore = useGlobalStore();
const { smAndDown } = useDisplay()
const adminBaseUrl = ref(import.meta.env.VITE_ADMIN_DEMO_URL);
const secretKey = ref('');
const cypherKey = ref('');

// Emits
const emit = defineEmits(['save'])
const {
  demo = false,
  disabled = false,
} = defineProps<{
  demo?: boolean,
  disabled?: boolean,
}>();

// Computed
const canOpenAdminUrl = computed((): boolean => {
  return !!(interfaceModel.data.uuid) || !globalStore.session.loggedIn;
})
const adminUrl = computed((): string => {
  return adminBaseUrl.value + '/' + (interfaceModel.data.hash || (globalStore.session.loggedIn ? 'new' : 'demo'));
})
const computedServerSecretKey = computed((): string => {
  return states.value.secretKeyLoaded
    ? secretKey.value
    : interfaceModel.data.server_secret || '';
})
const computedCypherKey = computed((): string => {
  return states.value.cypherKeyLoaded
    ? cypherKey.value
    : interfaceModel.data.cypher_key || '';
})
const isPristine = computed((): boolean => {
  return !objectsAreDifferent(interfaceModel.data, interfaceModel.originalData, [
    'server_url', 'permission_admin', 'permission_interface',
  ])
})

const openAdminLink = () => {
  window.open(adminUrl.value, '_blank');
}

const copy = () => {
  const field: HTMLInputElement = document.getElementById('adminRef') as HTMLInputElement;
  if (field) {
    field.select();
    document.execCommand('copy');
    copied.value = true;
    setTimeout(() => copied.value = false, 2000);
  }
}

const select = () => {
  const field: HTMLInputElement = document.getElementById('adminRef') as HTMLInputElement;
  if (field) {
    field.select();
  }
}

const getServerSecretKey = () => {
  interfaceModel.getSecretKey().then(response => secretKey.value = response);
}

const getCyperKey = () => {
  interfaceModel.getCypherKey().then(response => cypherKey.value = response);
}
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
      :tile="smAndDown"
      :elevation="smAndDown ? 0 : undefined"
      border="start"
      type="warning"
      variant="elevated"
    >
      <span v-if="demo">You are currently in demo mode. Please log in to your account to make any changes.</span>
      <span v-else-if="disabled">Only the owner of this interface is allowed to modify the settings.</span>
    </v-alert>

    <v-card>
      <v-card-text class="pb-0">
        <h1>Settings</h1>
        <hr>
      </v-card-text>
      <v-card-title>
        Admin
      </v-card-title>
      <v-card-text class="d-flex flex-column" style="gap: 1rem">

        <!-- ADMIN URL -->
        <v-text-field
          id="adminRef"
          v-model="adminUrl"
          :disabled="!canOpenAdminUrl"
          label="URL"
          hint="This read-only field displays the generated URL for accessing the admin panel. Feel free to share this link with authorized users to grant them access to manage the application."
          persistent-hint
          readonly
          @click="select"
        >
          <template #append-inner>
            <div class="d-flex align-center" style="gap: 0.5rem">
              <v-btn
                size="small"
                variant="text"
                :color="copied ? 'primary' : undefined"
                :readonly="copied"
                :disabled="!canOpenAdminUrl"
                :icon="smAndDown"
                @click="copy"
              >
                <template v-if="!copied || smAndDown">
                  <v-icon :start="!smAndDown" icon="mdi-content-copy" />
                  <span v-if="!smAndDown">Copy</span>
                </template>
                <template v-else>
                  <v-icon start icon="mdi-check" />
                  <span>Copied!</span>
                </template>
              </v-btn>
              <v-btn
                :disabled="!canOpenAdminUrl"
                :icon="smAndDown"
                color="primary"
                size="small"
                variant="flat"
                @click="openAdminLink"
              >
                <v-icon :start="!smAndDown" icon="mdi-open-in-new" />
                <span v-if="!smAndDown">Open</span>
              </v-btn>
            </div>
          </template>
        </v-text-field>
      </v-card-text>
      <v-card-title>Server</v-card-title>
      <v-card-text class="d-flex flex-column" style="gap: 1rem">

        <!-- SERVER URL -->
        <v-text-field
          v-model="interfaceModel.data.server_url"
          :disabled="demo || disabled"
          :rules="interfaceModel.getRules('server_url')"
          prepend-inner-icon="mdi-webhook"
          hide-details="auto"
          hint="This feature allows you to specify a URL that will be triggered whenever data is read from or saved to the admin panel. By integrating a webhook, you can synchronize data with a remote server and perform various transformations."
          persistent-hint
          required
          clearable
          autocomplete="webhook"
        >
          <template #label>
            <span class="mr-2 text-error">*</span>Webhook Endpoint
          </template>
          <template v-if="!demo && interfaceModel.hasError('server_url')" #append-inner>
            <v-icon color="warning" icon="mdi-alert" />
          </template>
        </v-text-field>

        <!-- SERVER SECRET -->
        <v-text-field
          v-model="computedServerSecretKey"
          :type="states.secretKeyLoaded ? 'text' : 'password'"
          :disabled="demo || disabled || !interfaceModel.data.uuid"
          prepend-inner-icon="mdi-key-chain"
          hide-details="auto"
          label="API Server Secret"
          hint="The secret field, used for authentication, will be passed as X-Jms-Api-Key in your API call headers. This ensures secure access to the API's functionalities. Keep it confidential to protect your data."
          readonly
          persistent-hint
          name="server_secret"
          autocomplete="new-password"
        >
          <template v-if="!states.secretKeyLoaded" #append-inner>
            <v-btn
              :disabled="!interfaceModel.data.uuid"
              :loading="states.loadingSecretKey"
              variant="outlined"
              size="small"
              @click="getServerSecretKey()"
            >
              Get
            </v-btn>
          </template>
        </v-text-field>

        <!-- CYPHER KEY -->
        <v-text-field
          v-model="computedCypherKey"
          :type="states.cypherKeyLoaded ? 'text' : 'password'"
          :disabled="demo || disabled || !interfaceModel.data.uuid"
          prepend-inner-icon="mdi-script-text-key-outline"
          hide-details="auto"
          label="API Cypher Key"
          hint="A securely generated key used to decrypt the API secret key. This key must be kept confidential and protected to ensure the integrity and security of sensitive data."
          readonly
          persistent-hint
          name="cypher_key"
          autocomplete="new-password"
        >
          <template v-if="!states.cypherKeyLoaded" #append-inner>
            <v-btn
              :disabled="!interfaceModel.data.uuid"
              :loading="states.loadingCypherKey"
              variant="outlined"
              size="small"
              @click="getCyperKey()"
            >
              Get
            </v-btn>
          </template>
        </v-text-field>
      </v-card-text>

      <v-card-title>Permissions</v-card-title>
      <v-card-text class="d-flex flex-column" style="gap: 1rem">
        <v-alert variant="tonal" icon="mdi-information-slab-box-outline">
          No emails will be sent to users. Please ensure that the Google account email addresses entered match the accounts that users are connected with when accessing the application.
        </v-alert>
        <v-combobox
          v-model="interfaceModel.data.permission_interface"
          :disabled="demo || disabled"
          :items="[]"
          :rules="interfaceModel.getRules('permission_interface')"
          prepend-inner-icon="mdi-account-multiple-check"
          label="Interface User(s)"
          hide-details="auto"
          hint="This field contains a list of Google email accounts who have permission to edit the YAML interface used to generate the admin panel, ensuring that only authorized individuals can make changes to the interface."
          persistent-hint
          clearable
          chips
          closable-chips
          multiple
        />
        <v-combobox
          v-model="interfaceModel.data.permission_admin"
          :disabled="demo || disabled"
          :items="[]"
          :rules="interfaceModel.getRules('permission_admin')"
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

      <!-- ACTIONS -->
      <v-card-actions>
        <v-spacer />
        <v-btn
          :loading="states.saving"
          :disabled="states.saving || !formIsValid || isPristine"
          :variant="states.saved ? 'tonal' : 'flat'"
          :color="(!formIsValid || isPristine) && !states.saved ? undefined : 'primary'"
          class="px-3"
          @click="() => emit('save')"
        >
          <v-icon v-if="!states.saved" icon="mdi-content-save" start />
          <v-icon v-else icon="mdi-check" start />
          <span v-if="!states.saved">Save</span>
          <span v-else>Saved!</span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-form>
</template>
