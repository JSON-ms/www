<script setup lang="ts">
import interfaceMd from '@/docs/interface.md'
import settingsMd from '@/docs/settings.md'
import { marked } from 'marked';
import 'ace-builds/src-noconflict/mode-yaml';
import 'ace-builds/src-noconflict/theme-github_dark';
import 'ace-builds/src-noconflict/mode-php';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-github_dark';
import { onMounted, ref } from 'vue';
import ace from 'ace-builds';
import { useDisplay } from 'vuetify';
import PHPIntegration from '@/assets/integration-php.txt';
import PythonIntegration from '@/assets/integration-python.txt';
import NodeIntegration from '@/assets/integration-node.txt';
import { VAceEditor } from 'vue3-ace-editor';

const { smAndDown } = useDisplay()

const renderer = new marked.Renderer();
renderer.link = ({ href, title, text }) => {
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" title="${title || ''}">${text}</a>`;
}

const parsedHtml = (str: string) => {
  setTimeout(applyEditors);
  return marked(str, {
    renderer
  });
}

const applyEditors = () => {
  const instances = document.getElementsByClassName('language-yaml');
  for (let i = 0; i < instances.length; i++) {
    ace.edit(instances[i] as HTMLElement, {
      value: instances[i].innerHTML.trimEnd(),
      mode: 'ace/mode/yaml',
      theme: 'ace/theme/github_dark',
      maxLines: Infinity,
      readOnly: true,
      wrap: true,
      showLineNumbers: false,
      showPrintMargin: false,
      highlightActiveLine: false,
      showFoldWidgets: false,
      showGutter: false,
    });
  }
}

const languageTab = ref('php');

const applyEnvVar = (content: string) => {
  return content.replace('[INTERFACE_EDITOR_URL]', window.location.origin);
}
const content = ref({
  php: applyEnvVar(PHPIntegration),
  python: applyEnvVar(PythonIntegration),
  node: applyEnvVar(NodeIntegration),
});

onMounted(() => {
  applyEditors();
})
</script>

<template>
  <v-container class="docs fill-height pa-0 align-start" style="gap: 0.66rem" fluid>
    <v-row :no-gutters="smAndDown">
      <v-col cols="12">
        <v-card>
          <v-card-text class="d-flex flex-column" style="gap: 2rem">
            <div v-html="parsedHtml(interfaceMd)" />
            <div v-html="parsedHtml(settingsMd)" />

            <div>
              <h1>Server Integration</h1>
              <hr />
              <v-card>
                <v-tabs v-model="languageTab" color="primary">
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
                <v-tabs-window v-model="languageTab">
                  <v-tabs-window-item value="php">
                    <v-ace-editor
                      v-model:value="content.php"
                      lang="php"
                      theme="github_dark"
                      max-lines="Infinity"
                      readonly
                    />
                  </v-tabs-window-item>
                  <v-tabs-window-item value="python">
                    <v-ace-editor
                      v-model:value="content.python"
                      lang="python"
                      theme="github_dark"
                      max-lines="Infinity"
                      readonly
                    />
                  </v-tabs-window-item>
                  <v-tabs-window-item value="node">
                    <v-ace-editor
                      v-model:value="content.node"
                      lang="javascript"
                      theme="github_dark"
                      max-lines="Infinity"
                      readonly
                    />
                  </v-tabs-window-item>
                </v-tabs-window>
              </v-card>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style lang="scss">
.language-yaml.ace_editor {
  display: block;
  height: auto;
  margin: 1rem 0;
}
.docs {
  hr {
    margin: 0.5rem 0 1rem 0;
    color: rgba(0, 0, 0, 0.1) !important;
    border-color: rgba(0, 0, 0, 0.1) !important;
  }
  * + h2,
  * + h3,
  * + h4 {
    margin-top: 1rem;
  }
  h2 + *,
  h3 + *,
  h4 + * {
    margin-top: 0.25rem;
  }
  ul, ol {
    margin: 0.5rem 0 0.5rem 1.5rem;
  }
  code:not([class]) {
    border-radius: 0.25rem;
    padding: 0 0.25rem;
    background-color: rgba(0, 0, 0, 0.1)
  }
  p + p {
    margin-top: 1rem;
  }
}
</style>
