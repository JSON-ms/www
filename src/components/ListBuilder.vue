<script setup lang="ts">
import draggable from 'vuedraggable'
import {generateHash} from '@/utils';
import { useGlobalStore } from '@/stores/global';
import {computed, ref} from 'vue';
import ImgTag from "@/components/ImgTag.vue";

const globalStore = useGlobalStore();
const list = defineModel<any[]>({ required: true });
const {
  defaultItem = null,
  disabled = false,
  collapsable = false,
  canAdd = true,
  canRemove = true,
  min = 0,
  max = 1e10,
  removeItemCallback = null,
  onCollapsableHeader = () => ({ title: 'Item', thumbnail: null }),
} = defineProps<{
  defaultItem?: any,
  disabled?: boolean,
  collapsable?: boolean,
  canAdd?: boolean,
  canRemove?: boolean,
  min?: number,
  max?: number,
  removeItemCallback?: (index: number, list: any[]) => void
  onCollapsableHeader?: (item: any, index: number) => ({ title: string, thumbnail: string | boolean})
}>()

const panel = ref<null | number>(null);

const computedCanAdd = computed((): boolean => {
  return !disabled && canAdd && max > list.value.length;
})
const computedCanRemove = computed((): boolean => {
  return !disabled && canRemove && min < list.value.length
})

const addItem = () => {
  if (!computedCanAdd.value) {
    return;
  }
  const newItem = structuredClone(defaultItem);
  newItem.hash = generateHash(8);
  list.value.push(newItem);
  panel.value = list.value.length - 1;
}
const removeItem = (index: number) => {
  if (!computedCanRemove.value) {
    return;
  }
  if (typeof removeItemCallback === 'function') {
    removeItemCallback(index, list.value);
  } else {
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
}

const hasOnlyOneField = computed((): boolean => {
  // Is lower than 2 because we inject {hash} property in the array.
  return list.value.length > 0 && Object.keys(list.value[0]).length <= 2;
})

const formattedList = computed({
  get(): any[] {
    return list.value;
  },
  set(items: any[]) {
    list.value.length = 0
    list.value.push(...items);
  }
})
</script>

<template>
  <draggable
    v-if="!collapsable"
    v-model="formattedList"
    :animation="200"
    item-key="hash"
    handle=".handle"
    class="draggable-list"
  >
    <template #item="{ index }">
      <div
        :class="['d-flex', {
          'align-center': hasOnlyOneField,
          'align-start': !hasOnlyOneField,
        }]"
        style="gap: 1rem"
      >
        <v-icon class="handle" icon="mdi-drag-vertical px-4 ml-n3" @mousedown.stop />
        <div style="flex: 1">
          <slot
            name="default"
            :item="list[index]"
            :index="index"
          />
        </div>

        <v-btn
          :disabled="!computedCanRemove"
          :color="computedCanRemove ? 'error' : undefined"
          size="small"
          variant="text"
          icon
          @click.stop="() => removeItem(index)"
        >
          <v-icon icon="mdi-delete-outline" />
        </v-btn>
      </div>
    </template>
    <template #footer>
      <v-btn
        v-if="canAdd"
        :disabled="!computedCanAdd"
        :class="{
          'mt-4': list.length > 0
        }"
        :color="computedCanAdd ? 'primary' : undefined"
        block
        variant="outlined"
        @click="addItem"
      >
        Add
      </v-btn>
    </template>
  </draggable>
  <v-expansion-panels v-else v-model="panel">
    <draggable
      v-model="formattedList"
      :animation="200"
      item-key="hash"
      handle=".handle"
    >
      <template #item="{ element, index }">
        <v-expansion-panel>
          <template #title>
            <div class="d-flex align-center justify-space-between w-100 pr-3" style="gap: 1rem">
              <div class="d-flex align-center justify-start" style="flex: 1; gap: 1rem">
                <v-icon class="handle" icon="mdi-drag-vertical px-4 ml-n3" @mousedown.stop />
                <ImgTag
                  v-if="onCollapsableHeader(element, index).thumbnail"
                  :src="onCollapsableHeader(element, index).thumbnail || ''"
                  width="32"
                  height="32"
                  max-width="32"
                  class="my-n3 rounded"
                />
                <div class="d-flex" style="flex: 1; width: 0">
                  <span class="text-truncate">
                    {{ onCollapsableHeader(element, index).title }}
                  </span>
                </div>
              </div>

              <slot
                name="actions"
                :item="list[index]"
                :index="index"
              />

              <v-btn
                :disabled="!computedCanRemove"
                :color="computedCanRemove ? 'error' : undefined"
                size="small"
                variant="text"
                icon
                class="my-n3"
                @click.stop="() => removeItem(index)"
              >
                <v-icon icon="mdi-delete-outline" />
              </v-btn>
            </div>
          </template>
          <template #text>
            <!-- DO NOT RETURN ELEMENT, it is NOT the correct reference! -->
            <slot
              name="default"
              :item="list[index]"
              :index="index"
            />
          </template>
        </v-expansion-panel>
      </template>
      <template #footer>
        <v-btn
          v-if="canAdd"
          :disabled="!computedCanAdd"
          :class="{
            'mt-3': list.length > 0
          }"
          :color="computedCanAdd ? 'primary' : undefined"
          variant="outlined"
          block
          @click="addItem"
        >
          Add
        </v-btn>
      </template>
    </draggable>
  </v-expansion-panels>
</template>

<style lang="scss" scoped>
.handle {
  cursor: grabbing;
}
.draggable-list > *:not(:first-child) {
  margin-top: 0.25rem;
}
</style>
