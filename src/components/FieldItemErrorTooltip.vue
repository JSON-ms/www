<script setup lang="ts">
import {useUserData} from "@/composables/user-data";
import {computed, ref, watch} from "vue";
import type {IField} from "@/interfaces";

interface IFieldError {
  i18n: string[],
  currentI18n: string[],
  general: string[],
}

const value = defineModel<any>({ required: true });
const {
  fields,
  fieldKey,
  locale,
  locales,
  index,
} = defineProps<{
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
    const items = errors.value.currentI18n[0].split('.');
    return `${fields[items[items.length - 2]].label} field has an issue`;
  } else if (errors.value.i18n.length > 0) {
    const items = errors.value.i18n[0].split('.');
    const key = items.pop();
    const field = items.pop();
    if (field && key) {
      return `${fields[field].label} field has an issue in ${locales[key]}`
    }
  }
  return null;
});

const errors = ref<IFieldError>({
  i18n: [],
  currentI18n: [],
  general: [],
});
watch([() => fieldKey, () => value.value], () => {
  const allErrors = Object.keys(getUserDataErrors(fields, fieldKey + (index ? '[' + index + ']' : '')));
  const i18n = allErrors.filter(item => Object.keys(locales).find(subLocale => item.endsWith(subLocale)));
  errors.value = {
    i18n,
    currentI18n: i18n.filter(item => item.endsWith(locale)),
    general: allErrors.filter(item => Object.keys(locales).every(subLocale => item.endsWith(subLocale))),
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
