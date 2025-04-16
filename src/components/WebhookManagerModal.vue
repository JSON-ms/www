<script setup lang="ts">
import ListBuilder from '@/components/ListBuilder.vue';
import {useGlobalStore} from '@/stores/global';
import {computed, ref, watch} from 'vue';
import type {IWebhook} from '@/interfaces';
import {deepToRaw} from '@/utils';
import {useStructure} from '@/composables/structure';
import Rules from '@/rules';
import {useWebhooks} from "@/composables/webhooks";

const globalStore = useGlobalStore();
const visible = defineModel<boolean>({ default: false });
const { getStructureRules } = useStructure();
const { saveWebhooks, deleteWebhook, saving } = useWebhooks();

const save = () => {
  const data = structuredClone(deepToRaw(webhookList.value));
  saveWebhooks(data).then(webhooks => {
    globalStore.setSession({
      ...globalStore.session,
      webhooks: structuredClone(deepToRaw(webhooks))
    })
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
      title: 'Remove endpoint',
      body: 'Are you sure you want to remove this endpoint? Any project using this endpoint will stop working.',
      btnText: 'Remove',
      btnIcon: 'mdi-delete-outline',
      btnColor: 'error',
      callback: () => new Promise(resolve => {
        deleteWebhook(list[index].uuid)
          .then(() => {
            list.splice(index, 1);
            globalStore.setSession({
              ...globalStore.session,
              webhooks: structuredClone(deepToRaw(list))
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
  return JSON.stringify(webhookList.value) === JSON.stringify(globalStore.session.webhooks);
})
const webhookList = ref<IWebhook[]>([]);
watch(() => globalStore.session.webhooks, () => {
  webhookList.value = structuredClone(deepToRaw(globalStore.session.webhooks));
}, { immediate: true, deep: true })
watch(visible, () => {
  if (visible.value) {
    webhookList.value = structuredClone(deepToRaw(globalStore.session.webhooks));
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
      title="Webhook Manager"
      prepend-icon="mdi-webhook"
    >
      <v-card-text>

        <p class="mb-4">
          Every endpoint you create instantiate a new <i>cypher</i> and <i>secret API key</i> that you can reuse with other projects. That way, you can centralize your data on a specific server if required.
        </p>

        <ListBuilder
          v-model="webhookList"
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
          Save
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
