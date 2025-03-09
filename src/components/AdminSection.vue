<script setup lang="ts">
import { computed, type Ref, ref, watch } from 'vue';
import { useGlobalStore } from '@/stores/global';
import { getDefaultInterfaceContent, getInterface, getParsedInterface } from '@/utils';
import { useRoute } from 'vue-router';
import type { IData, IInterface } from '@/interfaces';
import GoogleSignInButton from '@/components/GoogleSignInButton.vue';
import ContentEditor from '@/components/ContentEditor.vue';

const defaultInterfaceContent = getDefaultInterfaceContent();
const defaultInterface = getInterface(defaultInterfaceContent);
const parsedInterface = getParsedInterface(defaultInterface);

const found: Ref<IInterface> = ref(defaultInterface);
const interfaceList: Ref<IInterface[]> = ref([]);
const parsedData: Ref<IData> = ref(parsedInterface);
const currentRoute = useRoute();
const globalStore = useGlobalStore();

const ownerInterfaces = computed((): IInterface[] => {
  return interfaceList.value.filter(child => child.type === 'owner')
})
const sharedInterfaces = computed((): IInterface[] => {
  return interfaceList.value.filter(child => child.type === 'admin')
})

const reload = () => {
  parsedData.value.global.title = 'JSON.ms Admin Panel';
  if (currentRoute.params.interface) {
    found.value = globalStore.session.interfaces.find(child => ['owner', 'admin'].includes(child.type) && child.hash === currentRoute.params.interface) || defaultInterface;
    if (found.value.uuid) {
      parsedData.value = getParsedInterface(found.value);
    }
  }
  interfaceList.value = globalStore.session.interfaces.filter(child => ['owner', 'admin'].includes(child.type)) || [];
}
if (currentRoute.params.interface === 'demo') {
  defaultInterface.uuid = 'demo'
  defaultInterface.hash = 'demo'
  found.value = defaultInterface;
  interfaceList.value = [defaultInterface]
} else {
  reload();
}

watch(() => currentRoute.path, reload);

</script>

<template>
  <ContentEditor
    v-if="found.uuid"
    v-model="found"
    :interfaces="interfaceList"
    autoload
  />
  <v-sheet v-else color="background" class="d-flex align-center justify-center fill-height">
    <v-form>
      <v-card>
        <v-card-title>
          <div class="d-flex align-center mt-2" style="gap: 1rem">
            <img
              v-if="parsedData.global.logo"
              :src="parsedData.global.logo"
              height="32"
              alt="Logo"
            >
            <span class="text-truncate overflow-hidden">
              {{ parsedData.global.title }}
            </span>
          </div>
        </v-card-title>
        <v-divider v-if="globalStore.session.loggedIn" />
        <v-card-text>
          <v-alert v-if="currentRoute.params.interface" type="warning" :class="{ 'mb-2': interfaceList.length > 0 }">
            Unfortunately, you don't have access to the selected admin panel.
            <span v-if="ownerInterfaces.length > 0 || sharedInterfaces.length > 0">Please choose from the available options below:</span>
          </v-alert>
          <GoogleSignInButton
            v-if="!globalStore.session.loggedIn"
            class="mt-4"
            block
          />
          <template v-else-if="ownerInterfaces.length > 0 || sharedInterfaces.length > 0">
            <v-list color="primary">
              <template v-if="ownerInterfaces.length > 0">
                <v-list-item-subtitle v-if="ownerInterfaces.length > 0 && sharedInterfaces.length > 0" class="mb-2">
                  My Admin Panels
                </v-list-item-subtitle>
                <v-list-item
                  v-for="adminPanel in ownerInterfaces"
                  :key="adminPanel.hash"
                  :subtitle="'Owner: ' + adminPanel.owner_name"
                  :title="adminPanel.label"
                  :to="'/admin/' + adminPanel.hash"
                >
                  <template #prepend>
                    <v-icon v-if="!adminPanel.logo" :icon="adminPanel.type === 'owner' ? 'mdi-list-box-outline' : 'mdi-folder-account-outline'" />
                    <v-img
                      v-else
                      :src="adminPanel.logo"
                      width="24"
                      height="24"
                      class="mr-6"
                    />
                  </template>
                </v-list-item>
              </template>
              <v-spacer v-if="ownerInterfaces.length > 0 && sharedInterfaces.length > 0" class="my-4" />
              <template v-if="sharedInterfaces.length > 0">
                <v-list-item-subtitle v-if="ownerInterfaces.length > 0 && sharedInterfaces.length > 0" class="mb-2">
                  Shared
                </v-list-item-subtitle>
                <v-list-item
                  v-for="adminPanel in sharedInterfaces"
                  :key="adminPanel.hash"
                  :subtitle="'Owner: ' + adminPanel.owner_name"
                  :title="adminPanel.label"
                  :to="'/admin/' + adminPanel.hash"
                >
                  <template #prepend>
                    <v-icon v-if="!adminPanel.logo" :icon="adminPanel.type === 'owner' ? 'mdi-list-box-outline' : 'mdi-folder-account-outline'" />
                    <v-img
                      v-else
                      :src="adminPanel.logo"
                      width="24"
                      height="24"
                      class="mr-6"
                    />
                  </template>
                </v-list-item>
              </template>
            </v-list>
          </template>
          <v-alert v-else-if="!currentRoute.params.interface">
            No admin panel associated with your account.
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions
          v-if="parsedData.global.copyright"
          class="text-caption justify-center"
        >
          {{ parsedData.global.copyright }}
        </v-card-actions>
      </v-card>
    </v-form>
  </v-sheet>
</template>

<style lang="scss" scoped>
.v-form {
  max-width: 25rem;
  margin: 2rem;
}
</style>
