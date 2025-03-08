<script setup lang="ts">
import interfaceMd from '@/docs/interface.md'
import integrationMd from '@/docs/integration.md'
import settingsMd from '@/docs/settings.md'
import { marked } from 'marked';
import 'ace-builds/src-noconflict/mode-yaml';
import 'ace-builds/src-noconflict/theme-github_dark';
import { onMounted, ref } from 'vue';
import ace from 'ace-builds';
import { useDisplay } from 'vuetify';

const { smAndDown } = useDisplay()
const tab = ref('interface');

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

onMounted(() => {
  applyEditors();
})
</script>

<template>
  <v-container class="docs fill-height pa-0 align-start" style="gap: 0.66rem" fluid>
    <v-row :no-gutters="smAndDown">
      <v-col cols="12" md="9">
        <v-card>
          <v-tabs
            v-if="smAndDown"
            v-model="tab"
            color="primary"
            grow
            style="position: sticky; top: 0"
          >
            <v-tab prepend-icon="mdi-list-box-outline" value="interface" />
            <v-tab prepend-icon="mdi-cog" value="settings" />
            <v-tab prepend-icon="mdi-progress-download" value="integration" />
          </v-tabs>
          <v-card-text>
            <v-tabs-window v-model="tab" transition="none">
              <v-tabs-window-item value="interface">
                <div v-html="parsedHtml(interfaceMd)" />
              </v-tabs-window-item>
              <v-tabs-window-item value="settings">
                <div v-html="parsedHtml(settingsMd)" />
              </v-tabs-window-item>
              <v-tabs-window-item value="integration">
                <div v-html="parsedHtml(integrationMd)" />
              </v-tabs-window-item>
            </v-tabs-window>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col v-if="!smAndDown" cols="12" md="3">
        <v-card style="position: sticky; top: 0">
          <v-tabs
            v-model="tab"
            color="primary"
            direction="vertical"
          >
            <v-tab prepend-icon="mdi-list-box-outline" text="Interface" value="interface" />
            <v-tab prepend-icon="mdi-cog" text="Settings" value="settings" />
            <v-tab prepend-icon="mdi-progress-download" text="Integration" value="integration" />
          </v-tabs>
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
  ul {
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
