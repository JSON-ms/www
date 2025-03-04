<script setup lang="ts">
import ListBuilder from '@/components/ListBuilder.vue';
import type { IField } from '@/interfaces';
import Rules from '@/rules';
import { computed } from 'vue';

const {
  fields,
  data,
  locale,
  depth = 0
} = defineProps<{
  fields: { [key: string]: IField; },
  data: any,
  locale: string,
  depth?: number,
}>();

const computedFields = computed((): any => {
  const items: any = {};
  Object.keys(fields).forEach(key => {
    const field = fields[key];
    items[key] = {
      ...field,
      model: field.type.includes('i18n')
        ? depth === 0 ? data.i18n[locale][key] : data[key]
        : depth === 0 ? data.general[key] : data[key],
    }
  })
  return items;
})

const getRules = (field: IField): any[] => {
  const rules: any[] = [];
  if (field.required) {
    rules.push((value: string) => Rules.required(value) || 'This field is required');
  }
  if (field.type.includes('url')) {
    rules.push((value: string) => Rules.isUrl(value) || 'This field must be an URL');
  }
  if (field.type.includes('number')) {
    rules.push((value: string) => Rules.digit(value) || 'This field must be a digit');
  }
  if (field.type.includes('number')) {
    rules.push((value: string) => Rules.digit(value) || 'This field must be a digit');
  }
  return rules;
}
</script>

<template>
  <template
    v-for="(field, key) in computedFields"
    :key="key"
  >
    <!-- I18N / URL / STRING -->
    <v-text-field
      v-if="['i18n', 'url', 'string'].includes(field.type)"
      v-model="field.model"
      :label="field.label"
      :prepend-inner-icon="field.icon"
      :hint="field.hint"
      :persistent-hint="!!field.hint"
      :required="field.required"
      :rules="getRules(field)"
      hide-details="auto"
      clearable
    >
      <template v-if="field.required" #label>
        <span class="mr-2 text-error">*</span>{{ field.label }}
      </template>
      <template v-if="field.type.includes('i18n')" #append-inner>
        <v-chip label size="x-small">Translatable</v-chip>
      </template>
    </v-text-field>

    <!-- NUMBER -->
    <v-number-input
      v-if="field.type === 'number'"
      v-model="field.model"
      :label="field.label"
      :prepend-inner-icon="field.icon"
      :hint="field.hint"
      :persistent-hint="!!field.hint"
      :required="field.required"
      :rules="getRules(field)"
      hide-details="auto"
      clearable
    >
      <template v-if="field.required" #label>
        <span class="mr-2 text-error">*</span>{{ field.label }}
      </template>
    </v-number-input>

    <!-- WYSIWYG -->
    <div v-else-if="['wysiwyg', 'i18n:wysiwyg'].includes(field.type)">
      <v-list-subheader class="pr-3 w-100 d-block" style="min-height: 2rem">
        <div class="d-flex align-center justify-space-between">
          <span>
            <span v-if="field.required" class="mr-2 text-error">*</span>
            <span>{{ field.label }}</span>
          </span>
          <v-chip v-if="field.type.includes('i18n')" label size="x-small">Translatable</v-chip>
        </div>
      </v-list-subheader>
      <v-input
        v-model="field.model"
        :label="field.label"
        :prepend-inner-icon="field.icon"
        :hint="field.hint"
        :persistent-hint="!!field.hint"
        :required="field.required"
        :rules="getRules(field)"
        hide-details="auto"
        clearable
      >
        <div class="w-100 mb-12">
          <QuillEditor
            v-model="field.model"
            theme="snow"
            style="min-height: 100px"
          />
        </div>
      </v-input>
    </div>

    <!-- MARKDOWN -->
    <div v-else-if="['markdown', 'i18n:markdown'].includes(field.type)">
      <v-list-subheader class="pr-3 w-100 d-block" style="min-height: 2rem">
        <div class="d-flex align-center justify-space-between">
          <span>
            <span v-if="field.required" class="mr-2 text-error">*</span>
            <span>{{ field.label }}</span>
          </span>
          <v-chip v-if="field.type.includes('i18n')" label size="x-small">Translatable</v-chip>
        </div>
      </v-list-subheader>
      <v-input
        v-model="field.model"
        :label="field.label"
        :prepend-inner-icon="field.icon"
        :hint="field.hint"
        :persistent-hint="!!field.hint"
        :required="field.required"
        :rules="getRules(field)"
        hide-details="auto"
        clearable
      >
        <vue-easymde
          v-model="field.model"
          :options="{
            minHeight: '100px',
            placeholder: 'Type here...',
            spellChecker: false,
            nativeSpellcheck: false,
            styleSelectedText: false,
            sideBySideFullscreen: false,
            syncSideBySidePreviewScroll: false,
            status: false,
            lineNumbers: false,
            hideIcons: ['guide', 'fullscreen', 'side-by-side', 'preview'],
          }"
          class="w-100"
        />
      </v-input>
    </div>

    <!-- TEXTAREA -->
    <v-textarea
      v-else-if="['textarea', 'i18n:textarea'].includes(field.type)"
      v-model="field.model"
      :label="field.label"
      :required="field.required"
      :rules="getRules(field)"
      hide-details="auto"
      clearable
    >
      <template v-if="field.required" #label>
        <span class="mr-2 text-error">*</span>{{ field.label }}
      </template>
      <template v-if="field.type.includes('i18n')" #append-inner>
        <v-chip label size="x-small">Translatable</v-chip>
      </template>
    </v-textarea>

    <!-- FILE -->
    <div v-else-if="field.type === 'file'">
      <v-list-subheader class="pr-3 w-100 d-block" style="min-height: 2rem">
        <div class="d-flex align-center justify-space-between">
          <span>
            <span v-if="field.required" class="mr-2 text-error">*</span>
            <span>{{ field.label }}</span>
          </span>
          <v-chip v-if="field.type.includes('i18n')" label size="x-small">Translatable</v-chip>
        </div>
      </v-list-subheader>
      <v-file-upload
        v-model="field.model"
        :label="field.label"
        :prepend-inner-icon="field.icon"
        :hint="field.hint"
        :persistent-hint="!!field.hint"
        :required="field.required"
        :rules="getRules(field)"
        hide-details="auto"
        density="compact"
        variant="compact"
        scrim="primary"
        clearable
      />
    </div>

    <!-- ARRAY -->
    <div v-else-if="field.type === 'array'">
      <v-list-subheader class="pr-3 w-100 d-block" style="min-height: 2rem">
        <div class="d-flex align-center justify-space-between">
          <span>
            <span v-if="field.required" class="mr-2 text-error">*</span>
            <span>{{ field.label }}</span>
          </span>
        </div>
      </v-list-subheader>
      <ListBuilder
        v-model="field.model"
        :label="field.label"
        :required="field.required"
        :rules="getRules(field)"
        hide-details="auto"
        clearable
      />
    </div>
  </template>
</template>
