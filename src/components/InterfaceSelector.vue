<script setup lang="ts">
import router from '@/router';
import { computed } from 'vue';
import type { IInterface } from '@/interfaces';
import { useGlobalStore } from '@/stores/global';

const {
  interfaces = [],
  type = null
} = defineProps<{
  interfaces?: IInterface[],
  type?: 'admin' | 'interface' | null,
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

const emit = defineEmits(['change'])
const onChange = (item: IInterface) => {
  emit('change', item);
}
</script>

<template>
  <v-autocomplete
    v-model="selectedInterface"
    :items="computedInterfaces"
    :prepend-inner-icon="selectedInterface.type === 'owner' ? 'mdi-list-box-outline' : 'mdi-folder-account-outline'"
    item-title="label"
    label="Interface"
    variant="outlined"
    color="primary"
    hide-details
    return-object
    density="compact"
    no-data-text="No interface available yet"
    @update:model-value="onChange"
  >
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
  </v-autocomplete>
</template>
