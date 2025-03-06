<script setup lang="ts">
import { computed } from 'vue';
import type { IInterface } from '@/interfaces';
import { useGlobalStore } from '@/stores/global';

const {
  interfaces = [],
  type = null,
  actions = false,
} = defineProps<{
  interfaces?: IInterface[],
  type?: 'admin' | 'interface' | null,
  actions?: boolean
}>();

const globalStore = useGlobalStore();

const selectedInterface = defineModel<IInterface>({ required: true });
const computedInterfaces = computed((): (IInterface | { header: string })[] => {
  const ownerInterfaces = interfaces.filter(item => item.created_by === globalStore.session.user.id);
  const sharedInterfaces = interfaces.filter(item => item.created_by !== globalStore.session.user.id && item.type === type);
  const results: (IInterface | { header: string })[] = [];
  const hasBoth = ownerInterfaces.length > 0 && sharedInterfaces.length > 0;
  if (hasBoth && ownerInterfaces.length > 0) {
    if (ownerInterfaces.length > 0) {
      results.push({
        header: 'Your template' + (ownerInterfaces.length === 1 ? '' : 's')
      })
    }
  }
  if (ownerInterfaces.length > 0) {
    results.push(...ownerInterfaces)
  }
  if (hasBoth && sharedInterfaces.length > 0) {
    if (sharedInterfaces.length > 0) {
      results.push({
        header: 'Shared template' + (sharedInterfaces.length === 1 ? '' : 's')
      })
    }
  }
  if (sharedInterfaces.length > 0) {
    results.push(...sharedInterfaces)
  }
  return results;
})

const emit = defineEmits(['change', 'create', 'save', 'delete'])
const onChange = (item: IInterface) => {
  emit('change', item);
}
const create = (item: IInterface) => {
  emit('create', item);
}
const save = (item: IInterface) => {
  emit('save', item);
}
const remove = (item: IInterface) => {
  emit('delete', item);
}
</script>

<template>
  <v-select
    v-model="selectedInterface"
    :items="computedInterfaces"
    :prepend-inner-icon="selectedInterface.type === 'owner' ? 'mdi-list-box-outline' : 'mdi-folder-account-outline'"
    item-title="label"
    item-value="hash"
    label="Interface"
    variant="outlined"
    color="primary"
    hide-details
    return-object
    density="compact"
    no-data-text="No interface available yet"
    @update:model-value="onChange"
  >
    <template v-if="actions" #append-inner>

      <!-- CREATE -->
      <v-tooltip
        text="New interface"
        location="bottom"
      >
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            color="secondary"
            size="small"
            icon
            @mousedown.stop="create"
          >
            <v-icon icon="mdi-file-plus" />
          </v-btn>
        </template>
      </v-tooltip>

      <!-- SAVE -->
      <v-tooltip
        text="Save"
        location="bottom"
      >
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            variant="text"
            color="primary"
            size="small"
            icon
            @mousedown.stop.prevent="save"
          >
            <v-icon icon="mdi-content-save" />
          </v-btn>
        </template>
      </v-tooltip>

      <!-- DELETE -->
      <v-tooltip
        text="Delete"
        location="bottom"
      >
        <template #activator="{ props }">
          <v-btn
            v-if="selectedInterface.type === 'owner'"
            v-bind="props"
            color="error"
            size="small"
            icon
            @mousedown.stop.prevent="remove"
          >
            <v-icon>mdi-delete-outline</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
    </template>

    <!-- ITEM SLOT -->
    <template #item="{ props, item }">
      <v-list-item v-if="item.value.header" class="py-2" style="min-height: 0">
        <v-list-item-subtitle>
          {{ item.value.header }}
        </v-list-item-subtitle>
      </v-list-item>
      <v-list-item
        v-else
        v-bind="props"
        :subtitle="item.raw.updated_at"
        :title="item.raw.label"
        :prepend-icon="item.raw.type === 'owner' ? 'mdi-list-box-outline' : 'mdi-folder-account-outline'"
      ></v-list-item>
    </template>
  </v-select>
</template>
