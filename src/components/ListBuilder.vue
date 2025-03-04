<script setup lang="ts">
import draggable from 'vuedraggable'

const list = defineModel<any[]>({ required: true });
const addItem = () => {
  list.value.push({

  });
}
</script>

<template>
  <draggable v-model="list" tag="transition-group" item-key="id">
    <template #item="{ element }">
      <div> {{ element.name }} </div>
    </template>
    <template #footer>
      <v-btn
        color="primary"
        block
        @click="addItem"
      >
        Add
      </v-btn>
    </template>
  </draggable>
</template>

