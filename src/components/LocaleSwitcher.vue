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
        <slot name="prepend-inner-selection">
          <v-icon icon="mdi-translate-variant" />
        </slot>
        <v-icon end icon="mdi-chevron-down" />
      </v-btn>
    </template>
    <v-list color="primary">
      <v-list-item
        v-for="locale in locales"
        :key="locale.value"
        :active="selectedLocale === locale.value"
        @click="selectedLocale = locale.value"
      >
        {{ locale.title }}

        <template #prepend>
          <slot name="prepend-inner-item" :item="locale"></slot>
        </template>
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
    width="10rem"
    density="compact"
  >
    <template #prepend-inner>
      <slot name="prepend-inner-selection"></slot>
    </template>
    <template #item="{ props: itemProps, item }">
      <v-list-item
        v-bind="itemProps"
      >
        <template #prepend>
          <slot name="prepend-inner-item" :item="item"></slot>
        </template>
      </v-list-item>
    </template>
  </v-select>
</template>
