<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import { useDisplay } from 'vuetify';
import type {IStructure} from '@/interfaces';
import {useStructure} from '@/composables/structure';
import {useGlobalStore} from '@/stores/global';
import EndpointManagerModal from '@/components/EndpointManagerModal.vue';
import {useUserData} from "@/composables/user-data";

// Definitions
const { secretKey, cypherKey, adminUrl, canOpenAdminUrl, saveStructureSimple, serverSettings, computedServerSecretKey, computedCypherKey, structureStates, getStructureRules, getSecretKey, getCypherKey } = useStructure();
const { fetchUserData, setUserData } = useUserData();
const { smAndDown } = useDisplay()
const copied = ref(false);
const globalStore = useGlobalStore();
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
    return structure.value.endpoint ?? null;
  },
  set(value: string) {
    structure.value.endpoint = value;
    const endpoint = globalStore.session.endpoints.find(endpoint => endpoint.uuid === value);
    if (endpoint) {
      structure.value.server_url = endpoint.url;
      structure.value.server_secret = endpoint.secret;

      globalStore.setPrompt({
        ...globalStore.prompt,
        visible: true,
        title: 'Fetch data',
        body: 'User data might be different on this server. Do you wish to fetch the user data? This action will override any unsaved change in your forms.',
        btnText: 'Fetch',
        btnIcon: 'mdi-cloud-arrow-down-outline',
        btnColor: 'warning',
        cancelText: 'Skip',
        cancelIcon: 'mdi-skip-next-circle-outline',
        callback: () => new Promise((resolve, reject) => {
          fetchUserData().then((response: any) => {
            serverSettings.value = response.settings;
            setUserData(response.data, true);
            resolve();
          }).catch(reject)
        })
      })
    }
  }
})

const showEndpointManager = ref(false);

const manageEndpoints = () => {
  showEndpointManager.value = true;
}

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
      <v-card-text class="pb-0">
        <h1>Settings</h1>
        <hr>
      </v-card-text>
<!--      <v-card-title>-->
<!--        Public URL-->
<!--      </v-card-title>-->
<!--      <v-card-text class="d-flex flex-column" style="gap: 1rem">-->

<!--        &lt;!&ndash; ADMIN URL &ndash;&gt;-->
<!--        <v-text-field-->
<!--          id="adminRef"-->
<!--          v-model="adminUrl"-->
<!--          :disabled="!canOpenAdminUrl"-->
<!--          label="URL"-->
<!--          hint="This read-only field displays the generated URL for accessing the admin panel. Feel free to share this link with authorized users to grant them access to manage the application."-->
<!--          persistent-hint-->
<!--          readonly-->
<!--          @click="select"-->
<!--        >-->
<!--          <template #append-inner>-->
<!--            <div class="d-flex align-center" style="gap: 0.5rem">-->
<!--              <v-btn-->
<!--                size="small"-->
<!--                variant="text"-->
<!--                :color="copied ? 'primary' : undefined"-->
<!--                :readonly="copied"-->
<!--                :disabled="!canOpenAdminUrl"-->
<!--                :icon="smAndDown"-->
<!--                @click="copy"-->
<!--              >-->
<!--                <template v-if="!copied || smAndDown">-->
<!--                  <v-icon :start="!smAndDown" icon="mdi-content-copy" />-->
<!--                  <span v-if="!smAndDown">Copy</span>-->
<!--                </template>-->
<!--                <template v-else>-->
<!--                  <v-icon start icon="mdi-check" />-->
<!--                  <span>Copied!</span>-->
<!--                </template>-->
<!--              </v-btn>-->
<!--            </div>-->
<!--          </template>-->
<!--        </v-text-field>-->
<!--      </v-card-text>-->
      <v-card-title>Server</v-card-title>
      <v-card-text class="d-flex flex-column" style="gap: 1rem">

        <EndpointManagerModal
          v-model="showEndpointManager"
        />

        <!-- SERVER URL -->
        <v-select
          v-model="server"
          :items="globalStore.session.endpoints"
          :disabled="demo || disabled"
          item-title="url"
          item-value="uuid"
          prepend-inner-icon="mdi-webhook"
          hide-details="auto"
          hint="This feature allows you to specify a URL that will be triggered whenever data is read from or saved to the admin panel. By integrating an endpoint, you can synchronize data with a remote server and perform various transformations. Check the Server-Side Integration section of the Integration panel for further information."
          persistent-hint
          required
          clearable
          autocomplete="endpoint"
        >
          <template #label>
            <span class="mr-2 text-error">*</span>Endpoint
          </template>

          <template #append-inner>
            <div class="d-flex align-center" style="gap: 0.5rem">
              <v-btn
                variant="outlined"
                size="small"
                @mousedown.stop
                @click="manageEndpoints"
              >
                Manage
              </v-btn>
            </div>
          </template>
        </v-select>

        <!-- SERVER SECRET -->
        <v-text-field
          v-model="computedServerSecretKey"
          :type="structureStates.secretKeyLoaded ? 'text' : 'password'"
          :disabled="!server || demo || disabled || !structure.uuid"
          prepend-inner-icon="mdi-key-chain"
          hide-details="auto"
          label="API Server Secret"
          hint="The secret field, used for authentication, will be passed as X-Jms-Api-Key in your API call headers. This ensures secure access to the API's functionalities. Keep it confidential to protect your data."
          readonly
          persistent-hint
          name="server_secret"
          autocomplete="new-password"
        >
          <template v-if="!structureStates.secretKeyLoaded" #append-inner>
            <v-btn
              :disabled="!structure.uuid"
              :loading="structureStates.loadingSecretKey"
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
          :type="structureStates.cypherKeyLoaded ? 'text' : 'password'"
          :disabled="!server || demo || disabled || !structure.uuid"
          prepend-inner-icon="mdi-script-text-key-outline"
          hide-details="auto"
          label="API Cypher Key"
          hint="A securely generated key used to decrypt the API secret key. This key must be kept confidential and protected to ensure the integrity and security of sensitive data."
          readonly
          persistent-hint
          name="cypher_key"
          autocomplete="new-password"
        >
          <template v-if="!structureStates.cypherKeyLoaded" #append-inner>
            <v-btn
              :disabled="!structure.uuid"
              :loading="structureStates.loadingCypherKey"
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
