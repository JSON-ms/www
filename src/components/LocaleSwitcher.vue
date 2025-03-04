<script setup lang="ts">
interface ILocale {
  value: string
  title: string
}
const selectedLocale = defineModel({ type: String, default: null })
const { locales } = defineProps<{
  locales: ILocale[]
}>();
</script>

<template>
  <v-select
    v-model="selectedLocale"
    :items="locales"
    label="Locale"
    hide-details
    density="compact"
  />
</template>
