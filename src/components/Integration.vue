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

const structure = defineModel<IStructure>({ required: true });

const globalStore = useGlobalStore();
const modelStore = useModelStore();
const { computedServerSecretKey, computedCypherKey, structureStates, getSecretKey, getCypherKey } = useStructure();

const server = computed((): string | null => {
  return structure.value.endpoint ?? null;
})

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
</script>

<template>

  <v-card tile flat>
    <v-card-text>
      <h1>Integration Guide</h1>
      <hr>

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
          These are the environment variables to utilize in your <strong>server-side</strong> project. When working with our sandboxes, a file called<code>.env.example</code> is already provided and can be easily copied and renamed to <code>.env.local</code> or <code>.env.production</code>.
        </p>
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
