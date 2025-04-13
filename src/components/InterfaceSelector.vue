<script setup lang="ts">
import {computed} from 'vue';
import { useGlobalStore } from '@/stores/global';
import type {IInterface} from '@/interfaces';
import {deepToRaw, getInterface} from '@/utils';
import {useInterface} from '@/composables/interface';

// Props
const interfaceModel = defineModel<IInterface | null>({ required: true });
const { interfaceStates, canDeleteInterface, canSaveInterface } = useInterface();
const {
  interfaces = [],
  actions = false,
  largeText = false,
  showIcon = true,
  originalInterface = null,
} = defineProps<{
  interfaces: IInterface[],
  actions?: boolean,
  largeText?: boolean,
  showIcon?: boolean,
  originalInterface?: IInterface | null,
}>();

// Declarations
const globalStore = useGlobalStore();

// Emits
const emit = defineEmits(['change', 'create', 'save', 'delete', 'update:model-value'])
const create = (item: IInterface) => emit('create', item);
const save = (item: IInterface) => emit('save', item);
const remove = (item: IInterface) =>  emit('delete', item);

// Computed
const computedInterfaces = computed((): (IInterface | { header: string })[] => {
  const results: (IInterface | { header: string })[] = [];
  const ownerInterfaces = interfaces.filter(item => item.created_by === globalStore.session.user?.id);
  const sharedInterfaces = interfaces.filter(item => item.created_by !== globalStore.session.user?.id && item.type !== 'owner');
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
const computedInterface = computed((): IInterface => {
  return originalInterface ?? interfaceModel.value ?? getInterface();
})
</script>

<template>
  <v-select
    v-model="interfaceModel"
    :items="computedInterfaces"
    item-title="label"
    item-value="hash"
    color="primary"
    hide-details
    no-data-text="No interface available yet"
    return-object
  >

    <!-- ICON/LOGO -->
    <template v-if="showIcon" #prepend-inner>
      <v-icon v-if="!computedInterface.logo" :icon="computedInterface.type === 'owner' ? 'mdi-list-box-outline' : 'mdi-folder-account-outline'" />
      <v-img
        v-else
        :src="computedInterface.logo"
        width="24"
        height="24"
        class="mr-1"
      />
    </template>

    <!-- TITLE -->
    <template #selection>
      <template v-if="largeText">
        <div class="text-h6 text-truncate">
          {{ computedInterface.label }}
        </div>
      </template>
      <span v-else class="text-truncate">{{ computedInterface.label }}</span>
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
            v-if="interfaceModel"
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
            v-if="interfaceModel"
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
            v-if="computedInterface.type === 'owner' && interfaceModel"
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
        :active="item.value === computedInterface.hash"
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
