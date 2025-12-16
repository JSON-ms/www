<script setup lang="ts">
import type {IStructure, IStructureData, ITrigger} from "@/interfaces";
import {computed, ref, type Ref} from "vue";
import {Services} from "@/services";
import {useGlobalStore} from "@/stores/global";

const structureData = defineModel<IStructureData>({ required: true });
const { structure, userData, location = 'structure', size } = defineProps<{
  structure: IStructure,
  userData: IStructure,
  location?: 'structure' | 'toolbar' | 'data'
  size?: string
}>();

const globalStore = useGlobalStore();
const running: Ref<boolean> = ref(false)
const lastTrigger: Ref<ITrigger | null> = ref(null)

const triggers = computed((): ITrigger[] => {
  const triggers: ITrigger[] = [];
  const keys = Object.keys(structureData.value.triggers);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    triggers.push({
      key,
      ...structureData.value.triggers[key],
    })
  }
  return triggers.filter(item => item.location === location || (!item.location && location === 'editor'));
})
const hasManyItems = computed((): boolean => {
  return triggers.value.length > 1;
})
const otherTriggers = computed((): ITrigger[] => {
  return triggers.value.filter((item: ITrigger) => item !== firstTrigger.value && item.key !== lastTrigger.value?.key);
})
const firstTrigger = computed((): ITrigger => {
  return Object.assign({
    icon: 'mdi-wrench'
  }, lastTrigger.value || triggers.value[0] || {
    label: '',
    url: '',
  });
})

const run = (trigger: ITrigger): Promise<any> => {
  lastTrigger.value = trigger;
  running.value = true;
  const method = (trigger.method || 'POST').toUpperCase();
  return Services.handle(trigger.url, method, method === 'GET' ? undefined : JSON.stringify({
    structure,
    userData,
  }), Object.assign({
    'Content-Type': 'application/json'
  }, trigger.headers))
    .catch(globalStore.catchError)
    .finally(() => running.value = false);
}
</script>

<template>
  <v-menu v-if="triggers.length > 0" location="top right">
    <template #activator="{ props }">
      <div class="position-relative" style="flex: 1">
        <v-btn
          variant="outlined"
          :size="size"
          :disabled="running"
          :text="firstTrigger.label"
          :class="hasManyItems ? ['w-100 pr-12'] : []"
          @click="() => run(firstTrigger)"
        >
          <v-icon :icon="running ? 'mdi-loading' : firstTrigger.icon" :class="running ? ['mdi-spin'] : []" start />
          {{ firstTrigger.label }}
        </v-btn>
        <v-btn
          v-if="hasManyItems"
          v-bind="props"
          :disabled="running"
          variant="flat"
          color="transparent"
          size="small"
          class="position-absolute"
          style="right: 0; border-top-left-radius: 0; border-bottom-left-radius: 0"
          min-width="0"
        >
          <v-icon icon="mdi-chevron-up" />
        </v-btn>
      </div>
    </template>
    <v-list density="compact">
      <v-list-item
        v-for="trigger in otherTriggers"
        :key="trigger.key"
        :title="trigger.label"
        :prepend-icon="trigger.icon"
        @click="() => run(trigger)"
      />
    </v-list>
  </v-menu>
</template>

