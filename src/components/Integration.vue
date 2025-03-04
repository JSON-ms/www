<script setup lang="ts">
import { computed, ref } from 'vue';
import { VAceEditor } from 'vue3-ace-editor';
import PHPIntegration from '@/assets/integration-php.txt';
import PythonIntegration from '@/assets/integration-python.txt';
import NodeIntegration from '@/assets/integration-node.txt';
import 'ace-builds/src-noconflict/mode-php';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-github_dark';
import type { IInterface } from '@/interfaces';
import { useGlobalStore } from '@/stores/global';
import { useDisplay } from 'vuetify';

const tab = ref('php');
const copied = ref(false);
const { smAndDown } = useDisplay()
const selectedInterface = defineModel<IInterface>({ required: true });
const globalStore = useGlobalStore();
const canOpenAdminUrl = computed((): boolean => {
  return !!(selectedInterface.value.uuid) || !globalStore.session.loggedIn;
})
const adminBaseUrl = ref(import.meta.env.VITE_ADMIN_DEMO_URL);
const adminUrl = computed((): string => {
  return adminBaseUrl.value + '/' + (selectedInterface.value.hash || (globalStore.session.loggedIn ? 'new' : 'demo'));
})

const applyEnvVar = (content: string) => {
  return content.replace('[INTERFACE_EDITOR_URL]', window.location.origin);
}
const content = ref({
  php: applyEnvVar(PHPIntegration),
  python: applyEnvVar(PythonIntegration),
  node: applyEnvVar(NodeIntegration),
});

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
</script>

<template>
  <div class="d-flex flex-column fill-height" style="gap: 0.66rem">
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
    </v-card>
    <v-card class="d-flex flex-column" style="flex: 1">
      <v-card-title>Server</v-card-title>
      <v-tabs v-model="tab" color="primary">
        <v-tab value="php">
          <v-icon start icon="mdi-language-php" />
          PHP
        </v-tab>
        <v-tab value="python">
          <v-icon start icon="mdi-language-python" />
          Python
        </v-tab>
        <v-tab value="node">
          <v-icon start icon="mdi-nodejs" />
          Node
        </v-tab>
      </v-tabs>
      <v-tabs-window v-model="tab" class="fill-height" style="flex: 1; min-height: 15rem">
        <v-tabs-window-item value="php" class="fill-height">
          <v-ace-editor
            v-model:value="content.php"
            lang="php"
            theme="github_dark"
            style="height: 100%"
            readonly
          />
        </v-tabs-window-item>
        <v-tabs-window-item value="python" class="fill-height">
          <v-ace-editor
            v-model:value="content.python"
            lang="python"
            theme="github_dark"
            style="height: 100%"
            readonly
          />
        </v-tabs-window-item>
        <v-tabs-window-item value="node" class="fill-height">
          <v-ace-editor
            v-model:value="content.node"
            lang="javascript"
            theme="github_dark"
            style="height: 100%"
            readonly
          />
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card>
  </div>
</template>

