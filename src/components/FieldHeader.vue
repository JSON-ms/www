<script setup lang="ts">
import type { IField } from '@/interfaces';
import {computed} from 'vue';

const {
  field,
  locale,
  locales = {}
} = defineProps<{
  field: IField,
  locale: string,
  locales:  { [key: string]: string; },
}>();

const fieldLabel = computed((): string => {
  return field.type.includes('i18n')
    ? (field.label + ' (' + locales[locale] + ')')
    : field.label
})
</script>

<template>
  <v-list-subheader class="pr-3 w-100 d-block" style="min-height: 2rem">
    <div class="d-flex align-center justify-space-between">
      <span>
        <span v-if="field.required" class="mr-2 text-error">*</span>
        <span>{{ fieldLabel }}</span>
      </span>
    </div>
  </v-list-subheader>
</template>
