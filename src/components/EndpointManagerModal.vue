<script setup lang="ts">
import ListBuilder from '@/components/ListBuilder.vue';
import {useGlobalStore} from '@/stores/global';
import {computed, ref, watch} from 'vue';
import type {IEndpoint} from '@/interfaces';
import {deepToRaw} from '@/utils';
import {useStructure} from '@/composables/structure';
import Rules from '@/rules';
import {useEndpoints} from "@/composables/endpoints";

const globalStore = useGlobalStore();
const visible = defineModel<boolean>({ default: false });
const { getStructureRules } = useStructure();
const { saveEndpoints, deleteEndpoint, saving } = useEndpoints();

const save = () => {
  const data = structuredClone(deepToRaw(endpointList.value));
  saveEndpoints(data).then(endpoints => {
    globalStore.setSession({
      ...globalStore.session,
      endpoints: structuredClone(deepToRaw(endpoints))
    })
    close();
  })
}
const close = () => {
  visible.value = false;
}
const onRemoveItemCallback = (index: number, list: any[]) => {
  if (list[index].uuid) {
    globalStore.setPrompt({
      ...globalStore.prompt,
      visible: true,
      title: 'Remove Endpoint',
      body: 'Are you sure you want to remove this endpoint? Any project using this endpoint will stop working.',
      btnText: 'Remove',
      btnIcon: 'mdi-delete-outline',
      btnColor: 'error',
      callback: () => new Promise(resolve => {
        deleteEndpoint(list[index].uuid)
          .then(() => {
            list.splice(index, 1);
            globalStore.setSession({
              ...globalStore.session,
              endpoints: structuredClone(deepToRaw(list))
            })
          })
          .finally(resolve)
      })
    })
  } else {
    list.splice(index, 1);
  }
}
const isPristine = computed((): boolean => {
  return JSON.stringify(endpointList.value) === JSON.stringify(globalStore.session.endpoints);
})
const endpointList = ref<IEndpoint[]>([]);
watch(() => globalStore.session.endpoints, () => {
  endpointList.value = structuredClone(deepToRaw(globalStore.session.endpoints));
}, { immediate: true, deep: true })
watch(visible, () => {
  if (visible.value) {
    endpointList.value = structuredClone(deepToRaw(globalStore.session.endpoints));
  }
})
</script>

<template>
  <v-dialog
    v-model="visible"
    :persistent="!isPristine"
    width="600"
    scrollable
  >
    <v-card
      title="Endpoint Manager"
      prepend-icon="mdi-webhook"
    >
      <v-card-text>

        <p class="mb-4">
          Every endpoint you create instantiate a new <i>cypher</i> and <i>secret API key</i> that you can reuse with other projects. That way, you can centralize your data on a specific server if required.
        </p>

        <v-alert type="info" variant="tonal" class="mb-4">
          To get assistance with running your own endpoint instance, be sure to consult the Integration panel.
        </v-alert>

        <ListBuilder
          v-model="endpointList"
          :disabled="saving"
          :remove-item-callback="onRemoveItemCallback"
          :default-item="{
            url: '',
            secret: '',
            cypher: '',
          }"
        >
          <template #default="{ item }">
            <v-text-field
              v-model="item.url"
              :rules="getStructureRules('server_url')"
              clearable
              required
              persistent-hint
              hint="This field is required"
            >
              <template #label>
                <span class="mr-2 text-error">*</span> Endpoint
              </template>
              <template v-if="item.url && Rules.isUrl(item.url) && !item.url.startsWith('https://')" #message>
                <span class="text-error">It is not safe to use an unsecured protocol (HTTP) to communicate your data. Please be aware that your information may be vulnerable to interception by unauthorized parties. For your safety, we recommend using a secure connection (HTTPS) to protect your sensitive data during transmission.</span>
              </template>
              <template v-if="!item.uuid" #prepend-inner>
                <v-icon icon="mdi-new-box" />
              </template>
            </v-text-field>
          </template>
        </ListBuilder>
      </v-card-text>
      <v-card-actions>
        <v-btn
          :loading="saving"
          :disabled="isPristine || saving"
          :color="isPristine ? undefined : 'primary'"
          variant="flat"
          @click="save"
        >
          Save and close
        </v-btn>
        <v-btn
          :disabled="saving"
          @click="close"
        >
          Cancel
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
