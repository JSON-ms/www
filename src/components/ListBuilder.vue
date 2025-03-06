<script setup lang="ts">
import draggable from 'vuedraggable'
import { generateHash } from '@/utils';
import { useDisplay } from 'vuetify';
import { useGlobalStore } from '@/stores/global';

const globalStore = useGlobalStore();
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
  globalStore.setPrompt({
    ...globalStore.prompt,
    visible: true,
    title: 'Remove item',
    body: 'Are you sure you want to remove this item?',
    btnText: 'Remove',
    btnIcon: 'mdi-delete-outline',
    btnColor: 'error',
    callback: () => new Promise(resolve => {
      list.value.splice(index, 1);
      resolve();
    })
  })
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
      <v-container
        :class="{
          'pa-0': true,
          'mt-4': !smAndDown && list.length > 0,
        }"
        fluid
      >
        <template v-if="smAndDown && list.length > 0">
          <v-divider class="my-4 mt-3" />
          <v-row class="mb-0">
            <v-col cols="12">
              <div class="d-flex align-center justify-space-between" style="gap: 0.5rem">
                <h3>
                  <v-icon icon="mdi-circle-edit-outline" start />
                  Item #{{ index + 1 }}
                </h3>
                <div>
                  <v-tooltip location="bottom" text="Remove item">
                    <template #activator="{ props }">
                      <v-btn
                        v-bind="props"
                        color="error"
                        size="small"
                        variant="text"
                        icon
                        @click="() => removeItem(index)"
                      >
                        <v-icon icon="mdi-delete-outline" />
                      </v-btn>
                    </template>
                  </v-tooltip>

                  <template v-if="list.length > 1">
                    <v-tooltip location="bottom" text="Move up">
                      <template #activator="{ props }">
                        <v-btn
                          v-bind="props"
                          :disabled="!canMoveUp(index)"
                          size="small"
                          variant="text"
                          icon
                          @click="() => moveUp(index)"
                        >
                          <v-icon icon="mdi-arrow-up" />
                        </v-btn>
                      </template>
                    </v-tooltip>
                    <v-tooltip location="bottom" text="Move down">
                      <template #activator="{ props }">
                        <v-btn
                          v-bind="props"
                          :disabled="!canMoveDown(index)"
                          size="small"
                          variant="text"
                          icon
                          @click="() => moveDown(index)"
                        >
                          <v-icon icon="mdi-arrow-down" />
                        </v-btn>
                      </template>
                    </v-tooltip>
                  </template>
                </div>
              </div>
            </v-col>
          </v-row>
        </template>
        <v-row no-gutters>
          <v-col v-if="!smAndDown" style="flex: 0" class="pt-4 mr-3">
            <v-icon class="handle" icon="mdi-drag-vertical" />
          </v-col>
          <v-col style="flex: 1">
            <slot
              name="default"
              :item="element"
              :index="index"
            />
          </v-col>
          <v-col v-if="!smAndDown" style="flex: 0" class="pt-2 ml-3">
            <v-btn
              color="error"
              size="small"
              variant="text"
              icon
              @click="() => removeItem(index)"
            >
              <v-icon icon="mdi-delete-outline" />
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
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
