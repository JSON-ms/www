<script setup lang="ts">
import type { IField } from '@/interfaces';

const value = defineModel<any>({ required: true });
const {
  field,
  fieldKey,
} = defineProps<{
  field: IField,
  fieldKey?: string,
}>();
</script>

<template>
  <v-list-subheader class="pr-3 w-100 d-block" style="min-height: 2rem">
    <div class="d-flex align-center justify-space-between">
      <span>
        <span v-if="field.required" class="mr-2 text-error">*</span>
        <span>{{ field.label }}</span>{{}}
        <span v-if="field?.type.includes('array') && value?.length > 0">
          ({{ value.length }})
        </span>
      </span>
      <div class="d-flex align-center" style="gap: 0.5rem">
        <v-tooltip
          v-if="field.type.includes('i18n')"
          text="Translatable"
          location="bottom"
        >
          <template #activator="{ props }">
            <v-icon v-bind="props" size="small" icon="mdi-translate-variant" />
          </template>
        </v-tooltip>
      </div>
    </div>
  </v-list-subheader>
</template>
