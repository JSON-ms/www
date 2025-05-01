<script setup lang="ts">
import {useUserData} from "@/composables/user-data";
import {computed, ref, watch} from "vue";
import type {IField, IStructureData} from '@/interfaces';
import {getDataByPath, getFieldByPath} from "@/utils";

interface IFieldError {
  i18n: string[],
  currentI18n: string[],
  general: string[],
}

const value = defineModel<any>({ required: true });
const {
  root,
  parent,
  fields,
  fieldKey,
  locale,
  locales,
  index,
} = defineProps<{
  root: IStructureData
  parent: IField,
  fields: {[key: string]: IField },
  fieldKey: string,
  locale: string,
  locales: { [key: string]: string; },
  index?: number,
}>();

const { getUserDataErrors } = useUserData();

const errorMessage = computed((): string | null => {
  if (errors.value.general.length > 0) {
    const item = errors.value.general[0].split('.').pop();
    if (item) {
      return `${fields[item].label} field has an issue`;
    }
  } else if (errors.value.currentI18n.length > 0) {
    const errorField = getFieldByPath(root.sections, errors.value.currentI18n[0]);
    return `${errorField.label} field has an issue`;
  } else if (errors.value.i18n.length > 0) {
    const items = errors.value.i18n[0].split('.');
    const key = items.pop();
    const errorField = getFieldByPath(root.sections, errors.value.i18n[0]);
    if (errorField && key) {
      return `${errorField.label} field has an issue in ${locales[key]}`
    }
  }
  return null;
});

const errors = ref<IFieldError>({
  i18n: [],
  currentI18n: [],
  general: [],
});
watch([() => fieldKey, () => value.value, () => locale.value], () => {
  const userDataErrors = getUserDataErrors(
    fields,
    fieldKey + (index ? '[' + index + ']' : ''),
    parent,
  );
  const allErrorKeys = Object.keys(userDataErrors);
  const i18n = allErrorKeys.filter(item => Object.keys(locales).find(subLocale => item.endsWith(subLocale)));
  errors.value = {
    i18n,
    currentI18n: i18n.filter(item => item.endsWith(locale)),
    general: allErrorKeys.filter(item => Object.keys(locales).every(subLocale => item.endsWith(subLocale))),
  }
}, { immediate: true, deep: true })

</script>

<template>
  <v-tooltip
    v-if="errors.general.length > 0 || errors.currentI18n.length > 0"
    :text="errorMessage || ''"
    location="bottom"
  >
    <template #activator="{ props }">
      <v-icon v-bind="props" icon="mdi-alert" color="warning" />
    </template>
  </v-tooltip>
  <v-tooltip
    v-else-if="errors.i18n.length > 0"
    :text="errorMessage || ''"
    location="bottom"
  >
    <template #activator="{ props }">
      <v-icon v-bind="props" icon="mdi-alert-outline" color="warning" />
    </template>
  </v-tooltip>
</template>
