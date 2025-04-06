<script setup lang="ts">
import draggable from 'vuedraggable'
import {generateHash} from '@/utils';
import { useGlobalStore } from '@/stores/global';
import {computed, ref} from 'vue';

const globalStore = useGlobalStore();
const list = defineModel<any[]>({ required: true });
const {
  defaultItem,
  disabled = false,
  collapsable = false,
  removeItemCallback = () => ({}),
  onCollapsableHeader = () => ({ title: 'Item', thumbnail: null }),
} = defineProps<{
  defaultItem: any,
  disabled?: boolean,
  collapsable?: boolean,
  removeItemCallback?: (index: number, list: any[]) => void
  onCollapsableHeader?: (item: any, index: number) => ({ title: string, thumbnail: string | boolean})
}>()

const panel = ref<null | number>(null);

const addItem = () => {
  const newItem = structuredClone(defaultItem);
  newItem.hash = generateHash(8);
  list.value.push(newItem);
  panel.value = list.value.length - 1;
}
const removeItem = (index: number) => {
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

const formattedList = computed({
  get(): any[] {
    return list.value;
  },
  set(items: any[]) {
    console.log(items);
    list.value.length = 0
    list.value.push(...items);
  }
})
</script>

<template>
  <draggable
    v-if="!collapsable"
    v-model="formattedList"
    item-key="hash"
    handle=".handle"
  >
    <template #item="{ index }">
      <div class="d-flex align-start" :style="['gap: 1rem', { marginTop: index > 0 ? '1rem' : 0 }]">
        <slot
          name="default"
          :item="list[index]"
          :index="index"
        />

        <v-btn
          :disabled="disabled"
          color="error"
          size="small"
          variant="text"
          class="mt-3"
          icon
          @click.stop="() => removeItem(index)"
        >
          <v-icon icon="mdi-delete-outline" />
        </v-btn>
      </div>
    </template>
    <template #footer>
      <v-btn
        :disabled="disabled"
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
  <v-expansion-panels v-else v-model="panel">
    <draggable
      v-model="formattedList"
      item-key="hash"
      handle=".handle"
    >
      <template #item="{ element, index }">
        <v-expansion-panel>
          <template #title>
            <div class="d-flex align-center justify-space-between w-100 pr-3" style="gap: 1rem">
              <div class="d-flex align-center justify-start" style="flex: 1; gap: 1rem">
                <v-icon class="handle" icon="mdi-drag-vertical px-4 ml-n3" @mousedown.stop />
                <v-img
                  v-if="onCollapsableHeader(element, index).thumbnail"
                  :src="onCollapsableHeader(element, index).thumbnail || ''"
                  width="32"
                  height="32"
                  max-width="32"
                  class="my-n3"
                />
                <div class="d-flex" style="flex: 1; width: 0">
                  <span class="text-truncate">{{ onCollapsableHeader(element, index).title }}</span>
                </div>
              </div>

              <slot
                name="actions"
                :item="list[index]"
                :index="index"
              />

              <v-btn
                :disabled="disabled"
                color="error"
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
          :disabled="disabled"
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
  </v-expansion-panels>
</template>

<style lang="scss" scoped>
.handle {
  cursor: grabbing;
}
</style>
