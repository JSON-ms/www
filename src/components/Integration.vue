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

const tab = ref('php');

const applyEnvVar = (content: string) => {
  return content.replace('[INTERFACE_EDITOR_URL]', window.location.origin);
}
const content = ref({
  php: applyEnvVar(PHPIntegration),
  python: applyEnvVar(PythonIntegration),
  node: applyEnvVar(NodeIntegration),
});
</script>

<template>
  <div class="d-flex flex-column fill-height" style="gap: 0.66rem">
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

