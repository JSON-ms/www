<script setup lang="ts">
import draggable from 'vuedraggable'
import { generateHash } from '@/utils';
import { useGlobalStore } from '@/stores/global';
import { computed, ref } from 'vue';
import type { IField, IServerSettings } from '@/interfaces';

const globalStore = useGlobalStore();
const list = defineModel<any[]>({ required: true });
const {
  defaultItem,
  field,
  serverSettings,
  locale,
  disabled = false,
} = defineProps<{
  defaultItem: any,
  field: IField,
  serverSettings: IServerSettings,
  locale: string,
  disabled: boolean,
}>()

const panel = ref(null);

const formattedList = computed({
  get(): any[] {
    return list.value.map((item: any, itemIdx: number) => {
      let title;
      let thumbnail = false;
      for (const key in field.fields) {
        const fieldItem = field.fields[key];
        if (['string', 'i18n:string', 'i18n'].includes(fieldItem.type)) {
          if (fieldItem.type.includes('i18n')) {
            title = item[key][locale];
          } else {
            title = item[key];
          }
        }
        if (fieldItem.type === 'image' && typeof item[key] === 'object' && item[key] !== null && item[key].path) {
          thumbnail = serverSettings.publicUrl + item[key].path;
        }
        if (thumbnail && title) {
          break;
        }
      }
      return {
      ...item,
        __listBuilderTitle: title || 'Item #' + (itemIdx + 1),
        __listBuilderThumbnail: thumbnail,
      }
    })
  },
  set(items: any[]) {
    list.value = items;
  }
})

const addItem = () => {
  const newItem = structuredClone(defaultItem);
  newItem.hash = generateHash(8);
  list.value.push(newItem);
  panel.value = list.value.length - 1;
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
</script>

<template>
  <v-expansion-panels v-model="panel">
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
                  v-if="element.__listBuilderThumbnail"
                  :src="element.__listBuilderThumbnail"
                  height="32"
                  max-width="32"
                  class="my-n3"
                />
                {{ element.__listBuilderTitle }}
              </div>

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
            <slot
              name="default"
              :item="element"
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
