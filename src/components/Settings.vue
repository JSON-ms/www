<script setup lang="ts">
import type { IInterface } from '@/interfaces';
import Rules from '@/rules';
import { computed, ref } from 'vue';
import { Services } from '@/services';
import { useDisplay } from 'vuetify';
import { useGlobalStore } from '@/stores/global';

const formIsValid = ref(false);
const selectedInterface = defineModel<IInterface>({ required: true });
const emit = defineEmits(['save'])
const {
  demo = false,
  disabled = false,
  saving = false,
  saved = false,
  canSave = false,
} = defineProps<{
  demo?: boolean,
  disabled?: boolean,
  saving?: boolean,
  saved?: boolean,
  canSave?: boolean,
}>();

const copied = ref(false);
const globalStore = useGlobalStore();
const { smAndDown } = useDisplay()
const canOpenAdminUrl = computed((): boolean => {
  return !!(selectedInterface.value.uuid) || !globalStore.session.loggedIn;
})
const adminBaseUrl = ref(import.meta.env.VITE_ADMIN_DEMO_URL);
const adminUrl = computed((): string => {
  return adminBaseUrl.value + '/' + (selectedInterface.value.hash || (globalStore.session.loggedIn ? 'new' : 'demo'));
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

const loadingSecretKey = ref(false);
const secretKeyLoaded = ref(false);
const secretKey = ref('');
const computedServerSecretKey = computed((): string => {
  return secretKeyLoaded.value
    ? secretKey.value
    : selectedInterface.value.server_secret || '';
})
const getServerSecretKey = () => {
  loadingSecretKey.value = true;
  return Services.get(import.meta.env.VITE_SERVER_URL + '/server-secret-key?uuid=' + selectedInterface.value.uuid)
    .then(response => secretKey.value = response)
    .finally(() => {
      loadingSecretKey.value = false;
      secretKeyLoaded.value = true;
    })
}
const loadingCypherKey = ref(false);
const cypherKeyLoaded = ref(false);
const cypherKey = ref('');
const computedCypherKey = computed((): string => {
  return cypherKeyLoaded.value
    ? cypherKey.value
    : selectedInterface.value.cypher_key || '';
})
const getCyperKey = () => {
  loadingCypherKey.value = true;
  return Services.get(import.meta.env.VITE_SERVER_URL + '/cypher-key?uuid=' + selectedInterface.value.uuid)
    .then(response => cypherKey.value = response)
    .finally(() => {
      loadingCypherKey.value = false;
      cypherKeyLoaded.value = true;
    })
}
</script>

<template>
  <v-form
    v-model="formIsValid"
    class="d-flex flex-column"
    style="gap: 0.66rem"
    autocomplete="off"
  >
    <v-alert
      v-if="demo || disabled"
      border="start"
      type="warning"
      variant="elevated"
    >
      <span v-if="demo">You are currently in demo mode. Please log in to your account to make any changes.</span>
      <span v-else-if="disabled">Only the owner of this interface is allowed to modify the settings.</span>
    </v-alert>

    <v-card>
      <v-card-title>
        Admin
      </v-card-title>
      <v-card-text class="d-flex flex-column" style="gap: 1rem">
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
        <v-text-field
          v-model="selectedInterface.server_url"
          :disabled="demo || disabled"
          :rules="[
            (value: string) => !value || Rules.isUrl(value) || 'This field must contain a valid URL',
            (value: string) => value && Rules.isUrl(value) && !value.startsWith('https://') ? 'It is not safe to use an unsecured protocol (HTTP) to communicate your data. Please be aware that your information may be vulnerable to interception by unauthorized parties. For your safety, we enforce using a secure connection (HTTPS) to protect your sensitive data during transmission.' : true,
            (value: string) => Rules.maxLength(value, 255) || 'This field must contain 255 characters or fewer.',
          ]"
          prepend-inner-icon="mdi-webhook"
          hide-details="auto"
          hint="This feature allows you to specify a URL that will be triggered whenever data is read from or saved to the admin panel. By integrating a webhook, you can synchronize data with a remote server and perform various transformations."
          persistent-hint
          required
          clearable
        >
          <template #label>
            <span class="mr-2 text-error">*</span>Webhook Endpoint
          </template>
          <template v-if="!selectedInterface.server_url || !Rules.isUrl(selectedInterface.server_url)" #append-inner>
            <v-icon color="warning" icon="mdi-alert" />
          </template>
        </v-text-field>
        <v-text-field
          v-model="computedServerSecretKey"
          :loading="loadingSecretKey"
          :type="secretKeyLoaded ? 'text' : 'password'"
          :disabled="demo || disabled || !selectedInterface.uuid"
          prepend-inner-icon="mdi-key-chain"
          hide-details="auto"
          label="API Server Secret"
          hint="The secret field, used for authentication, will be passed as X-API-Key in your API call headers. This ensures secure access to the API's functionalities. Keep it confidential to protect your data."
          readonly
          persistent-hint
          name="server_secret"
          autocomplete="new-password"
        >
          <template v-if="!secretKeyLoaded" #append-inner>
            <v-btn
              :disabled="!selectedInterface.uuid"
              variant="outlined"
              size="small"
              @click="getServerSecretKey()"
            >
              Get
            </v-btn>
          </template>
        </v-text-field>
        <v-text-field
          v-model="computedCypherKey"
          :loading="loadingCypherKey"
          :type="cypherKeyLoaded ? 'text' : 'password'"
          :disabled="demo || disabled || !selectedInterface.uuid"
          prepend-inner-icon="mdi-script-text-key-outline"
          hide-details="auto"
          label="API Cypher Key"
          hint="A securely generated key used to decrypt the API secret key. This key must be kept confidential and protected to ensure the integrity and security of sensitive data."
          readonly
          persistent-hint
          name="cypher_key"
          autocomplete="new-password"
        >
          <template v-if="!cypherKeyLoaded" #append-inner>
            <v-btn
              :disabled="!selectedInterface.uuid"
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
          v-model="selectedInterface.permission_interface"
          :disabled="demo || disabled"
          :items="[]"
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
          v-model="selectedInterface.permission_admin"
          :disabled="demo || disabled"
          :items="[]"
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
      <v-card-actions>
        <v-spacer />
        <v-btn
          :loading="saving"
          :disabled="saving || !canSave || !formIsValid"
          :variant="saved ? 'tonal' : 'flat'"
          :color="(!canSave || !formIsValid) && !saved ? undefined : 'primary'"
          class="px-3"
          @click="() => emit('save')"
        >
          <v-icon v-if="!saved" icon="mdi-content-save" start />
          <v-icon v-else icon="mdi-check" start />
          <span v-if="!saved">Save</span>
          <span v-else>Saved!</span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-form>
</template>
