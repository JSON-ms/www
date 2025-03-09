<script setup lang="ts">
interface ILocale {
  value: string
  title: string
}
const selectedLocale = defineModel({ type: String, default: null })
const { locales, dense = false, disabled = false } = defineProps<{
  locales: ILocale[],
  dense?: boolean,
  disabled: boolean,
}>();
</script>

<template>
  <v-menu v-if="dense">
    <template #activator="{ props }">
      <v-btn v-bind="props" variant="text">
        <v-icon icon="mdi-translate-variant" />
        <v-icon end icon="mdi-chevron-down" />
      </v-btn>
    </template>
    <v-list color="primary" width="200">
      <v-list-item
        v-for="locale in locales"
        :key="locale.value"
        :active="selectedLocale === locale.value"
        @click="selectedLocale = locale.value"
      >
        {{ locale.title }}
      </v-list-item>
    </v-list>
  </v-menu>
  <v-select
    v-else
    v-model="selectedLocale"
    :items="locales"
    :disabled="disabled"
    label="Locale"
    hide-details
    density="compact"
  />
</template>
