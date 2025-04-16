<script setup lang="ts">
import ListBuilder from '@/components/ListBuilder.vue';
import FieldHeader from '@/components/FieldHeader.vue';
import FileFieldItem from '@/components/FileFieldItem.vue';
import FieldItemErrorTooltip from '@/components/FieldItemErrorTooltip.vue';
import type {IStructureData, IField, IServerSettings, IStructure, IFile} from '@/interfaces';
import Rules from '@/rules';
import {deepToRaw, parseFields, getFieldType, isFieldType, isNativeObject, isFieldI18n, getFieldRules} from '@/utils';
import {computed, ref, watch} from 'vue';
import { useGlobalStore } from '@/stores/global';
import {useStructure} from "@/composables/structure";

const globalStore = useGlobalStore();
const value = defineModel<any>({ required: true });
const {
  field,
  fieldKey,
  locale,
  locales,
  structure,
  structureData,
  serverSettings,
  disabled = false,
  loading = false,
} = defineProps<{
  field: IField,
  fieldKey: string,
  locale: string,
  locales: { [key: string]: string; },
  structure: IStructure,
  structureData: IStructureData,
  serverSettings: IServerSettings,
  disabled?: boolean,
  loading?: boolean,
}>();

const { isFieldVisible } = useStructure();

const showDatePicker = ref(false);
const showColorPicker = ref(false);
const getRules = (field: IField): any[] => {
  const rules: any[] = [];
  if (field.required) {
    rules.push((value: string) => Rules.required(value) || 'This field is required');
  }
  if (fieldType.value.includes('url') && value.value) {
    rules.push((value: string) => Rules.isUrl(value) || 'This field must be an URL');
  }
  if (fieldType.value.includes('number') && value.value) {
    rules.push((value: string) => Rules.digit(value) || 'This field must be a digit');
  }
  const fieldRules = getFieldRules(field);
  fieldRules.forEach(fieldRule => {
    const match = fieldRule.regex.match(/^\/(.*?)\/([gimsuy]*)$/);
    if (match) {
      const pattern = match[1];
      const flags = match[2];
      const regex = new RegExp(pattern, flags);
      rules.push((value: string) => regex.test(value) || fieldRule.message);
    } else {
      // throw new Error("Invalid regex string format");
    }
  })
  return rules;
}
const optionItems = computed((): { title: string, value: string }[] => {
  if (Array.isArray(field.items)) {
    return field.items.map(title => ({ title, value: title }));
  }
  if (field.items?.toString().startsWith('enums.')) {
    const enumType = field.items?.toString().split('enums.')[1];
    const enumData = structureData.enums[enumType];
    if (enumData) {
      if (Array.isArray(enumData)) {
        return enumData.map(title => ({ title, value: title }));
      }
      return Object.entries(enumData || {}).map(([value, title]) => ({ title, value }));
    } else {
      return [];
    }
  }
  return Object.entries(field.items || {}).map(([value, title]) => ({ title, value }));
})
const computedDate = computed({
  get: (): Date | null => {
    if (typeof value.value === 'string') {
      return new Date(value.value);
    }
    return value.value;
  },
  set: (date: Date) => {
    value.value = date.toISOString().slice(0, 10);
  }
})
const computedReadOnlyDate = computed((): string => {
  if (value.value instanceof Date) {
    return value.value.toISOString().slice(0, 10);
  }
  return value.value || null;
});

const getDefaultItem = () => {
  return parseFields(structuredClone(deepToRaw(fields.value) || {}), locales, structureData.schemas);
}

const fields = computed((): {[key: string]: IField } => {
  return field.fields ?? {};
})
const fieldType = computed((): string => {
  return getFieldType(field);
})
const showPrependInner = computed((): boolean => {
  return !!(field['prepend-inner']);
})
const showAppendInner = computed((): boolean => {
  return isFieldI18n(field) || !!(field['append-inner']);
})
const files = computed((): IFile[] => {
  return field.multiple
    ? value.value.filter((item: IFile) => item.path)
    : value.value && value.value.path
      ? [value.value]
      : [];
})

const markdownToolbar = [
  'bold', 'italic', 'heading', '|', 'unordered-list', 'ordered-list', 'link', {
    name: "image",
    action: (editor: any) => {
      globalStore.showFileManager([], true, false, (response) => {
        return new Promise((resolve) => {
          if (response) {
            const file = response as IFile;
            const text = `![${file.meta.originalFileName}](${serverSettings.publicUrl + file.path})`;
            const cursor = editor.codemirror.getCursor();
            editor.codemirror.replaceRange(text, cursor);
          }
          resolve(true);
        })
      }, 'image/*')
    },
    className: "fa fa-image",
    title: "Images",
  }
];

const openFileManager = () => {
  globalStore.showFileManager(files.value, true, field.multiple === true, files => {
    return new Promise((resolve) => {
      value.value = files;
      resolve(true);
    })
  }, (field.accept || '').toString())
}

const onCollapsableHeader = (item: any, index: number) => {
  let title;
  let thumbnail: string | false = false;
  for (const key in fields.value) {
    const fieldItem = fields.value[key];
    if (!title && ['string', 'i18n:string', 'i18n', 'date', 'i18n:date'].includes(fieldItem.type)) {
      if (isFieldI18n(fieldItem)) {
        title = item[key][locale];
      } else {
        title = item[key];
      }
    }
    if (fieldItem.type === 'file' && typeof item[key] === 'object' && item[key] !== null && item[key].path && item[key].meta && item[key].meta.type.startsWith('image/')) {
      thumbnail = serverSettings.publicUrl + item[key].path;
    }
    if (thumbnail && title) {
      break;
    }
  }

  if (thumbnail && !title) {
    title = thumbnail.substring(thumbnail.lastIndexOf('/') + 1);
  }

  if (!title) {
    const keys = Object.keys(fields.value);
    if (keys.length > 0) {
      const fieldItem = fields.value[keys[0]];
      if (isFieldType(fieldItem, 'i18n')) {
        if (item[keys[0]][locale]) {
          title = (item[keys[0]][locale] || '').toString().substring(0, 64);
        }
      } else {
        if (!isNativeObject(item[keys[0]])) {
          title = (item[keys[0]] || '').toString().substring(0, 64);
        }
      }
    }
  }
  return {
    title: title || 'Item #' + (index + 1),
    thumbnail,
  }
}

const computedStringValue = computed({
  get() {
    return typeof value.value === 'string' ? value.value : '';
  },
  set(content: string) {
    value.value = content;
  }
})

const onClickOutsideDate = () => {
  if (showDatePicker.value) {
    showDatePicker.value = false;
  }
}

const onClickOutsideColor = () => {
  if (showColorPicker.value) {
    showColorPicker.value = false;
  }
}

const onWysiwygContentChange = (content: any) => {
  console.log(content);
}

const expanded = ref(field.collapsed === true ? null : 0);
watch(() => field.collapsed, () => {
  expanded.value = field.collapsed === true ? null : 0;
})
</script>

<template>

  <!-- PREPEND -->
  <p v-if="field.prepend">
    {{ field.prepend }}
  </p>

  <!-- I18N / URL / STRING / PASSWORD -->
  <v-text-field
    v-if="isFieldType(field, ['i18n', 'url', 'string', 'password'])"
    v-model="value"
    :label="field.label"
    :type="fieldType.includes('password') ? 'password' : 'text'"
    :prepend-inner-icon="field.icon"
    :hint="field.hint"
    :persistent-hint="!!field.hint"
    :required="field.required"
    :rules="getRules(field)"
    :disabled="disabled"
    :loading="loading"
    hide-details="auto"
    clearable
  >
    <template v-if="field.required" #label>
      <span class="mr-2 text-error">*</span>{{ field.label }}
    </template>
    <template v-if="showPrependInner" #prepend-inner>
      <span class="text-no-wrap">{{ field['prepend-inner'] }}</span>
    </template>
    <template v-if="showAppendInner" #append-inner>
      <span v-if="field['append-inner']" class="text-no-wrap">{{ field['append-inner'] }}</span>
      <v-tooltip
        v-if="isFieldI18n(field)"
        text="Translatable"
        location="bottom"
      >
        <template #activator="{ props }">
          <v-icon v-bind="props" size="small" icon="mdi-translate-variant" />
        </template>
      </v-tooltip>
    </template>
  </v-text-field>

  <!-- NUMBER -->
  <v-number-input
    v-else-if="isFieldType(field, 'number')"
    v-model.number="value"
    :label="field.label"
    :prepend-inner-icon="field.icon"
    :hint="field.hint"
    :persistent-hint="!!field.hint"
    :required="field.required"
    :rules="getRules(field)"
    :disabled="disabled"
    :loading="loading"
    :min="field.min"
    :max="field.max"
    :step="field.step || 1"
    hide-details="auto"
    clearable
  >
    <template v-if="field.required" #label>
      <span class="mr-2 text-error">*</span>{{ field.label }}
    </template>
    <template v-if="showPrependInner" #prepend-inner>
      <span class="text-no-wrap ml-3 mr-2">{{ field['prepend-inner'] }}</span>
    </template>
    <template v-if="showAppendInner" #append-inner>
      <span v-if="field['append-inner']" class="text-no-wrap mr-6">{{ field['append-inner'] }}</span>
      <v-tooltip
        v-if="isFieldI18n(field)"
        text="Translatable"
        location="bottom"
      >
        <template #activator="{ props }">
          <v-icon v-bind="props" size="small" icon="mdi-translate-variant" />
        </template>
      </v-tooltip>
    </template>
  </v-number-input>

  <!-- WYSIWYG -->
  <div v-else-if="isFieldType(field, 'wysiwyg')">
    <FieldHeader v-model="value" :field="field" :field-key="fieldKey" />
    <v-input
      v-if="value !== null"
      v-model="value"
      :hint="field.hint"
      :persistent-hint="!!field.hint"
      :required="field.required"
      :rules="getRules(field)"
      :disabled="disabled"
      hide-details="auto"
    >
      <div class="w-100 mb-12">
        <QuillEditor
          v-model="computedStringValue"
          theme="snow"
          style="height: 33vh"
          @text-change="onWysiwygContentChange"
          @selection-change="onWysiwygContentChange"
          @editor-change="onWysiwygContentChange"
        />
      </div>
    </v-input>
  </div>

  <!-- MARKDOWN -->
  <div v-else-if="isFieldType(field, 'markdown')">
    <FieldHeader v-model="value" :field="field" :field-key="fieldKey" />
    <v-input
      v-model="value"
      :hint="field.hint"
      :persistent-hint="!!field.hint"
      :required="field.required"
      :rules="getRules(field)"
      :disabled="disabled"
      hide-details="auto"
    >
      <vue-easymde
        v-model="computedStringValue"
        :disabled="disabled"
        :options="{
          placeholder: 'Type here...',
          spellChecker: false,
          nativeSpellcheck: false,
          styleSelectedText: false,
          sideBySideFullscreen: false,
          syncSideBySidePreviewScroll: false,
          status: false,
          lineNumbers: false,
          toolbar: markdownToolbar,
        }"
        class="w-100"
      />
    </v-input>
  </div>

  <!-- TEXTAREA -->
  <v-textarea
    v-else-if="isFieldType(field, 'textarea')"
    v-model="value"
    :label="field.label"
    :required="field.required"
    :rules="getRules(field)"
    :disabled="disabled"
    :loading="loading"
    hide-details="auto"
    clearable
  >
    <template v-if="field.required" #label>
      <span class="mr-2 text-error">*</span>{{ field.label }}
    </template>
    <template v-if="showPrependInner" #prepend-inner>
      <span class="text-no-wrap">{{ field['prepend-inner'] }}</span>
    </template>
    <template v-if="showAppendInner" #append-inner>
      <span v-if="field['append-inner']" class="text-no-wrap">{{ field['append-inner'] }}</span>
      <v-tooltip
        v-if="isFieldI18n(field)"
        text="Translatable"
        location="bottom"
      >
        <template #activator="{ props }">
          <v-icon v-bind="props" size="small" icon="mdi-translate-variant" />
        </template>
      </v-tooltip>
    </template>
  </v-textarea>

  <!-- SELECT -->
  <v-autocomplete
    v-else-if="isFieldType(field, 'select')"
    v-model="value"
    :label="field.label"
    :required="field.required"
    :rules="getRules(field)"
    :items="optionItems"
    :multiple="!!(field.multiple)"
    :disabled="disabled"
    :loading="loading"
    hide-details="auto"
    clearable
  >
    <template v-if="field.required" #label>
      <span class="mr-2 text-error">*</span>{{ field.label }}
    </template>
    <template v-if="showPrependInner" #prepend-inner>
      <span class="text-no-wrap">{{ field['prepend-inner'] }}</span>
    </template>
    <template v-if="showAppendInner" #append-inner>
      <span v-if="field['append-inner']" class="text-no-wrap">{{ field['append-inner'] }}</span>
      <v-tooltip
        v-if="isFieldI18n(field)"
        text="Translatable"
        location="bottom"
      >
        <template #activator="{ props }">
          <v-icon v-bind="props" size="small" icon="mdi-translate-variant" />
        </template>
      </v-tooltip>
    </template>
  </v-autocomplete>

  <!-- SWITCH -->
  <v-switch
    v-else-if="isFieldType(field, 'switch')"
    v-model="value"
    :label="field.label"
    :required="field.required"
    :rules="getRules(field)"
    :hint="field.hint"
    :persistent-hint="!!field.hint"
    :disabled="disabled"
    :loading="loading"
    color="primary"
    hide-details="auto"
    inset
  >
    <template #label>
      <span v-if="field.required" class="mr-2 text-error">*</span>{{ field.label }}
      <v-tooltip
        v-if="isFieldI18n(field)"
        text="Translatable"
        location="bottom"
      >
        <template #activator="{ props }">
          <v-icon v-bind="props" size="small" icon="mdi-translate-variant" />
        </template>
      </v-tooltip>
    </template>
  </v-switch>

  <!-- SLIDER -->
  <div v-else-if="isFieldType(field, 'slider')">
    <FieldHeader v-model="value" :field="field" :field-key="fieldKey" />
    <v-slider
      v-model="value"
      :required="field.required"
      :rules="getRules(field)"
      :hint="field.hint"
      :persistent-hint="!!field.hint"
      :min="field.min || 0"
      :max="field.max || 100"
      :step="field.step || 1"
      :disabled="disabled"
      color="primary"
      hide-details="auto"
      thumb-label="always"
    />
  </div>

  <!-- RANGE -->
  <div v-else-if="isFieldType(field, 'range')">
    <FieldHeader v-model="value" :field="field" :field-key="fieldKey" />
    <v-range-slider
      v-model="value"
      :required="field.required"
      :rules="getRules(field)"
      :hint="field.hint"
      :persistent-hint="!!field.hint"
      :min="field.min || 0"
      :max="field.max || 100"
      :step="field.step || 1"
      :disabled="disabled"
      color="primary"
      hide-details="auto"
      thumb-label="always"
    />
  </div>

  <!-- COLOR -->
  <v-menu
    v-else-if="isFieldType(field, 'color')"
    v-model="showColorPicker"
    :close-on-content-click="false"
    :disabled="disabled"
    :loading="loading"
  >
    <template #activator="{ props }">
      <v-text-field
        v-model="value"
        v-bind="props"
        :label="field.label"
        :required="field.required"
        :rules="getRules(field)"
        :hint="field.hint"
        :persistent-hint="!!field.hint"
        :disabled="disabled"
        :loading="loading"
        readonly
        hide-details="auto"
        clearable
        @click="showColorPicker = true"
        @click:clear="value = null"
      >
        <template v-if="field.required" #label>
          <span class="mr-2 text-error">*</span>{{ field.label }}
        </template>
        <template #prepend-inner>
          <v-icon icon="mdi-circle" :color="value" start />
          <span v-if="showPrependInner" class="text-no-wrap">{{ field['prepend-inner'] }}</span>
        </template>
        <template v-if="showAppendInner" #append-inner>
          <span v-if="field['append-inner']" class="text-no-wrap">{{ field['append-inner'] }}</span>
          <v-tooltip
            v-if="isFieldI18n(field)"
            text="Translatable"
            location="bottom"
          >
            <template #activator="{ props: transProps }">
              <v-icon v-bind="transProps" size="small" icon="mdi-translate-variant" />
            </template>
          </v-tooltip>
        </template>
      </v-text-field>
    </template>
    <v-color-picker
      v-model="value"
      v-click-outside="onClickOutsideColor"
      :label="field.label"
      :required="field.required"
      :rules="getRules(field)"
      :hint="field.hint"
      :show-swatches="field.swatches"
      :hide-canvas="field.canvas === false"
      :hide-inputs="field.inputs === false"
      :hide-sliders="field.sliders === false"
      :persistent-hint="!!field.hint"
      :disabled="disabled"
      hide-details="auto"
      mode="hex"
    />
  </v-menu>

  <!-- RATING -->
  <div v-else-if="isFieldType(field, 'rating')">
    <FieldHeader v-model="value" :field="field" :field-key="fieldKey" />
    <v-rating
      v-model="value"
      :label="field.label"
      :required="field.required"
      :rules="getRules(field)"
      :hint="field.hint"
      :persistent-hint="!!field.hint"
      :disabled="disabled"
      :loading="loading"
      :length="field.length || 5"
      :half-increments="field['half-increments'] ?? false"
      color="primary"
      hide-details="auto"
      hover
    />
  </div>

  <!-- CHECKBOX -->
  <div v-else-if="isFieldType(field, 'checkbox')">
    <FieldHeader v-model="value" :field="field" :field-key="fieldKey" />
    <v-checkbox
      v-for="item in optionItems"
      :key="item.value"
      v-model="value"
      :label="item.title"
      :value="item.value"
      :required="field.required"
      :disabled="disabled"
      :loading="loading"
      color="primary"
      hide-details="auto"
    />
  </div>

  <!-- RADIO -->
  <div v-else-if="isFieldType(field, 'radio')">
    <FieldHeader v-model="value" :field="field" :field-key="fieldKey" />
    <v-radio-group
      v-model="value"
      :required="field.required"
      :rules="getRules(field)"
      :inline="field.inline"
      :disabled="disabled"
      :loading="loading"
      color="primary"
      hide-details="auto"
      clearable
    >
      <v-radio
        v-for="item in optionItems"
        :key="item.value"
        :label="item.title"
        :value="item.value"
        :disabled="disabled"
        :loading="loading"
      />
    </v-radio-group>
  </div>

  <!-- DATE -->
  <v-menu
    v-else-if="isFieldType(field, 'date')"
    v-model="showDatePicker"
    :close-on-content-click="false"
    :disabled="disabled"
    :loading="loading"
  >
    <template #activator="{ props }">
      <v-text-field
        v-model="computedReadOnlyDate"
        v-bind="props"
        :label="field.label"
        :required="field.required"
        :rules="getRules(field)"
        :hint="field.hint"
        :persistent-hint="!!field.hint"
        :disabled="disabled"
        :loading="loading"
        readonly
        hide-details="auto"
        clearable
        @click="showDatePicker = true"
        @click:clear="value = null"
      >
        <template v-if="field.required" #label>
          <span class="mr-2 text-error">*</span>{{ field.label }}
        </template>
        <template v-if="showPrependInner" #prepend-inner>
          <span class="text-no-wrap">{{ field['prepend-inner'] }}</span>
        </template>
        <template v-if="showAppendInner" #append-inner>
          <span v-if="field['append-inner']" class="text-no-wrap">{{ field['append-inner'] }}</span>
          <v-tooltip
            v-if="isFieldI18n(field)"
            text="Translatable"
            location="bottom"
          >
            <template #activator="{ props: transProps }">
              <v-icon v-bind="transProps" size="small" icon="mdi-translate-variant" />
            </template>
          </v-tooltip>
        </template>
      </v-text-field>
    </template>
    <v-date-picker
      v-model="computedDate"
      v-click-outside="onClickOutsideDate"
      :disabled="disabled"
      hide-header
      show-adjacent-months
      @update:model-value="showDatePicker = false"
    />
  </v-menu>

  <!-- FILE -->
  <div v-else-if="isFieldType(field, 'file')">
    <FieldHeader v-model="value" :field="field" :field-key="fieldKey" />
    <ListBuilder
      v-if="field.multiple"
      v-model="value"
      :disabled="disabled"
      :can-add="false"
      :min="field.min"
      :max="field.max"
    >
      <template #default="{ index }">
        <FileFieldItem
          v-model="value"
          :file="files[index]"
          :field="field"
          :server-settings="serverSettings"
          :disabled="disabled"
        />
      </template>
    </ListBuilder>
    <FileFieldItem
      v-else-if="files.length > 0"
      v-model="value"
      :file="files[0]"
      :field="field"
      :server-settings="serverSettings"
      :disabled="disabled"
    />

    <div
      :class="{
        'mt-1': files.length > 0,
        'pl-9': files.length > 0 && field.multiple,
        'pr-14': files.length > 0 && field.multiple,
      }"
    >
      <v-btn
        color="primary"
        block
        variant="tonal"
        @click="openFileManager"
      >
        File Manager
      </v-btn>
    </div>
  </div>

  <!-- ARRAY -->
  <div v-else-if="isFieldType(field, 'array')">
    <FieldHeader v-model="value" :field="field" :field-key="fieldKey" />
    <ListBuilder
      v-model="value"
      :default-item="getDefaultItem()"
      :disabled="disabled"
      :on-collapsable-header="onCollapsableHeader"
      :min="field.min"
      :max="field.max"
      class="d-flex flex-column"
      style="gap: 0.5rem"
      collapsable
    >
      <template #actions="{ index }">
        <FieldItemErrorTooltip
          v-model="value"
          :fields="fields"
          :field-key="fieldKey"
          :locales="locales"
          :locale="locale"
          :index="index"
        />
      </template>
      <template #default="{ item, index }">
        <div
          v-for="(key, keyIdx) in Object.keys(fields)"
          :key="key"
          :class="{ 'mt-4': keyIdx > 0 }"
        >
          <FieldItem
            v-if="isFieldI18n(fields[key]) && isFieldVisible(fields[key], fieldKey + `[${index}]`)"
            v-model="item[key][locale]"
            :field="fields[key]"
            :field-key="fieldKey + '[' + index + '].' + key"
            :locale="locale"
            :locales="locales"
            :structure="structure"
            :structure-data="structureData"
            :server-settings="serverSettings"
            :disabled="disabled"
            :loading="loading"
          />
          <FieldItem
            v-else-if="fields[key] && isFieldVisible(fields[key], fieldKey + `[${index}]`)"
            v-model="item[key]"
            :field="fields[key]"
            :field-key="fieldKey + '.' + '[' + index + '].' + key"
            :locale="locale"
            :locales="locales"
            :structure="structure"
            :structure-data="structureData"
            :server-settings="serverSettings"
            :disabled="disabled"
            :loading="loading"
          />
        </div>
      </template>
    </ListBuilder>
  </div>

  <!-- NODE -->
  <template v-else-if="fieldType === 'node'">
    <v-expansion-panels v-if="field.collapsable" v-model="expanded">
      <v-expansion-panel>
        <v-expansion-panel-title>
          <div class="d-flex align-center justify-space-between w-100 pr-3" style="gap: 1rem">
            <div class="d-flex align-center" style="gap: 1rem">
              <v-icon v-if="field.icon" :icon="field.icon" />
              <span>{{ field.label }}</span>
            </div>
            <FieldItemErrorTooltip
              v-model="value"
              :fields="fields"
              :field-key="fieldKey"
              :locales="locales"
              :locale="locale"
            />
          </div>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <div
            class="d-flex flex-column"
            style="gap: 1rem"
          >
            <template
              v-for="(nodeField, key) in fields"
              :key="key"
            >
              <FieldItem
                v-if="isFieldI18n(nodeField)"
                v-model="value[key][locale]"
                :field="nodeField"
                :field-key="fieldKey + '.' + key"
                :locale="locale"
                :locales="locales"
                :structure="structure"
                :structure-data="structureData"
                :server-settings="serverSettings"
                :loading="loading"
              />
              <FieldItem
                v-else
                v-model="value[key]"
                :field="nodeField"
                :field-key="fieldKey + '.' + key"
                :locale="locale"
                :locales="locales"
                :structure="structure"
                :structure-data="structureData"
                :server-settings="serverSettings"
                :loading="loading"
              />
            </template>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
    <fieldset v-else class="pa-3">
      <legend class="font-weight-bold px-3">
        {{ field.label }}
      </legend>
      <div
        class="d-flex flex-column"
        style="gap: 1rem"
      >
        <template
          v-for="(nodeField, key) in fields"
          :key="key"
        >
          <FieldItem
            v-if="isFieldI18n(nodeField)"
            v-model="value[key][locale]"
            :field="nodeField"
            :field-key="fieldKey + '.' + key"
            :locale="locale"
            :locales="locales"
            :structure="structure"
            :structure-data="structureData"
            :server-settings="serverSettings"
            :loading="loading"
          />
          <FieldItem
            v-else
            v-model="value[key]"
            :field="nodeField"
            :field-key="fieldKey + '.' + key"
            :locale="locale"
            :locales="locales"
            :structure="structure"
            :structure-data="structureData"
            :server-settings="serverSettings"
            :loading="loading"
          />
        </template>
      </div>
    </fieldset>
  </template>

  <!-- FALLBACK: FIELD NOT EXISTING -->
  <v-alert
    v-else
    class="mb-0"
    type="warning"
    variant="tonal"
  >
    This field type
    <v-chip size="x-small" label>
      {{ fieldType }}
    </v-chip>
    is not supported. Check and adjust your YAML structure accordingly.
  </v-alert>

  <!-- APPEND -->
  <p v-if="field.append">
    {{ field.append }}
  </p>
</template>

<style lang="scss">
.v-file-upload-items { display: none; }
.v-checkbox .v-selection-control { min-height: 0 !important; }
.vue-easymde-editor .CodeMirror-scroll {
  min-height: 6rem !important;
  max-height: 40vh !important;
}
.handle {
   cursor: grabbing;
 }
</style>
