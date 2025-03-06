<script setup lang="ts">
import draggable from 'vuedraggable'
import { generateHash } from '@/utils';
import { useDisplay } from 'vuetify';

const { smAndDown } = useDisplay()
const list = defineModel<any[]>({ required: true });
const {
  defaultItem,
} = defineProps<{
  defaultItem: any
}>()
const addItem = () => {
  const newItem = structuredClone(defaultItem);
  newItem.hash = generateHash(8);
  list.value.push(newItem);
}
const removeItem = (index: number) => {
  list.value.splice(index, 1);
}
const canMoveUp = (index: number): boolean => {
  return index > 0;
}
const canMoveDown = (index: number): boolean => {
  return index < list.value.length - 1;
}
const moveUp = (index: number) => {
  if (canMoveUp(index)) {
    const temp = list.value[index - 1];
    list.value[index - 1] = list.value[index];
    list.value[index] = temp;
  }
}
const moveDown = (index: number) => {
  if (!canMoveDown) {
    return;
  }
  [list.value[index], list.value[index + 1]] = [list.value[index + 1], list.value[index]];
}
</script>

<template>
  <draggable
    v-model="list"
    item-key="hash"
    handle=".handle"
  >
    <template #item="{ element, index }">
      <v-row no-gutters>
        <v-col style="flex: 0" class="pt-4">
          <v-icon v-if="!smAndDown" class="handle" icon="mdi-drag-vertical" />
          <span v-else>{{ index + 1 }})</span>
        </v-col>
        <v-col style="flex: 1" class="mx-3">
          <slot
            name="default"
            :item="element"
            :index="index"
          />
        </v-col>
        <v-col style="flex: 0" class="pt-2">
          <v-btn
            color="error"
            size="small"
            variant="text"
            icon
            @click="() => removeItem(index)"
          >
            <v-icon icon="mdi-delete-outline" />
          </v-btn>
          <template v-if="smAndDown && list.length > 1">
            <v-btn
              :disabled="!canMoveUp(index)"
              size="small"
              variant="text"
              icon
              @click="() => moveUp(index)"
            >
              <v-icon icon="mdi-arrow-up" />
            </v-btn>
            <v-btn
              :disabled="!canMoveDown(index)"
              size="small"
              variant="text"
              icon
              @click="() => moveDown(index)"
            >
              <v-icon icon="mdi-arrow-down" />
            </v-btn>
          </template>
        </v-col>
      </v-row>
    </template>
    <template #footer>
      <v-btn
        :class="{
          'mt-4': list.length > 0
        }"
        color="primary"
        block
        @click="addItem"
      >
        Add
      </v-btn>
    </template>
  </draggable>
</template>

<style lang="scss" scoped>
.handle {
  cursor: grabbing;
}
</style>
