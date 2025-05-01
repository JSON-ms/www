<script setup lang="ts">
import {computed} from "vue";
import { marked } from 'marked';
import { useDisplay } from 'vuetify';
import hljs from 'highlight.js/lib/core';
import yaml from 'highlight.js/lib/languages/yaml';
import bash from 'highlight.js/lib/languages/bash';
import php from 'highlight.js/lib/languages/php';

hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('php', php);

const { smAndDown } = useDisplay()
const content = defineModel<string>({ required: true })

const renderer = new marked.Renderer();
renderer.link = ({ href, title, text }) => {
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" title="${title || ''}">${text}</a>`;
}

const html = computed((): string => {
  const html = marked(content.value, { renderer }).toString();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const codeElements = doc.querySelectorAll('[class^="language-"]');
  Array.from(codeElements).forEach(element => {
    const matches = element.classList.toString().match(/language-(\S+)/);
    if (matches?.length === 2) {
      element.innerHTML = hljs.highlight(element.innerHTML, { language: matches[1] }).value;
      element.parentElement?.classList.add('v-sheet', 'v-theme--dark', 'pa-3');
    }
  })

  return doc.body.innerHTML;
})
</script>

<template>
  <div v-html="html" class="docs" />
</template>

<style lang="scss">
pre {
  margin: 1rem 0;
  overflow: auto;
  border-radius: 0.25rem !important;

  &:first-child {
    margin-top: 0;
  }
  &:last-child {
    margin-bottom: 0;
  }
}
.docs {
  blockquote {
    padding: 1rem;
    border-left: rgba(24, 103, 192, 0.25) solid 4px;
    border-radius: 0.25rem;
    background-color: rgba(24, 103, 192, 0.1);
    margin: 1rem 0;
    &:first-child {
      margin-top: 0;
    }
    &:last-child {
      margin-bottom: 0;
    }
  }

  h2:not(:first-child),
  h3:not(:first-child),
  h4:not(:first-child) {
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }
  h2 + *,
  h3 + *,
  h4 + * {
    margin-top: 0.25rem;
  }
  ul, ol {
    margin: 0.5rem 0 0.5rem 1.5rem;
  }
  ul:first-child, ol:first-child {
    margin-top: 0;
  }
  ul:last-child, ol:last-child {
    margin-bottom: 0;
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
