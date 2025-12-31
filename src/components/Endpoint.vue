<script setup lang="ts">
import SyntaxHighlighter from "@/components/SyntaxHighlighter.vue";
import integrationClientMd from "../../docs/integration-client.md";
import integrationServerMd from "../../docs/integration-server.md";
import Docs from "@/components/Docs.vue";
import {computed, ref} from "vue";
import {useModelStore} from "@/stores/model";
import {useGlobalStore} from "@/stores/global";
import {useStructure} from "@/composables/structure";
import type {IStructure} from "@/interfaces";
import EndpointManagerModal from "@/components/EndpointManagerModal.vue";
import {useUserData} from "@/composables/user-data";

const structure = defineModel<IStructure>({ required: true });

// Props
const {
  demo = false,
  disabled = false,
} = defineProps<{
  demo?: boolean,
  disabled?: boolean,
}>();

const globalStore = useGlobalStore();
const modelStore = useModelStore();
const { computedServerSecretKey, computedCypherKey, structureStates, getSecretKey, getCypherKey } = useStructure();
const { fetchUserData, setUserData } = useUserData();
const copied = ref(false);

const onGetCyperAndSecret = () => {
  getSecretKey();
  getCypherKey();
}

const serverSideEnvVar = computed((): string => {
  const endpoint = globalStore.session.endpoints.find(endpoint => modelStore.structure.endpoint === endpoint.uuid);
  return `PRIVATE_FILE_PATH=./private
PUBLIC_URL=${endpoint?.url}
ACCESS_CONTROL_ALLOW_ORIGIN=${window.location.origin}
SECRET_KEY=${structureStates.value.secretKeyLoaded ? computedServerSecretKey.value : ''}
CYPHER_KEY=${structureStates.value.cypherKeyLoaded ? computedCypherKey.value : ''}`;
});

const usingVite = ref(true);
const clientSideEnvVar = computed((): string => {
  const prefix = usingVite.value ? 'VITE_' : '';
  const endpoint = globalStore.session.endpoints.find(endpoint => modelStore.structure.endpoint === endpoint.uuid);
  return `${prefix}JMS_ENDPOINT_URL=${endpoint?.url}
${prefix}JMS_HASH=${modelStore.structure.hash}
${prefix}JMS_ENCRYPTED_SECRET_KEY=${modelStore.structure.server_secret}`;
});

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

</script>

<template>
  <v-card tile flat class="overflow-auto">
    <v-card-text class="d-flex flex-column" style="gap: 1rem">

      <Docs v-model="integrationServerMd" />

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

    <v-card-text>
      <Docs v-model="integrationClientMd" />

      <h3 class="mt-4">
        Environment Variables
      </h3>
      <v-alert
        v-if="!server"
        type="warning"
        variant="tonal"
        class="ma-0"
      >
        Please select a endpoint for your project first.
      </v-alert>
      <template v-else>
        <p class="mb-3">
          These are the environment variables to utilize in your <strong>client-side</strong> project. When working with our sandboxes, a file called<code>.env.example</code> is already provided and can be easily copied and renamed to <code>.env.local</code> or <code>.env.production</code>.
        </p>
        <v-card theme="dark" class="pa-2 mb-n1" flat>
          <v-checkbox
            v-model="usingVite"
            label="Using Vite"
            hide-details
          />
        </v-card>
        <SyntaxHighlighter :model-value="clientSideEnvVar" language="properties" />

      </template>

      <Docs v-model="integrationServerMd" class="mt-6" />

      <h3 class="mt-4">
        Environment Variables
      </h3>
      <p class="mb-3">
        These are the environment variables to utilize in your <strong>server-side</strong> project. When working with our sandboxes, a file called<code>.env.example</code> is already provided and can be easily copied and renamed to <code>.env.local</code> or <code>.env.production</code>.
      </p>
      <v-alert
        v-if="!server"
        type="warning"
        variant="tonal"
        class="ma-0"
      >
        Please select a endpoint for your project first.
      </v-alert>
      <template v-else>
        <v-btn
          variant="outlined"
          color="primary"
          :loading="structureStates.loadingSecretKey || structureStates.loadingCypherKey"
          :disabled="structureStates.secretKeyLoaded && structureStates.cypherKeyLoaded"
          @click="onGetCyperAndSecret"
        >
          Get Cypher and Secret key
        </v-btn>
        <SyntaxHighlighter :model-value="serverSideEnvVar" language="properties" class="mt-4" />
      </template>
    </v-card-text>
  </v-card>
</template>
