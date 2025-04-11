<script setup lang="ts">
import {useUserData} from '@/composables/user-data';
import {useInterface} from '@/composables/interface';
import {useLayout} from '@/composables/layout';
import {useGlobalStore} from '@/stores/global';

const { tab = 'data' } = defineProps<{
  tab: 'data' | 'settings' | 'docs',
}>();

const globalStore = useGlobalStore();
const { interfaceHasError, interfaceIsPristine } = useInterface();
const { windowWidth, layoutSize } = useLayout();
const { saveUserData, resetUserData, userDataHasChanged, canInteractWithServer, userDataSaving, userDataSaved, userDataLoaded, canSave, userDataHasError } = useUserData();

const save = () => {
  if (tab === 'data') {
    saveUserData();
  }
}

const reset = () => {
  if (tab === 'data') {
    resetUserData();
  }
}
</script>

<template>
  <v-app-bar flat location="bottom" style="border-top: rgba(0, 0, 0, 0.1) solid 1px" class="pl-3">
    <div
      v-if="globalStore.session.loggedIn"
      :class="{
        'pr-3': !interfaceIsPristine || interfaceHasError() || userDataHasError
      }"
      style="gap: 1rem"
    >
      <v-scroll-y-transition group hide-on-leave>
        <div v-if="!interfaceIsPristine">
          <v-tooltip v-if="layoutSize.data < 850" location="top" text="Please save your interface before continuing.">
            <template #activator="{ props }">
              <v-btn icon color="error" variant="tonal" style="cursor: default">
                <v-icon v-bind="props" icon="mdi-alert" />
              </v-btn>
            </template>
          </v-tooltip>
          <v-alert
            v-else
            density="compact"
            variant="tonal"
            type="warning"
          >
            <div class="d-flex">
              <span class="text-truncate">Please correct the errors in the form before submitting.</span>
            </div>
          </v-alert>
        </div>
        <div v-else-if="userDataLoaded && (interfaceHasError() || userDataHasError)">
          <v-tooltip v-if="layoutSize.data < 850" location="top" text="Please correct the errors in the form before submitting.">
            <template #activator="{ props }">
              <v-btn icon color="warning" variant="tonal" style="cursor: default">
                <v-icon v-bind="props" icon="mdi-alert" />
              </v-btn>
            </template>
          </v-tooltip>
          <v-alert
            v-else
            density="compact"
            variant="tonal"
            type="error"
            icon="mdi-alert"
          >
            <div class="d-flex">
              <span class="text-truncate">Please correct the errors in the form before submitting.</span>
            </div>
          </v-alert>
        </div>
        <div v-else-if="!canInteractWithServer">
          <v-tooltip v-if="layoutSize.data < 850" location="top" text="You need to define your webhook URL to communicate with your server">
            <template #activator="{ props }">
              <v-btn icon color="warning" variant="tonal" style="cursor: default">
                <v-icon v-bind="props" icon="mdi-alert" />
              </v-btn>
            </template>
          </v-tooltip>
          <v-alert
            v-else
            density="compact"
            variant="tonal"
            type="error"
            icon="mdi-alert"
          >
            <div class="d-flex">
              <span class="text-truncate">You need to define your webhook URL to communicate with your server</span>
            </div>
          </v-alert>
        </div>
      </v-scroll-y-transition>
    </div>
    <v-spacer v-if="windowWidth > 800" />
    <div
      class="d-flex align-center pr-3"
      :style="[{
        minWidth: windowWidth > 800 ? '20rem' : '100%',
        maxWidth: windowWidth > 800 ? '20rem' : '100%',
      }, 'gap: 0.5rem; flex: 1']"
    >
      <v-btn
        :loading="userDataSaving"
        :disabled="!canSave"
        :variant="userDataSaved ? 'outlined' : 'flat'"
        :readonly="userDataSaved"
        :color="canSave ? 'primary' : undefined"
        style="flex: 1"
        @click.stop.prevent="save"
      >
        <template v-if="!userDataSaved">
          <v-icon start icon="mdi-content-save" />
          Save
        </template>
        <template v-else>
          <v-icon start icon="mdi-check" />
          Saved!
        </template>
      </v-btn>
      <v-btn
        :disabled="!userDataHasChanged"
        variant="text"
        style="flex: 1"
        @click="reset"
      >
        Reset
      </v-btn>
    </div>
  </v-app-bar>
</template>

