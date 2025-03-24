<script setup lang="ts">
import blankInterface from '@/assets/blank-interface.yaml';
import { getDefaultInterfaceContent } from '@/utils';
import { useDisplay } from 'vuetify';

const emit = defineEmits(['apply']);
const { smAndDown } = useDisplay()
const defaultInterface = getDefaultInterfaceContent();
const visible = defineModel<boolean>({ default: false });

const applyTemplate = (template: string) => {
  emit('apply', template);
  visible.value = false;
}
const items: any[] = [
  { icon: 'mdi-checkbox-blank-outline', label: 'Blank', body: 'Just an empty interface', template: blankInterface },
  { icon: 'mdi-list-box-outline', label: 'Ready-to-roll', body: 'Everything to kickstart', template: defaultInterface },
]
</script>

<template>
  <v-dialog
    v-model="visible"
    width="450"
    scrollable
  >
    <v-card>
      <v-card-title>Select template</v-card-title>
      <v-sheet color="background">
        <v-card-text>
          <v-list v-if="smAndDown">
            <v-list-item
              v-for="item in items"
              :key="item.label"
              :title="item.label"
              :subtitle="item.body"
              :prepend-icon="item.icon"
              @click="applyTemplate(item.template)"
            />
          </v-list>
          <v-row v-else>
            <v-col
              v-for="item in items"
              :key="item.label"
              cols="6"
            >
              <v-card class="text-center" @click="applyTemplate(item.template)">
                <div class="text-center py-2">
                  <v-icon size="128" :icon="item.icon" />
                </div>
                <v-card-title class="pb-0">{{ item.label }}</v-card-title>
                <v-card-text class="pt-0">{{ item.body }}</v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-sheet>
    </v-card>
  </v-dialog>
</template>
