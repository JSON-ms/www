<script setup lang="ts">
const src = defineModel<string>('src', { required: true });
</script>

<template>
  <v-img
    v-bind="$attrs"
    :src="src"
    class="transparent-grid"
  >
    <template #error>
      <div class="d-flex px-2 align-center justify-center fill-height flex-column">
        <v-icon color="warning" size="32" icon="mdi-alert-outline" />
        <div class="text-caption text-disabled mt-1" style="line-height: 1rem">
          Unable to load image
        </div>
      </div>
    </template>
    <template #placeholder>
      <div class="d-flex align-center justify-center fill-height">
        <v-progress-circular
          color="primary"
          indeterminate
          size="32"
          width="2"
        />
      </div>
    </template>
  </v-img>
</template>

<style scoped lang="scss">
.transparent-grid {
  background-image:
    linear-gradient(to right, rgba(0, 0, 0, 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
  background-color: rgba(0, 0, 0, 0.1);
  background-size: 1rem 1rem;
  background-position: -1px -1px;
  background-repeat: repeat;
}
</style>
