<script setup lang="ts">
const visible = defineModel<boolean>({ required: true });
const { title, prependIcon } = defineProps<{
  title?: string,
  prependIcon?: string,
  color?: string,
  text?: string,
}>();
</script>

<template>
  <v-dialog
    v-model="visible"
    v-bind="$attrs"
  >
    <v-card
      :title="title"
      :text="text"
      :color="color"
      :prepend-icon="prependIcon"
    >
      <template #append>
        <div class="d-flex align-center" style="gap: 1rem">
          <slot name="append"></slot>
          <v-btn size="x-small" icon variant="flat" @click="visible = false">
            <v-icon icon="mdi-close" size="large" />
          </v-btn>
        </div>
      </template>
      <slot />
    </v-card>
  </v-dialog>
</template>
