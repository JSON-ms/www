<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import { useDisplay } from 'vuetify';
import type {IInterface} from '@/interfaces';
import {useInterface} from '@/composables/interface';
import {useGlobalStore} from '@/stores/global';
import WebhookManagerModal from '@/components/WebhookManagerModal.vue';
import {useUserData} from "@/composables/user-data";

// Definitions
const globalStore = useGlobalStore();
const formIsValid = ref(false);
const interfaceModel = defineModel<IInterface>({ required: true });
const { secretKey, cypherKey, adminUrl, canOpenAdminUrl, serverSettings, computedServerSecretKey, computedCypherKey, interfaceStates, getInterfaceRules, getSecretKey, getCypherKey } = useInterface();
const { fetchUserData, setUserData } = useUserData();
const copied = ref(false);
const { smAndDown } = useDisplay()

// Props
const {
  demo = false,
  disabled = false,
} = defineProps<{
  demo?: boolean,
  disabled?: boolean,
}>();

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

const server = computed({
  get(): string | null {
    return interfaceModel.value.webhook ?? null;
  },
  set(value: string) {
    interfaceModel.value.webhook = value;
    const webhook = globalStore.session.webhooks.find(webhook => webhook.uuid === value);
    if (webhook) {
      interfaceModel.value.server_url = webhook.url;
      interfaceModel.value.server_secret = webhook.secret;
    }

    globalStore.setPrompt({
      ...globalStore.prompt,
      visible: true,
      title: 'Fetch data',
      body: 'User data might be different on this server. Do you wish to fetch the user data? This action will override any unsaved change in your forms.',
      btnText: 'Fetch',
      btnIcon: 'mdi-cloud-arrow-down-outline',
      btnColor: 'warning',
      callback: () => new Promise(resolve => {
        fetchUserData().then((response: any) => {
          serverSettings.value = response.settings;
          setUserData(response.data, true);
          resolve();
        })
      })
    })
  }
})

const showWebhookManager = ref(false);

const manageWebhooks = () => {
  showWebhookManager.value = true;
}

watch(() => interfaceModel.value.webhook, () => {
  secretKey.value = '';
  cypherKey.value = '';
  interfaceStates.value.secretKeyLoaded = false;
  interfaceStates.value.cypherKeyLoaded = false;
})
watch(() => interfaceModel.value.hash, () => {
  secretKey.value = '';
  cypherKey.value = '';
  interfaceStates.value.secretKeyLoaded = false;
  interfaceStates.value.cypherKeyLoaded = false;
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
      <span v-else-if="disabled">Only the owner of this interface is allowed to modify the settings.</span>
    </v-alert>

    <v-card tile flat>
      <v-card-text class="pb-0">
        <h1>Settings</h1>
        <hr>
      </v-card-text>
      <v-card-title>
        Public URL
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
            </div>
          </template>
        </v-text-field>
      </v-card-text>
      <v-card-title>Server</v-card-title>
      <v-card-text class="d-flex flex-column" style="gap: 1rem">

        <WebhookManagerModal
          v-model="showWebhookManager"
        />

        <!-- SERVER URL -->
        <v-select
          v-model="server"
          :items="globalStore.session.webhooks"
          :disabled="demo || disabled"
          item-title="url"
          item-value="uuid"
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

          <template #append-inner>
            <v-btn
              variant="outlined"
              size="small"
              @mousedown.stop
              @click="manageWebhooks"
            >
              Manage
            </v-btn>
          </template>
        </v-select>

        <!-- SERVER SECRET -->
        <v-text-field
          v-model="computedServerSecretKey"
          :type="interfaceStates.secretKeyLoaded ? 'text' : 'password'"
          :disabled="!server || demo || disabled || !interfaceModel.uuid"
          prepend-inner-icon="mdi-key-chain"
          hide-details="auto"
          label="API Server Secret"
          hint="The secret field, used for authentication, will be passed as X-Jms-Api-Key in your API call headers. This ensures secure access to the API's functionalities. Keep it confidential to protect your data."
          readonly
          persistent-hint
          name="server_secret"
          autocomplete="new-password"
        >
          <template v-if="!interfaceStates.secretKeyLoaded" #append-inner>
            <v-btn
              :disabled="!interfaceModel.uuid"
              :loading="interfaceStates.loadingSecretKey"
              variant="outlined"
              size="small"
              @click="getSecretKey"
            >
              Get
            </v-btn>
          </template>
        </v-text-field>

        <!-- CYPHER KEY -->
        <v-text-field
          v-model="computedCypherKey"
          :type="interfaceStates.cypherKeyLoaded ? 'text' : 'password'"
          :disabled="!server || demo || disabled || !interfaceModel.uuid"
          prepend-inner-icon="mdi-script-text-key-outline"
          hide-details="auto"
          label="API Cypher Key"
          hint="A securely generated key used to decrypt the API secret key. This key must be kept confidential and protected to ensure the integrity and security of sensitive data."
          readonly
          persistent-hint
          name="cypher_key"
          autocomplete="new-password"
        >
          <template v-if="!interfaceStates.cypherKeyLoaded" #append-inner>
            <v-btn
              :disabled="!interfaceModel.uuid"
              :loading="interfaceStates.loadingCypherKey"
              variant="outlined"
              size="small"
              @click="getCypherKey"
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
          v-model="interfaceModel.permission_interface"
          :disabled="demo || disabled"
          :items="[]"
          :rules="getInterfaceRules('permission_interface')"
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
          v-model="interfaceModel.permission_admin"
          :disabled="demo || disabled"
          :items="[]"
          :rules="getInterfaceRules('permission_admin')"
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
