<script setup lang="ts">
import { useGlobalStore } from '@/stores/global';
import { ref } from 'vue';
import { Services } from '@/services';

const globalStore = useGlobalStore();
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
    callback: () => new Promise(resolve => {
      sessionLoginOut.value = true;
      Services.get(import.meta.env.VITE_SERVER_URL + '/session/logout')
        .then(response => {
          emit('logout');
          return response;
        })
        .then(globalStore.setSession)
        .then(resolve)
        .catch(globalStore.catchError)
        .finally(() => sessionLoginOut.value = false);
    })
  })
}
</script>

<template>
  <v-menu>
    <template #activator="{ props }">
      <v-btn v-bind="props" :icon="dense">
        <v-avatar size="32" color="primary">
          <v-img
            v-if="globalStore.session.user.avatar"
            :src="globalStore.session.user.avatar"
            alt="Avatar"
          >
            <template #placeholder>
              <v-overlay>
                <v-progress-circular
                  indeterminate
                  size="16"
                  width="2"
                />
              </v-overlay>
            </template>
          </v-img>
          <strong v-else>{{ globalStore.session.user.name.substring(0, 1) }}</strong>
        </v-avatar>
        <strong v-if="showUsername" class="ml-3">{{ globalStore.session.user.name }}</strong>
        <v-icon v-if="!dense" end icon="mdi-chevron-down" />
      </v-btn>
    </template>
    <v-list>
      <v-list-item
        :disabled="sessionLoginOut"
        title="Logout"
        prepend-icon="mdi-logout-variant"
        @click="logout"
      />
    </v-list>
  </v-menu>
</template>

