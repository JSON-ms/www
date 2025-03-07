<script setup lang="ts">
import type { IField } from '@/interfaces';

const {
  field,
  locale,
  locales = {}
} = defineProps<{
  field: IField,
  locale: string,
  locales:  { [key: string]: string; },
}>();
</script>

<template>
  <v-list-subheader class="pr-3 w-100 d-block" style="min-height: 2rem">
    <div class="d-flex align-center justify-space-between">
          <span>
            <span v-if="field.required" class="mr-2 text-error">*</span>
            <span>{{ field.label }}</span>
          </span>
      <v-chip v-if="field.type.includes('i18n')" label size="x-small">
        {{ locales[locale] }}
      </v-chip>
    </div>
  </v-list-subheader>
</template>
