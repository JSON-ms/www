<script setup lang="ts">
import ListBuilder from '@/components/ListBuilder.vue';
import FieldHeader from '@/components/FieldHeader.vue';
import type {IInterfaceData, IField, IServerSettings, IInterface} from '@/interfaces';
import Rules from '@/rules';
import {deepToRaw, parseFields, phpStringSizeToBytes} from '@/utils';
import { computed, ref } from 'vue';
import { Services } from '@/services';
import { mimeTypes, useGlobalStore } from '@/stores/global';
import { useDisplay } from 'vuetify';
import type { VFileUpload } from 'vuetify/labs/VFileUpload';
import {useUserData} from '@/composables/user-data';

const { smAndDown } = useDisplay()
const globalStore = useGlobalStore();
const value = defineModel<any>({ required: true });
const {
  field,
  fieldKey,
  userData,
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
  userData: any,
  locale: string,
  locales: { [key: string]: string; },
  structure: IInterfaceData,
  interface: IInterface,
  serverSettings: IServerSettings,
  disabled?: boolean,
  loading?: boolean,
}>();

const model = ref(interfaceModel);
const { getUserDataErrors } = useUserData(model, userData);
const fileUpload = ref<VFileUpload>();
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
const acceptMimeTypes = computed((): string | undefined => {
  if (field.accept) {
    return Array.isArray(field.accept) ? field.accept.join(',') : field.accept;
  }
  if (field.type === 'image') {
    return mimeTypes.images.join(',');
  }
  if (field.type === 'video') {
    return mimeTypes.videos.join(',');
  }
  return undefined;
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
  return parseFields(structuredClone(deepToRaw(arrayFields.value) || {}), locales);
}

const downloading = ref(false);
const onDownloadFile = () => {
  downloading.value = true;
  fetch(filePath.value)
    .then(response => response.blob())
    .then(blob => {
      const parsedUrl = new URL(filePath.value);
      const pathSegments = parsedUrl.pathname.split('/');
      const filename = pathSegments[pathSegments.length - 1];
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    })
    .catch(globalStore.catchError)
    .finally(() => downloading.value = false);
}
const onRemoveFile = () => {
  globalStore.setPrompt({
    ...globalStore.prompt,
    visible: true,
    title: 'Remove file',
    body: 'Are you sure you want to remove this file? The file won\'t be deleted and will remain on the server, but it will not be accessible once modifications are saved.',
    btnText: 'Remove',
    btnIcon: 'mdi-close',
    btnColor: 'warning',
    callback: () => new Promise(resolve => {
      value.value = null;
      resolve();
    })
  });
}

const uploading = ref(false);
const uploadProgress = ref(0);
const onFileChange = (file: File | File[] | null) => {
  if (file && interfaceModel.server_url && Rules.isUrl(interfaceModel.server_url) && !Array.isArray(file)) {
    if (file.size > phpStringSizeToBytes(serverSettings.uploadMaxSize)) {
      globalStore.catchError(new Error(
        'This file is exceeding the maximum size of ' + serverSettings.uploadMaxSize + ' defined by the server.'
      ));
    } else {
      uploading.value = true;
      uploadProgress.value = 0;
      Services.upload(interfaceModel.server_url, file, progress => uploadProgress.value = progress, {
        'X-Jms-Interface-Hash': interfaceModel.hash,
        'X-Jms-Api-Key': interfaceModel.server_secret,
      })
        .then(response => value.value = {
          'path': response.internalPath,
          'meta': response.meta,
        })
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
const isImage = computed((): string => {
  return ['image', 'i18n:image'].includes(field.type)
    || value.value?.meta.type.includes('image');
})
const isVideo = computed((): string => {
  return ['video', 'i18n:video'].includes(field.type)
    || value.value?.meta.type.includes('video');
})
const filePath = computed((): string => {
  return serverSettings.publicUrl + value.value?.path;
})
const showPrependInner = computed((): boolean => {
  return !!(field['prepend-inner']);
})
const showAppendInner = computed((): boolean => {
  return field.type.includes('i18n') || !!(field['append-inner']);
})
const fileIcons: {[key: string]: string} = {
  'i18n:file': 'mdi-file-outline',
  'file': 'mdi-file-outline',
  'i18n:video': 'mdi-video-outline',
  'video': 'mdi-video-outline',
}

const getErrors = (index: number): { i18n: string[], currentI18n?: string, general: boolean } => {
  const allErrors = Object.keys(getUserDataErrors(field.fields, fieldKey + '[' + index + ']'));
  const i18n = allErrors.filter(item => Object.keys(locales).find(subLocale => item.endsWith(subLocale)));
  return {
    i18n,
    currentI18n: i18n.find(item => item.endsWith(locale)),
    general: allErrors.filter(item => Object.keys(locales).every(subLocale => item.endsWith(subLocale))).length !== allErrors.length,
  }
}

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
        v-if="field.type.includes('i18n')"
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
    v-else-if="['i18n:number', 'number'].includes(field.type)"
    v-model.number="value"
    :label="field.label"
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
      <span class="text-no-wrap ml-3 mr-2">{{ field['prepend-inner'] }}</span>
    </template>
    <template v-if="showAppendInner" #append-inner>
      <span v-if="field['append-inner']" class="text-no-wrap mr-6">{{ field['append-inner'] }}</span>
      <v-tooltip
        v-if="field.type.includes('i18n')"
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
  <div v-else-if="['wysiwyg', 'i18n:wysiwyg'].includes(field.type)">
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
          v-model="value"
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
  <div v-else-if="['markdown', 'i18n:markdown'].includes(field.type)">
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
        v-if="value !== null"
        v-model="value"
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
        v-if="field.type.includes('i18n')"
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
    v-else-if="['select', 'i18n:select'].includes(field.type)"
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
        v-if="field.type.includes('i18n')"
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
    v-else-if="['switch', 'i18n:switch'].includes(field.type)"
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
        v-if="field.type.includes('i18n')"
        text="Translatable"
        location="bottom"
      >
        <template #activator="{ props }">
          <v-icon v-bind="props" size="small" icon="mdi-translate-variant" />
        </template>
      </v-tooltip>
    </template>
  </v-switch>

  <!-- RATING -->
  <div v-else-if="['rating', 'i18n:rating'].includes(field.type)">
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
      color="primary"
      hide-details="auto"
      inset
    />
  </div>

  <!-- CHECKBOX -->
  <div v-else-if="['checkbox', 'i18n:checkbox'].includes(field.type)">
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
  <div v-else-if="['radio', 'i18n:radio'].includes(field.type)">
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
    v-else-if="['date', 'i18n:date'].includes(field.type)"
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
            v-if="field.type.includes('i18n')"
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
  <v-input
    v-else-if="['file', 'i18n:file', 'image', 'i18n:image', 'video', 'i18n:video'].includes(field.type)"
    v-model="value"
    :hint="field.hint"
    :persistent-hint="!!field.hint"
    :required="field.required"
    :rules="getRules(field)"
    :disabled="disabled"
    hide-details="auto"
  >
    <div class="w-100">
      <FieldHeader v-model="value" :field="field" :field-key="fieldKey" />
      <v-card v-if="typeof value === 'object' && value !== null && value.path" variant="tonal" class="w-100">
        <div class="d-flex align-center">
          <div class="pa-3 pr-0">
            <v-avatar v-if="isImage" :size="smAndDown ? 96 : 128" rounded="0">
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
            <video v-else-if="isVideo" :src="filePath" :style="{ height: smAndDown ? '96px' : '128px', float: 'left' }" controls />
            <v-icon v-else-if="['file', 'i18n:file'].includes(field.type)" :icon="fileIcons[field.type]" :size="smAndDown ? 96 : 128" />
          </div>
          <div class="pa-3 pl-0 w-100">
            <v-card-title
              :class="{
                'py-0 d-flex': true,
                'text-body-1': smAndDown,
              }"
            >
              <div class="d-flex" style="flex: 1; width: 0">
                <span class="text-truncate">{{ value.path }}</span>
              </div>
            </v-card-title>
            <v-card-subtitle class="py-0" style="font-size: 0.66rem">
              Size: {{ $formatBytes(value.meta.size) }}
              <br>Type: <span class="text-uppercase">{{ value.meta.type }}</span>
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
                    @click="onDownloadFile"
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
                    @click="onRemoveFile"
                  >
                    <v-icon icon="mdi-trash-can-outline" />
                  </v-btn>
                </template>
              </v-tooltip>
            </v-card-actions>
          </div>
        </div>
      </v-card>
      <div v-else class="position-relative">
        <v-overlay :model-value="uploading" contained absolute class="align-center justify-center" persistent>
          <v-progress-circular color="primary" indeterminate />
        </v-overlay>
        <v-file-upload
          ref="fileUpload"
          v-model="fileValue"
          :label="field.label"
          :prepend-inner-icon="field.icon"
          :hint="field.hint"
          :persistent-hint="!!field.hint"
          :required="field.required"
          :rules="getRules(field)"
          :icon="uploading ? 'mdi-' :smAndDown ? 'mdi-gesture-tap-button' : undefined"
          :title="uploading ? '' : smAndDown ? 'Touch to upload' : undefined"
          :disabled="disabled"
          :loading="loading"
          :accept="acceptMimeTypes"
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
    </div>
  </v-input>

  <!-- ARRAY -->
  <div v-else-if="field.type.includes('array')">
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
      class="d-flex flex-column"
      style="gap: 0.5rem"
      hide-details="auto"
      clearable
    >
      <template #actions="{ index }">
        <v-icon v-if="getErrors(index).general || getErrors(index).currentI18n" icon="mdi-alert" color="warning" />
        <v-icon v-else-if="!getErrors(index).currentI18n && getErrors(index).i18n.length > 0 && getErrors(index).general" icon="mdi-alert-outline" />
      </template>
      <template #default="{ item, index }">
        <div
          v-for="(key, keyIdx) in Object.keys(arrayFields)"
          :key="key"
          :class="{ 'mt-4': keyIdx > 0 }"
        >
          <FieldItem
            v-if="arrayFields[key].type.includes('i18n')"
            v-model="item[key][locale]"
            :field="arrayFields[key]"
            :field-key="fieldKey + '[' + index + '].' + key"
            :user-data="userData"
            :locale="locale"
            :locales="locales"
            :structure="structure"
            :interface="interfaceModel"
            :server-settings="serverSettings"
            :disabled="disabled"
            :loading="loading"
          />
          <FieldItem
            v-else-if="arrayFields[key]"
            v-model="item[key]"
            :field="arrayFields[key]"
            :field-key="fieldKey + '.' + '[' + index + '].' + key"
            :user-data="userData"
            :locale="locale"
            :locales="locales"
            :structure="structure"
            :interface="interfaceModel"
            :server-settings="serverSettings"
            :disabled="disabled"
            :loading="loading"
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
.vue-easymde-editor .CodeMirror-scroll {
  min-height: 6rem !important;
  max-height: 40vh !important;
}
</style>
