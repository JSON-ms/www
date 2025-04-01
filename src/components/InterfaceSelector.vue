<script setup lang="ts">
import {computed} from 'vue';
import { useGlobalStore } from '@/stores/global';
import type {IInterface} from '@/interfaces';
import {deepToRaw} from '@/utils';
import {useInterface} from '@/composables/interface';
import {useModelStore} from '@/stores/model';

// Props
const interfaceModel = defineModel<IInterface>({ required: true });
const {
  interfaces = [],
  type = null,
  actions = false,
  largeText = false,
  showIcon = true,
} = defineProps<{
  interfaces: IInterface[],
  type: 'admin' | 'interface' | null,
  actions?: boolean,
  largeText?: boolean,
  showIcon?: boolean,
}>();

// Declarations
const globalStore = useGlobalStore();
const modelStore = useModelStore();
const { interfaceStates, canDeleteInterface, canSaveInterface } = useInterface();

// Emits
const emit = defineEmits(['change', 'create', 'save', 'delete', 'update:model-value'])
const create = (item: IInterface) => emit('create', item);
const save = (item: IInterface) => emit('save', item);
const remove = (item: IInterface) =>  emit('delete', item);

// Computed
const computedInterfaces = computed((): (IInterface | { header: string })[] => {
  const results: (IInterface | { header: string })[] = [];
  const ownerInterfaces = interfaces.filter(item => item.created_by === globalStore.session.user?.id);
  const sharedInterfaces = interfaces.filter(item => item.created_by !== globalStore.session.user?.id && item.type === type);
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

const onInput = (model: IInterface) => {
  modelStore.setOriginalInterface(model);
}
</script>

<template>
  <v-select
    v-model="interfaceModel"
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
    @update:model-value="onInput"
  >
    <!-- ICON/LOGO -->
    <template v-if="showIcon" #prepend-inner>
      <v-icon v-if="!modelStore.originalInterface.logo" :icon="modelStore.originalInterface.type === 'owner' ? 'mdi-list-box-outline' : 'mdi-folder-account-outline'" />
      <v-img
        v-else
        :src="modelStore.originalInterface.logo"
        width="24"
        height="24"
        class="mr-1"
      />
    </template>

    <!-- TITLE -->
    <template #selection>
      <template v-if="largeText">
        <div class="text-h6 text-truncate">
          {{ modelStore.originalInterface.label }}
        </div>
      </template>
      <span v-else class="text-truncate">{{ modelStore.originalInterface.label }}</span>
    </template>

    <!-- ACTIONS -->
    <template v-if="actions" #append-inner>

      <!-- CREATE -->
      <v-tooltip
        text="New (ALT+N)"
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
        text="Save (CTRL+S)"
        location="bottom"
      >
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            :loading="interfaceStates.saving"
            :disabled="!canSaveInterface"
            variant="text"
            color="primary"
            size="small"
            icon
            @mousedown.stop.prevent="save(interfaceModel)"
          >
            <v-icon v-if="!interfaceStates.saved" icon="mdi-content-save" />
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
            v-if="modelStore.originalInterface.type === 'owner'"
            v-bind="props"
            :disabled="!canDeleteInterface || interfaceStates.deleting"
            :loading="interfaceStates.deleting"
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
        :active="item.value === modelStore.originalInterface.hash"
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
