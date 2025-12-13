<script setup lang="ts">
import { useGlobalStore } from '@/stores/global';
import { ref } from 'vue';
import { Services } from '@/services';
import {useModelStore} from '@/stores/model';

const globalStore = useGlobalStore();
const modelStore = useModelStore(); // Necessary even if not used
const sessionLoginOut = ref(false);
const emit = defineEmits(['logout'])
const {
  dense = false,
  showUsername = false,
} = defineProps<{
  dense?: boolean,
  showUsername?: boolean,
}>();
const logout = () => {
  globalStore.setPrompt({
    ...globalStore.prompt,
    visible: true,
    title: 'End Session',
    body: 'If you log out, you may lose any unsaved changes. Do you want to proceed?',
    btnText: 'Logout',
    btnIcon: 'mdi-logout-variant',
    btnColor: 'warning',
    callback: () => new Promise((resolve, reject) => {
      sessionLoginOut.value = true;
      Services.get(import.meta.env.VITE_SERVER_URL + '/session/logout')
        .then(response => {
          globalStore.setSession(response);
          emit('logout', response);
        })
        .catch(err => {
          reject();
          globalStore.catchError(err);
        })
        .finally(() => {
          sessionLoginOut.value = false;
          resolve();
        });
    })
  })
}
</script>

<template>
  <v-menu>
    <template #activator="{ props }">
      <v-btn v-bind="props" :icon="dense" height="40">
        <template v-if="globalStore.session.loggedIn">
          <v-avatar size="32" color="primary">
            <v-img
              v-if="globalStore.session.user?.avatar"
              :src="globalStore.session.user?.avatar"
              alt="Avatar"
            >
              <template #placeholder>
                <div class="d-flex align-center justify-center fill-height">
                  <v-progress-circular
                    color="surface"
                    indeterminate
                    size="16"
                    width="1"
                  />
                </div>
              </template>
            </v-img>
            <strong v-else>{{ globalStore.session.user?.name.substring(0, 1) }}</strong>
          </v-avatar>
          <strong v-if="showUsername" class="ml-3">{{ globalStore.session.user?.name }}</strong>
        </template>
        <v-icon v-else icon="mdi-tools" />
        <v-icon v-if="!dense" end icon="mdi-chevron-down" />
      </v-btn>
    </template>
    <v-list>
      <slot></slot>
      <template v-if="globalStore.session.loggedIn">
        <v-divider v-if="$slots.default" class="my-1" />
        <v-list-item
          :disabled="sessionLoginOut"
          title="Logout"
          prepend-icon="mdi-logout-variant"
          @click="logout"
        />
      </template>
    </v-list>
  </v-menu>
</template>

