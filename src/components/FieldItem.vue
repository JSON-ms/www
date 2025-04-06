<script setup lang="ts">
import ListBuilder from '@/components/ListBuilder.vue';
import FieldHeader from '@/components/FieldHeader.vue';
import type {IInterfaceData, IField, IServerSettings, IInterface, IFile} from '@/interfaces';
import Rules from '@/rules';
import {deepToRaw, parseFields, getFieldType, isFieldType, isNativeObject, getFileIcon, isFieldI18n} from '@/utils';
import { computed, ref } from 'vue';
import { useGlobalStore } from '@/stores/global';
import { useDisplay } from 'vuetify';
import {useUserData} from '@/composables/user-data';
import {useInterface} from "@/composables/interface";

const { smAndDown } = useDisplay()
const globalStore = useGlobalStore();
const value = defineModel<any>({ required: true });
const {
  field,
  fieldKey,
  locale,
  locales,
  structure,
  serverSettings,
  interface: interfaceModel,
  disabled = false,
  loading = false,
} = defineProps<{
  field: IField,
  fieldKey: string,
  locale: string,
  locales: { [key: string]: string; },
  structure: IInterfaceData,
  interface: IInterface,
  serverSettings: IServerSettings,
  disabled?: boolean,
  loading?: boolean,
}>();

const { isFieldVisible } = useInterface();
const { getUserDataErrors } = useUserData();
const showDatePicker = ref(false);
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
  return rules;
}
const optionItems = computed((): { title: string, value: string }[] => {
  if (Array.isArray(field.items)) {
    return field.items.map(title => ({ title, value: title }));
  }
  if (field.items?.toString().startsWith('enums.')) {
    const enumType = field.items?.toString().split('enums.')[1];
    const enumData = structure.enums[enumType];
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
  return parseFields(structuredClone(deepToRaw(fields.value) || {}), locales);
}

const downloading = ref(false);
const onDownloadFile = (file: IFile) => {
  downloading.value = true;
  fetch(filePath(file))
    .then(response => response.blob())
    .then(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = file.meta.originalFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    })
    .catch(globalStore.catchError)
    .finally(() => downloading.value = false);
}
const onRemoveFile = (file: IFile) => {
  globalStore.setPrompt({
    ...globalStore.prompt,
    visible: true,
    title: 'Remove file',
    body: 'Are you sure you want to remove this file? The file won\'t be deleted and will remain on the server, but it will not be accessible once modifications are saved.',
    btnText: 'Remove',
    btnIcon: 'mdi-close',
    btnColor: 'warning',
    callback: () => new Promise(resolve => {
      if (field.multiple) {
        value.value = value.value.filter((val: IFile) => val.path !== file.path);
      } else {
        value.value = null;
      }
      resolve();
    })
  });
}

const fields = computed((): {[key: string]: IField } => {
  return field.fields ?? {};
})
const fieldType = computed((): string => {
  return getFieldType(field);
})
const isImage = (file: IFile): boolean => {
  return file.meta.type.startsWith('image/');
}
const isVideo = (file: IFile): boolean => {
  return file.meta.type.startsWith('video/');
}
const filePath = (file: IFile): string => {
  return serverSettings.publicUrl + file.path;
}
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
const getErrors = (index: number): { i18n: string[], currentI18n: string[], general: string[] } => {
  const allErrors = Object.keys(getUserDataErrors(fields.value, fieldKey + '[' + index + ']'));
  const i18n = allErrors.filter(item => Object.keys(locales).find(subLocale => item.endsWith(subLocale)));
  return {
    i18n,
    currentI18n: i18n.filter(item => item.endsWith(locale)),
    general: allErrors.filter(item => Object.keys(locales).every(subLocale => item.endsWith(subLocale))),
  }
}

const getErrorMsg = (index: number): string | null => {
  const errors = getErrors(index);
  if (errors.general.length > 0) {
    const item = errors.general[0].split('.').pop();
    if (item) {
      return `${fields.value[item].label} field has an issue`;
    }
  } else if (errors.currentI18n.length > 0) {
    const items = errors.currentI18n[0].split('.');
    return `${fields.value[items[items.length - 2]].label} field has an issue`;
  } else if (errors.i18n.length > 0) {
    const items = errors.i18n[0].split('.');
    const key = items.pop();
    const field = items.pop();
    if (field && key) {
      return `${fields.value[field].label} field has an issue in ${locales[key]}`
    }
  }
  return null;
}

const markdownToolbar = [
  'bold', 'italic', 'heading', '|', 'unordered-list', 'ordered-list', 'link', {
    name: "image",
    action: (editor: any) => {
      globalStore.showFileManager(true, false, (response) => {
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
  globalStore.showFileManager(true, field.multiple === true, files => {
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
    if (fieldItem.type === 'image' && typeof item[key] === 'object' && item[key] !== null && item[key].path) {
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

const onWysiwygContentChange = (content: any) => {
  console.log(content);
}
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
    location="bottom"
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
      :disabled="disabled"
      hide-header
      show-adjacent-months
      @update:model-value="showDatePicker = false"
    />
  </v-menu>

  <!-- FILE -->
  <div v-else-if="isFieldType(field, 'file')">
    <FieldHeader v-model="value" :field="field" :field-key="fieldKey" />
    <v-card
      v-for="(file, fileIdx) in files"
      :key="file.path ?? fileIdx"
      variant="tonal"
      class="w-100 mb-1"
    >
      <div class="d-flex align-center">
        <div class="pa-3 text-center bg-surface align-center justify-center" style="min-width: 128px">
          <v-avatar v-if="isImage(file)" size="100%" rounded="0">
            <v-img :src="filePath(file)" :cover="false">
              <template #placeholder>
                <v-overlay>
                  <v-progress-circular
                    indeterminate
                    size="32"
                    width="2"
                  />
                </v-overlay>
              </template>
            </v-img>
          </v-avatar>
          <video v-else-if="isVideo(file)" :src="filePath(file)" :style="{ height: smAndDown ? '96px' : '128px', float: 'left' }" controls />
          <v-icon v-else :icon="getFileIcon(file)" :size="smAndDown ? 48 : 64" />
        </div>
        <div class="pa-3 pl-0 w-100">
          <v-card-title
            :class="{
              'py-0 d-flex': true,
              'text-body-1': smAndDown,
            }"
          >
            <div class="d-flex" style="flex: 1; width: 0">
              <span class="text-truncate">{{ file.meta.originalFileName }}</span>
            </div>
          </v-card-title>
          <v-card-subtitle class="py-0">
            Size: {{ $formatBytes(file.meta.size) }}
            <br>Type: <span>{{ file.meta.type }}</span>
          </v-card-subtitle>
          <v-card-actions class="pb-0 flex-wrap" style="min-height: 0">
            <v-tooltip
              text="Download"
              location="bottom"
            >
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  :loading="downloading"
                  :disabled="disabled || downloading"
                  :size="smAndDown ? 'small' : 'default'"
                  color="primary"
                  icon
                  @click="() => onDownloadFile(file)"
                >
                  <v-icon icon="mdi-download" />
                </v-btn>
              </template>
            </v-tooltip>
            <v-tooltip
              text="Remove"
              location="bottom"
            >
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  :disabled="disabled"
                  :size="smAndDown ? 'small' : 'default'"
                  color="error"
                  variant="text"
                  icon
                  @click="() => onRemoveFile(file)"
                >
                  <v-icon icon="mdi-trash-can-outline" />
                </v-btn>
              </template>
            </v-tooltip>
          </v-card-actions>
        </div>
      </div>
    </v-card>

    <v-btn
      color="primary"
      block
      variant="tonal"
      @click="openFileManager"
    >
      File Manager
    </v-btn>
  </div>

  <!-- ARRAY -->
  <div v-else-if="isFieldType(field, 'array')">
    <FieldHeader v-model="value" :field="field" :field-key="fieldKey" />
    <ListBuilder
      v-model="value"
      :label="field.label"
      :field="field"
      :locale="locale"
      :server-settings="serverSettings"
      :required="field.required"
      :rules="getRules(field)"
      :default-item="getDefaultItem()"
      :disabled="disabled"
      :loading="loading"
      :on-collapsable-header="onCollapsableHeader"
      class="d-flex flex-column"
      style="gap: 0.5rem"
      hide-details="auto"
      clearable
      collapsable
    >
      <template #actions="{ index }">
        <v-tooltip
          v-if="getErrors(index).general.length > 0 || getErrors(index).currentI18n.length > 0"
          :text="getErrorMsg(index) || ''"
          location="bottom"
        >
          <template #activator="{ props }">
            <v-icon v-bind="props" icon="mdi-alert" color="warning" />
          </template>
        </v-tooltip>
        <v-tooltip
          v-else-if="getErrors(index).i18n.length > 0"
          :text="getErrorMsg(index) || ''"
          location="bottom"
        >
          <template #activator="{ props }">
            <v-icon v-bind="props" icon="mdi-alert-outline" color="warning" />
          </template>
        </v-tooltip>
      </template>
      <template #default="{ item, index }">
        <div
          v-for="(key, keyIdx) in Object.keys(fields)"
          :key="key"
          :class="{ 'mt-4': keyIdx > 0 }"
        >
          <v-expand-transition group>
            <FieldItem
              v-if="isFieldI18n(fields[key]) && isFieldVisible(fields[key], fieldKey + `[${index}]`)"
              v-model="item[key][locale]"
              :field="fields[key]"
              :field-key="fieldKey + '[' + index + '].' + key"
              :locale="locale"
              :locales="locales"
              :structure="structure"
              :interface="interfaceModel"
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
              :interface="interfaceModel"
              :server-settings="serverSettings"
              :disabled="disabled"
              :loading="loading"
            />
          </v-expand-transition>
        </div>
      </template>
    </ListBuilder>
  </div>

  <!-- NODE -->
  <fieldset v-else-if="fieldType === 'node'" class="pa-3">
    <legend class="font-weight-bold">
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
          :interface="interfaceModel"
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
          :interface="interfaceModel"
          :server-settings="serverSettings"
          :loading="loading"
        />
      </template>
    </div>
  </fieldset>

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
    is not supported. Check and adjust your YAML interface accordingly.
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
</style>
