<script setup lang="ts">
import interfaceMd from '@/docs/interface.md'
import settingsMd from '@/docs/settings.md'
import { marked } from 'marked';
import { onMounted } from 'vue';
import { useDisplay } from 'vuetify';
import '@/plugins/aceeditor';
import ace from 'ace-builds';

const { smAndDown } = useDisplay()

const renderer = new marked.Renderer();
renderer.link = ({ href, title, text }) => {
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" title="${title || ''}">${text}</a>`;
}

const parsedHtml = (str: string) => {
  setTimeout(() => applyEditors('yaml'));
  return marked(str, {
    renderer
  });
}

const applyEditors = (language = 'yaml') => {
  const instances = document.getElementsByClassName('language-' + language);
  for (const element of instances) {
    ace.edit(element as HTMLElement, {
      value: element.innerHTML.trimEnd(),
      mode: 'ace/mode/' + language,
      theme: 'ace/theme/github_dark',
      maxLines: Infinity,
      readOnly: true,
      wrap: true,
      showLineNumbers: false,
      showPrintMargin: false,
      highlightActiveLine: false,
      showFoldWidgets: false,
      showGutter: false,
      fontSize: 14,
    });
  }
}

onMounted(() => {
  applyEditors('yaml');
})
</script>

<template>
  <v-container class="docs pa-0" fluid>
    <v-row :no-gutters="smAndDown">
      <v-col cols="12">
        <v-card tile flat>
          <v-card-text class="d-flex flex-column" style="gap: 2rem">
            <div v-html="parsedHtml(interfaceMd)" />
            <div v-html="parsedHtml(settingsMd)" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style lang="scss">
pre {
  padding: 0 !important;
  margin: 1rem 0;
}
.language-yaml.ace_editor {
  display: block;
  height: auto;
  background-color: #24292e;
  padding: 1rem 0;
}
.docs {

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
