<script setup lang="ts">
import {computed} from 'vue';
import { useGlobalStore } from '@/stores/global';
import InterfaceModel from '@/models/interface.model';
import type {IInterface} from '@/interfaces';
import {deepToRaw} from '@/utils';

// Props
const interfaceModel = defineModel<InterfaceModel>({ required: true });
const states = interfaceModel.value.states;
const {
  interfaces = [],
  type = null,
  actions = false,
  canSave = false,
  largeText = false,
} = defineProps<{
  interfaces: IInterface[],
  type: 'admin' | 'interface' | null,
  actions?: boolean,
  canSave?: boolean,
  largeText?: boolean,
}>();

// Declarations
const globalStore = useGlobalStore();

// Emits
const emit = defineEmits(['change', 'create', 'save', 'delete'])
const create = (item: InterfaceModel) => emit('create', item);
const save = (item: InterfaceModel) => emit('save', item);
const remove = (item: InterfaceModel) =>  emit('delete', item);

// Computed
const computedInterfaces = computed((): (IInterface | { header: string })[] => {
  const results: (IInterface | { header: string })[] = [];
  const ownerInterfaces = interfaces.filter(item => item.created_by === globalStore.session.user.id);
  const sharedInterfaces = interfaces.filter(item => item.created_by !== globalStore.session.user.id && item.type === type);
  const hasBoth = ownerInterfaces.length > 0 && sharedInterfaces.length > 0;
  if (hasBoth && ownerInterfaces.length > 0) {
    if (ownerInterfaces.length > 0) {
      results.push({
        header: 'Your template' + (ownerInterfaces.length === 1 ? '' : 's')
      })
    }
  }
  if (ownerInterfaces.length > 0) {
    results.push(...ownerInterfaces.map(item => deepToRaw(item)))
  }
  if (hasBoth && sharedInterfaces.length > 0) {
    if (sharedInterfaces.length > 0) {
      results.push({
        header: 'Shared template' + (sharedInterfaces.length === 1 ? '' : 's')
      })
    }
  }
  if (sharedInterfaces.length > 0) {
    results.push(...sharedInterfaces.map(item => deepToRaw(item)))
  }
  return results;
})

</script>

<template>
  <v-select
    v-model="interfaceModel.data"
    :items="computedInterfaces"
    item-title="label"
    item-value="hash"
    label="Interface"
    variant="outlined"
    color="primary"
    hide-details
    density="compact"
    no-data-text="No interface available yet"
    return-object
    @update:model-value="emit('change', interfaceModel)"
  >
    <!-- ICON/LOGO -->
    <template #prepend-inner>
      <v-icon v-if="!interfaceModel.originalData.logo" :icon="interfaceModel.originalData.type === 'owner' ? 'mdi-list-box-outline' : 'mdi-folder-account-outline'" />
      <v-img
        v-else
        :src="interfaceModel.originalData.logo"
        width="24"
        height="24"
        class="mr-1"
      />
    </template>

    <!-- TITLE -->
    <template #selection>
      <template v-if="largeText">
        <div class="text-h6 text-truncate">
          {{ interfaceModel.originalData.label }}
        </div>
      </template>
      <span v-else class="text-truncate">{{ interfaceModel.originalData.label }}</span>
    </template>

    <!-- ACTIONS -->
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
            @mousedown.stop="create(interfaceModel)"
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
            :loading="states.saving"
            :disabled="states.saving || states.saved || !canSave"
            variant="text"
            color="primary"
            size="small"
            icon
            @mousedown.stop.prevent="save(interfaceModel)"
          >
            <v-icon v-if="!states.saved" icon="mdi-content-save" />
            <v-icon v-else icon="mdi-check" />
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
            v-if="interfaceModel.originalData.type === 'owner'"
            v-bind="props"
            :disabled="!interfaceModel.originalData.uuid || states.deleting"
            :loading="states.deleting"
            color="error"
            size="small"
            icon
            @mousedown.stop.prevent="remove(interfaceModel)"
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
        :active="item.value === interfaceModel.originalData.hash"
      >
        <template #prepend>
          <v-icon v-if="!item.raw.logo" :icon="item.raw.type === 'owner' ? 'mdi-list-box-outline' : 'mdi-folder-account-outline'" />
          <v-img
            v-else
            :src="item.raw.logo"
            width="24"
            height="24"
            class="mr-8"
          />
        </template>

        <v-list-item-subtitle>{{ item.raw.updated_at }}</v-list-item-subtitle>
      </v-list-item>
    </template>
  </v-select>
</template>
