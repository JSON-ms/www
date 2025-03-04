<script setup lang="ts">
import { useGlobalStore } from '@/stores/global';
import { ref } from 'vue';
import { useDisplay } from 'vuetify';
import { Services } from '@/services';

const globalStore = useGlobalStore();
const { smAndDown } = useDisplay()
const sessionLoginOut = ref(false);
const emit = defineEmits(['logout'])
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
      Services.post(import.meta.env.VITE_SERVER_URL + '/logout')
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
  <v-avatar size="32" color="primary">
    <v-img
      v-if="globalStore.session.user.avatar"
      :src="globalStore.session.user.avatar"
      alt="Avatar"
    >
      <template #placeholder>
        <v-progress-circular
          indeterminate
        />
      </template>
    </v-img>
    <strong v-else>{{ globalStore.session.user.name.substring(0, 1) }}</strong>
  </v-avatar>
  <strong v-if="!smAndDown">{{ globalStore.session.user.name }}</strong>

  <v-tooltip
    text="Logout"
    location="bottom"
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        :loading="sessionLoginOut"
        :disabled="sessionLoginOut"
        icon
        @click="logout"
      >
        <v-icon>mdi-logout-variant</v-icon>
      </v-btn>
    </template>
  </v-tooltip>
</template>

