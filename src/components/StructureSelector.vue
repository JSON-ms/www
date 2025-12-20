<script setup lang="ts">
import {computed} from 'vue';
import { useGlobalStore } from '@/stores/global';
import type {IStructure} from '@/interfaces';
import {deepToRaw, getStructure} from '@/utils';
import {useStructure} from '@/composables/structure';

// Props
const structure = defineModel<IStructure | null>({ required: true });
const { structureStates, canDeleteStructure, canSaveStructure } = useStructure();
const {
  structures = [],
  actions = false,
  largeText = false,
  showIcon = true,
  originalStructure = null,
} = defineProps<{
  structures: IStructure[],
  actions?: boolean,
  largeText?: boolean,
  showIcon?: boolean,
  originalStructure?: IStructure | null,
}>();

// Declarations
const globalStore = useGlobalStore();

// Emits
const emit = defineEmits(['change', 'create', 'save', 'delete', 'update:model-value'])
const create = (item: IStructure) => emit('create', item);
const save = (item: IStructure) => emit('save', item);
const remove = (item: IStructure) =>  emit('delete', item);

// Computed
const computedStructures = computed((): (IStructure | { header: string })[] => {
  const results: (IStructure | { header: string })[] = [];
  const ownerStructures = structures.filter(item => item.created_by === globalStore.session.user?.id);
  const sharedStructures = structures.filter(item => item.created_by !== globalStore.session.user?.id && item.type !== 'owner');
  const hasBoth = ownerStructures.length > 0 && sharedStructures.length > 0;
  if (hasBoth && ownerStructures.length > 0) {
    if (ownerStructures.length > 0) {
      results.push({
        header: 'My project' + (ownerStructures.length === 1 ? '' : 's')
      })
    }
  }
  if (ownerStructures.length > 0) {
    results.push(...ownerStructures.map(item => deepToRaw(item)).sort((a, b) => a.label > b.label ? 1 : -1))
  }
  if (hasBoth && sharedStructures.length > 0) {
    if (sharedStructures.length > 0) {
      results.push({
        header: 'Shared with me'
      })
    }
  }
  if (sharedStructures.length > 0) {
    results.push(...sharedStructures.map(item => deepToRaw(item)).sort((a, b) => a.label > b.label ? 1 : -1))
  }
  return results;
})
const computedStructure = computed((): IStructure => {
  return originalStructure ?? structure.value ?? getStructure();
})
</script>

<template>
  <v-select
    v-model="structure"
    :items="computedStructures"
    item-title="label"
    item-value="hash"
    color="primary"
    hide-details
    no-data-text="No structure available yet"
    return-object
  >

    <!-- ICON/LOGO -->
    <template v-if="showIcon" #prepend-inner>
      <v-icon v-if="!computedStructure.logo" :icon="computedStructure.type === 'owner' ? 'mdi-list-box-outline' : 'mdi-folder-account-outline'" />
      <v-img
        v-else
        :src="computedStructure.logo"
        width="24"
        height="24"
        class="mr-1"
      >
        <template #error>
          <v-icon :icon="computedStructure.type === 'owner' ? 'mdi-list-box-outline' : 'mdi-folder-account-outline'" />
        </template>
      </v-img>
    </template>

    <!-- TITLE -->
    <template #selection>
      <template v-if="largeText">
        <div class="text-h6 text-truncate">
          {{ computedStructure.label }}
        </div>
      </template>
      <span v-else class="text-truncate">{{ computedStructure.label }}</span>
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
            v-if="structure"
            v-bind="props"
            color="secondary"
            size="small"
            icon
            @mousedown.stop="create(structure)"
          >
            <v-icon icon="mdi-file-plus" />
          </v-btn>
        </template>
      </v-tooltip>

      <!-- SAVE -->
<!--      <v-tooltip-->
<!--        text="Save (CTRL+S)"-->
<!--        location="bottom"-->
<!--      >-->
<!--        <template #activator="{ props }">-->
<!--          <v-btn-->
<!--            v-if="structure"-->
<!--            v-bind="props"-->
<!--            :loading="structureStates.saving"-->
<!--            :disabled="!canSaveStructure || structureStates.saving || structureStates.saved"-->
<!--            variant="text"-->
<!--            color="primary"-->
<!--            size="small"-->
<!--            icon-->
<!--            @mousedown.stop.prevent="save(structure)"-->
<!--          >-->
<!--            <v-icon v-if="!structureStates.saved" icon="mdi-content-save" />-->
<!--            <v-icon v-else icon="mdi-check" />-->
<!--          </v-btn>-->
<!--        </template>-->
<!--      </v-tooltip>-->

      <!-- DELETE -->
      <v-tooltip
        text="Delete"
        location="bottom"
      >
        <template #activator="{ props }">
          <v-btn
            v-if="computedStructure.type === 'owner' && structure"
            v-bind="props"
            :disabled="!canDeleteStructure || structureStates.deleting"
            :loading="structureStates.deleting"
            color="error"
            size="small"
            icon
            @mousedown.stop.prevent="remove(structure)"
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
        :active="item.value === computedStructure.hash"
      >
        <template #prepend>
          <v-icon
            v-if="!item.raw.logo"
            :icon="item.raw.type === 'owner' ? 'mdi-list-box-outline' : 'mdi-folder-account-outline'"
            size="24"
          />
          <v-img
            v-else
            :src="item.raw.logo"
            width="24"
            height="24"
            class="mr-8"
          >
            <template #error>
              <v-icon :icon="computedStructure.type === 'owner' ? 'mdi-list-box-outline' : 'mdi-folder-account-outline'" />
            </template>
          </v-img>
        </template>

        <v-list-item-subtitle>
          {{ globalStore.session.endpoints.find(endpoint => endpoint.uuid === item.raw.endpoint)?.url ?? 'No endpoint yet' }}
        </v-list-item-subtitle>
      </v-list-item>
    </template>
  </v-select>
</template>
