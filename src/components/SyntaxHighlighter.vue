<script setup lang="ts">
import hljs from 'highlight.js/lib/core';
import 'highlight.js/scss/github-dark.scss'
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import yaml from 'highlight.js/lib/languages/yaml';
import properties from 'highlight.js/lib/languages/properties';
import php from 'highlight.js/lib/languages/php';
import {computed} from "vue";

const code = defineModel<string>({ required: true });
const { language } = defineProps<{
  language: 'javascript' | 'typescript' | 'yaml' | 'properties' | 'php'
}>();

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('properties', properties);
hljs.registerLanguage('php', php);

const html = computed((): string => {
  return hljs.highlight(code.value, { language }).value
})
</script>

<template>
  <v-sheet theme="dark">
    <pre class="pa-3"><code :class="'language-' + language" v-html="html" /></pre>
  </v-sheet>
</template>

<style lang="scss" scoped>
.v-sheet {
  border-radius: 0.25rem;
}
pre {
  overflow: auto;
}
</style>
