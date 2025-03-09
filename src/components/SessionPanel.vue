<script setup lang="ts">
import { useGlobalStore } from '@/stores/global';
import { computed, ref } from 'vue';
import { useDisplay } from 'vuetify';
import { Services } from '@/services';
import { useRoute } from 'vue-router';

const globalStore = useGlobalStore();
const { smAndDown } = useDisplay()
const sessionLoginOut = ref(false);
const currentRoute = useRoute();
const isAdmin = currentRoute.path.startsWith('/admin');
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

const hash = computed((): string => {
  return (currentRoute.params.interface || '').toString();
})
</script>

<template>
  <v-menu>
    <template #activator="{ props }">
      <v-btn v-bind="props">
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
        <strong v-if="!smAndDown" class="ml-3">{{ globalStore.session.user.name }}</strong>
        <v-icon end icon="mdi-chevron-down" />
      </v-btn>
    </template>
    <v-list>
      <v-list-item
        v-if="isAdmin"
        :to="'/editor/' + hash"
        title="Editor"
        prepend-icon="mdi-pencil-box-outline"
        append-icon="mdi-arrow-right"
      />
      <v-list-item
        v-else
        :to="'/admin/' + hash"
        title="Admin"
        prepend-icon="mdi-form-textbox"
        append-icon="mdi-arrow-right"
      />
      <v-divider class="my-2" />
      <v-list-item
        :disabled="sessionLoginOut"
        title="Logout"
        prepend-icon="mdi-logout-variant"
        @click="logout"
      />
    </v-list>
  </v-menu>
</template>

