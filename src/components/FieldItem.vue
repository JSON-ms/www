<script setup lang="ts">
import ListBuilder from '@/components/ListBuilder.vue';
import FieldHeader from '@/components/FieldHeader.vue';
import type { IInterfaceData, IField, IServerSettings } from '@/interfaces';
import Rules from '@/rules';
import { parseFields, phpStringSizeToBytes } from '@/utils';
import { computed, ref, toRaw } from 'vue';
import { Services } from '@/services';
import { useGlobalStore } from '@/stores/global';
import { useDisplay } from 'vuetify';
import type InterfaceModel from '@/models/interface.model';

const { smAndDown } = useDisplay()
const globalStore = useGlobalStore();
const value = defineModel<any>({ required: true });
const {
  field,
  locale,
  locales,
  structure,
  serverSettings,
  interface: model,
  disabled = false,
} = defineProps<{
  field: IField,
  locale: string,
  locales: { [key: string]: string; },
  structure: IInterfaceData,
  interface: InterfaceModel,
  serverSettings: IServerSettings,
  disabled: boolean
}>();
const showDatePicker = ref(false);
const getRules = (field: IField): any[] => {
  const rules: any[] = [];
  if (field.required) {
    rules.push((value: string) => Rules.required(value) || 'This field is required');
  }
  if (field.type.includes('url') && value.value) {
    rules.push((value: string) => Rules.isUrl(value) || 'This field must be an URL');
  }
  if (field.type.includes('number') && value.value) {
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
    }
  }
  return Object.entries(field.items || {}).map(([value, title]) => ({ title, value }));
})
const arrayFields = computed((): {[key: string]: IField} => {
  return field.fields || {};
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
  return parseFields(structuredClone(toRaw(arrayFields.value) || {}), locales);
}

const uploading = ref(false);
const uploadProgress = ref(0);
const onFileChange = (file: File | File[] | null) => {
  if (file && model.data.server_url && Rules.isUrl(model.data.server_url) && !Array.isArray(file)) {
    if (file.size > phpStringSizeToBytes(serverSettings.uploadMaxSize)) {
      globalStore.catchError(new Error(
        'This file is exceeding the maximum size of ' + serverSettings.uploadMaxSize + ' defined by the server.'
      ));
    } else {
      uploading.value = true;
      uploadProgress.value = 0;
      Services.upload(model.data.server_url, file, progress => uploadProgress.value = progress, {
        'X-Jms-Interface-Hash': model.data.hash,
        'X-Jms-Api-Key': model.data.server_secret,
      })
        .then(response => value.value = response.internalPath)
        .catch(globalStore.catchError)
        .finally(() => uploading.value = false);
    }
  }
}
const fileValue = computed({
  get: ():  File | File[] | undefined => {
    const file = new File([], value.value);
    return value.value instanceof File ? value.value : file;
  },
  set: (file: File | undefined) => {
    value.value = file;
  }
})
const localeLabel = computed((): string => {
  return (locales[locale] || '');
})
const filePath = computed((): string => {
  return serverSettings.publicUrl + value.value;
})
const fileType = computed((): string => {
  return field.type.replace('i18n:', '');
})
const fileIcons: {[key: string]: string} = {
  'i18n:file': 'mdi-file-outline',
  'file': 'mdi-file-outline',
  'i18n:video': 'mdi-video-outline',
  'video': 'mdi-video-outline',
}
</script>

<template>
  <!-- PREPEND -->
  <p v-if="field.prepend">
    {{ field.prepend }}
  </p>

  <!-- I18N / URL / STRING / PASSWORD -->
  <v-text-field
    v-if="['i18n', 'url', 'i18n:url', 'string', 'i18n:string', 'password', 'i18n:password'].includes(field.type)"
    v-model="value"
    :label="field.label"
    :type="field.type.includes('password') ? 'password' : 'text'"
    :prepend-inner-icon="field.icon"
    :hint="field.hint"
    :persistent-hint="!!field.hint"
    :required="field.required"
    :rules="getRules(field)"
    :disabled="disabled"
    hide-details="auto"
    clearable
  >
    <template v-if="field.required" #label>
      <span class="mr-2 text-error">*</span>{{ field.label }}
    </template>
    <template v-if="field.type.includes('i18n')" #append-inner>
      <v-chip label size="x-small">
        {{ localeLabel }}
      </v-chip>
    </template>
  </v-text-field>

  <!-- NUMBER -->
  <v-number-input
    v-else-if="['i18n:number', 'number'].includes(field.type)"
    v-model.number="value"
    :label="field.label"
    :prepend-inner-icon="field.icon"
    :hint="field.hint"
    :persistent-hint="!!field.hint"
    :required="field.required"
    :rules="getRules(field)"
    :disabled="disabled"
    hide-details="auto"
    clearable
  >
    <template v-if="field.required" #label>
      <span class="mr-2 text-error">*</span>{{ field.label }}
    </template>
    <template v-if="field.type.includes('i18n')" #append-inner>
      <v-chip label size="x-small">
        {{ localeLabel }}
      </v-chip>
    </template>
  </v-number-input>

  <!-- WYSIWYG -->
  <div v-else-if="['wysiwyg', 'i18n:wysiwyg'].includes(field.type)">
    <FieldHeader :field="field" :locales="locales" :locale="locale" />
    <v-input
      v-if="value !== null"
      v-model="value"
      :label="field.label"
      :prepend-inner-icon="field.icon"
      :hint="field.hint"
      :persistent-hint="!!field.hint"
      :required="field.required"
      :rules="getRules(field)"
      :disabled="disabled"
      hide-details="auto"
      clearable
    >
      <div class="w-100 mb-12">
        <QuillEditor
          v-model="value"
          theme="snow"
          style="min-height: 100px"
        />
      </div>
    </v-input>
  </div>

  <!-- MARKDOWN -->
  <div v-else-if="['markdown', 'i18n:markdown'].includes(field.type)">
    <FieldHeader :field="field" :locales="locales" :locale="locale" />
    <v-input
      v-model="value"
      :label="field.label"
      :prepend-inner-icon="field.icon"
      :hint="field.hint"
      :persistent-hint="!!field.hint"
      :required="field.required"
      :rules="getRules(field)"
      :disabled="disabled"
      hide-details="auto"
      clearable
    >
      <vue-easymde
        v-if="value !== null"
        v-model="value"
        :disabled="disabled"
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
    v-model="value"
    :label="field.label"
    :required="field.required"
    :rules="getRules(field)"
    :disabled="disabled"
    hide-details="auto"
    clearable
  >
    <template v-if="field.required" #label>
      <span class="mr-2 text-error">*</span>{{ field.label }}
    </template>
    <template v-if="field.type.includes('i18n')" #append-inner>
      <v-chip label size="x-small">
        {{ localeLabel }}
      </v-chip>
    </template>
  </v-textarea>

  <!-- SELECT -->
  <v-autocomplete
    v-else-if="['select', 'i18n:select'].includes(field.type)"
    v-model="value"
    :label="field.label"
    :required="field.required"
    :rules="getRules(field)"
    :items="optionItems"
    :multiple="!!(field.multiple)"
    :disabled="disabled"
    hide-details="auto"
    clearable
  >
    <template v-if="field.required" #label>
      <span class="mr-2 text-error">*</span>{{ field.label }}
    </template>
    <template v-if="field.type.includes('i18n')" #append-inner>
      <v-chip label size="x-small">
        {{ localeLabel }}
      </v-chip>
    </template>
  </v-autocomplete>

  <!-- SWITCH -->
  <v-switch
    v-else-if="['switch', 'i18n:switch'].includes(field.type)"
    v-model="value"
    :label="field.label"
    :required="field.required"
    :rules="getRules(field)"
    :hint="field.hint"
    :persistent-hint="!!field.hint"
    :disabled="disabled"
    color="primary"
    hide-details="auto"
    inset
  >
    <template #label>
      <span v-if="field.required" class="mr-2 text-error">*</span>{{ field.label }}
      <v-chip
        v-if="field.type.includes('i18n')"
        label
        size="x-small"
        class="ml-4"
      >
        {{ localeLabel }}
      </v-chip>
    </template>
  </v-switch>

  <!-- CHECKBOX -->
  <div v-else-if="['checkbox', 'i18n:checkbox'].includes(field.type)">
    <FieldHeader :field="field" :locales="locales" :locale="locale" />
    <v-checkbox
      v-for="item in optionItems"
      :key="item.value"
      v-model="value"
      :label="item.title"
      :value="item.value"
      :required="field.required"
      :disabled="disabled"
      color="primary"
      hide-details="auto"
    />
  </div>

  <!-- RADIO -->
  <div v-else-if="['radio', 'i18n:radio'].includes(field.type)">
    <FieldHeader :field="field" :locales="locales" :locale="locale" />
    <v-radio-group
      v-model="value"
      :required="field.required"
      :rules="getRules(field)"
      :inline="field.inline"
      :disabled="disabled"
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
      />
    </v-radio-group>
  </div>

  <!-- DATE -->
  <v-menu
    v-else-if="['date', 'i18n:date'].includes(field.type)"
    v-model="showDatePicker"
    :close-on-content-click="false"
    :disabled="disabled"
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
        readonly
        hide-details="auto"
        clearable
        @click="showDatePicker = true"
        @click:clear="value = null"
      >
        <template v-if="field.required" #label>
          <span class="mr-2 text-error">*</span>{{ field.label }}
        </template>
        <template v-if="field.type.includes('i18n')" #append-inner>
          <v-chip label size="x-small">
            {{ localeLabel }}
          </v-chip>
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
  <div v-else-if="['file', 'i18n:file', 'image', 'i18n:image'].includes(field.type)">
    <FieldHeader :field="field" :locales="locales" :locale="locale" />
    <v-card v-if="typeof value === 'string'" variant="tonal" class="w-100">
      <div class="d-flex align-center">
        <div class="pa-3 pr-0">
          <v-icon v-if="!['image', 'i18n:image'].includes(field.type)" :icon="fileIcons[field.type]" :size="smAndDown ? 96 : 128" />
          <v-avatar v-else :size="smAndDown ? 96 : 128" rounded="0">
            <v-img :src="filePath">
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
        </div>
        <div class="pa-3 pl-0">
          <v-card-title
            :class="{
              'py-0 text-break text-truncate': true,
              'text-body-1': smAndDown,
            }"
            style="max-width: calc(200px)"
          >
            {{ value }}
          </v-card-title>
          <v-card-subtitle class="py-0 text-capitalize">
            {{ fileType }}
          </v-card-subtitle>
          <v-card-actions class="pb-0">
            <v-btn
              :disabled="disabled"
              color="error"
              variant="text"
              prepend-icon="mdi-trash-can-outline"
              @click="value = null"
            >
              Remove
            </v-btn>
          </v-card-actions>
        </div>
      </div>
    </v-card>
    <v-file-upload
      v-else
      v-model="fileValue"
      :label="field.label"
      :prepend-inner-icon="field.icon"
      :hint="field.hint"
      :persistent-hint="!!field.hint"
      :required="field.required"
      :rules="getRules(field)"
      :icon="smAndDown ? 'mdi-gesture-tap-button' : undefined"
      :title="smAndDown ? 'Touch to upload' : undefined"
      :disabled="disabled"
      hide-details="auto"
      density="compact"
      variant="compact"
      scrim="primary"
      clearable
      @update:model-value="onFileChange"
    >
      <template #item />
    </v-file-upload>
  </div>

  <!-- ARRAY -->
  <div v-else-if="field.type.includes('array')">
    <FieldHeader :field="field" :locales="locales" :locale="locale" />
    <ListBuilder
      v-model="value"
      :label="field.label"
      :required="field.required"
      :rules="getRules(field)"
      :default-item="getDefaultItem()"
      :disabled="disabled"
      class="d-flex flex-column"
      style="gap: 0.5rem"
      hide-details="auto"
      clearable
    >
      <template #default="{ item }">
        <div
          v-for="(key, keyIdx) in Object.keys(arrayFields)"
          :key="key"
          :class="{ 'mt-4': keyIdx > 0 }"
        >
          <FieldItem
            v-if="arrayFields[key].type.includes('i18n')"
            v-model="item[key][locale]"
            :field="arrayFields[key]"
            :locale="locale"
            :locales="locales"
            :structure="structure"
            :interface="model"
            :server-settings="serverSettings"
            :disabled="disabled"
          />
          <FieldItem
            v-else-if="arrayFields[key]"
            v-model="item[key].general"
            :field="arrayFields[key]"
            :locale="locale"
            :locales="locales"
            :structure="structure"
            :interface="model"
            :server-settings="serverSettings"
            :disabled="disabled"
          />
        </div>
      </template>
    </ListBuilder>
  </div>

  <!-- FALLBACK: FIELD NOT EXISTING -->
  <v-alert
    v-else
    class="mb-0"
    type="warning"
    variant="tonal"
  >
    This field type
    <v-chip size="x-small" label>
      {{ field.type }}
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
</style>
