<script setup lang="ts">
import {useUserData} from "@/composables/user-data";
import InterfaceSelector from "@/components/InterfaceSelector.vue";
import type {IInterface, IWebhook} from "@/interfaces";
import {useGlobalStore} from "@/stores/global";
import {computed, ref, watch} from "vue";
import {useModelStore} from "@/stores/model";
import {useMigration} from "@/composables/migration";

const visible = defineModel<boolean>('visible');
const {
  interfaces = [],
} = defineProps<{
  interfaces: IInterface[],
}>();
const { getUserFiles, fetchUserData, userDataLoading } = useUserData();
const { interfaceModel, fromWebhook, toWebhook, structure, userData, userDataContent, files, fileList, migrating, downloadBytesProgress, uploadBytesProgress, canMigrate, migrateUserData, totalSize, downloadPercentageProgress, uploadPercentageProgress, downloadStructureState, downloadUserDataState, downloadFilesState, uploadStructureState, uploadUserDataState, uploadFilesState, hasError, downloadTestState, uploadTestState, resetStates, nextDownloadPercentage, nextUploadPercentage } = useMigration();
const globalStore = useGlobalStore();
const modelStore = useModelStore();
const panel = ref<number>(0);

const migrate = () => {
  if (interfaceModel.value) {
    panel.value++;
    migrateUserData(interfaceModel.value).then(() => {
      setTimeout(() => {
        panel.value++;
      }, 1000);
    }).catch(globalStore.catchError);
  }
}
const goBack = () => {
  resetStates();
  panel.value--;
}
const close = () => {
  visible.value = false;
}
const onInterfaceChange = () => {
  fileList.value = [];
  userDataContent.value = '';
  if (interfaceModel.value) {
    fromWebhook.value = interfaceModel.value.webhook;
    fetchUserData(interfaceModel.value).then(response => {
      if (interfaceModel.value) {
        fileList.value = getUserFiles(interfaceModel.value, response.data);
        userDataContent.value = response.data;
      }
    })
  }
}

const fromServer = computed((): (IWebhook | undefined) => globalStore.session.webhooks.find(item => item.uuid === fromWebhook.value));
const toServer = computed((): (IWebhook | undefined) => globalStore.session.webhooks.find(item => item.uuid === toWebhook.value));

watch(() => visible.value, () => {
  if (visible.value) {
    resetStates();

    panel.value = 0;
    interfaceModel.value = interfaces.find(item => item.uuid === modelStore.interface.uuid) ?? null;
    fromWebhook.value = null;
    toWebhook.value = null;
    structure.value = false;
    userData.value = true;
    userDataContent.value = '';
    files.value = false
    fileList.value = [];
    if (interfaceModel.value) {
      onInterfaceChange();
    }
  }
})
</script>

<template>
  <v-dialog
    v-model="visible"
    :persistent="migrating"
    :width="panel === 2 ? 400 : 800"
    scrollable
  >
    <v-card
      title="Data Migration"
      prepend-icon="mdi-folder-arrow-left-right-outline"
    >
      <template #append>
        <v-expand-transition>
          <v-alert
            v-if="hasError"
            type="error"
            class="text-no-wrap my-n4 mr-n2"
            density="compact"
            variant="tonal"
          >
            An error occurred while migrating the data.
          </v-alert>
        </v-expand-transition>
      </template>
      <v-sheet :color="panel === 1 ? 'background' : undefined">
        <v-card-text>
          <v-window v-model="panel">
            <v-window-item>
              <div class="d-flex flex-column" style="gap: 1rem">
                <p>Choose the interface you wish to migrate.</p>
                <InterfaceSelector
                  v-model="interfaceModel"
                  :interfaces="interfaces"
                  :loading="userDataLoading"
                  label="Interface"
                  type="admin"
                  large-text
                  clearable
                  @update:model-value="onInterfaceChange"
                />

                <v-divider />

                <v-row>
                  <v-col cols="12" md="6" class="d-flex flex-column" style="gap: 1rem">
                    <p>Choose the original server that contains the information you wish to transfer.</p>
                    <v-select
                      v-model="fromWebhook"
                      :items="globalStore.session.webhooks.filter(item => item.uuid !== toWebhook)"
                      :disabled="!interfaceModel"
                      item-title="url"
                      item-value="uuid"
                      label="Copy from"
                      prepend-inner-icon="mdi-webhook"
                      hide-details="auto"
                      required
                      clearable
                      autocomplete="webhook"
                    />
                  </v-col>
                  <v-col cols="12" md="6" class="d-flex flex-column" style="gap: 1rem">
                    <p>Choose the new server that will receive the transferred information.</p>
                    <v-select
                      v-model="toWebhook"
                      :items="globalStore.session.webhooks.filter(item => item.uuid !== fromWebhook)"
                      :disabled="!interfaceModel || !fromWebhook"
                      item-title="url"
                      item-value="uuid"
                      label="Copy to"
                      prepend-inner-icon="mdi-webhook"
                      hide-details="auto"
                      required
                      clearable
                      autocomplete="webhook"
                    />
                  </v-col>
                </v-row>

                <v-divider />

                <div class="d-flex align-center" style="gap: 1rem">
                  <v-checkbox
                    v-model="userData"
                    :disabled="!interfaceModel"
                    label="User data"
                    hide-details
                  />
                  <v-checkbox
                    v-model="files"
                    :disabled="!interfaceModel"
                    label="Files"
                    hide-details
                  />
                </div>

                <v-expand-transition>
                  <div v-if="interfaceModel">
                    <v-alert
                      type="warning"
                      variant="tonal"
                    >
                      All data transfers are performed directly from your browser. You will download {{ $formatBytes(totalSize) }} of data from your original server. After that, this same data will be uploaded to the new server. In total, this results in a data transfer of {{ $formatBytes(totalSize * 2) }}.
                    </v-alert>
                  </div>
                </v-expand-transition>
              </div>
            </v-window-item>

            <v-window-item>
              <v-row>
                <v-col cols="12" md="6">
                  <v-card>
                    <v-card-title class="d-flex align-center" style="gap: 1rem">
                      <v-icon icon="mdi-server-outline" />
                      <div>
                        <div class="text-caption">
                          Downloading from:
                        </div>
                        <div>{{ fromServer?.url }}</div>
                      </div>
                    </v-card-title>
                    <v-divider />
                    <v-card-text>
                      <div class="d-flex flex-column" style="gap: 1rem">
                        <div class="d-flex align-center" style="gap: 1rem">
                          <v-icon v-if="downloadTestState === -1" icon="mdi-close" color="error" size="16" />
                          <v-icon v-else-if="downloadTestState === 2" icon="mdi-check" color="secondary" size="16" />
                          <v-progress-circular
                            v-else
                            indeterminate
                            :color="downloadTestState === 1 ? 'secondary' : 'background'"
                            size="16"
                            width="1"
                          />
                          <span>Testing server communication</span>
                        </div>
                        <div v-if="structure" class="d-flex align-center" style="gap: 1rem">
                          <v-icon v-if="uploadTestState === -1 || downloadTestState === -1" icon="mdi-help-circle-outline" size="16" />
                          <v-icon v-else-if="downloadStructureState === -1" icon="mdi-close" color="error" size="16" />
                          <v-icon v-else-if="downloadStructureState === 2" icon="mdi-check" color="secondary" size="16" />
                          <v-progress-circular
                            v-else
                            indeterminate
                            :color="downloadStructureState === 1 ? 'secondary' : 'background'"
                            size="16"
                            width="1"
                          />
                          <span>Fetching interface content</span>
                        </div>
                        <div v-if="userData" class="d-flex align-center" style="gap: 1rem">
                          <v-icon v-if="uploadTestState === -1 || downloadTestState === -1" icon="mdi-help-circle-outline" size="16" />
                          <v-icon v-else-if="downloadUserDataState === -1" icon="mdi-close" color="error" size="16" />
                          <v-icon v-else-if="downloadUserDataState === 2" icon="mdi-check" color="secondary" size="16" />
                          <v-progress-circular
                            v-else
                            indeterminate
                            :color="downloadUserDataState === 1 ? 'secondary' : 'background'"
                            size="16"
                            width="1"
                          />
                          <span>Fetching user data</span>
                        </div>
                        <div v-if="files" class="d-flex align-center" style="gap: 1rem">
                          <v-icon v-if="uploadTestState === -1 || downloadTestState === -1" icon="mdi-help-circle-outline" size="16" />
                          <v-icon v-else-if="downloadFilesState === -1" icon="mdi-close" color="error" size="16" />
                          <v-icon v-else-if="downloadFilesState === 2" icon="mdi-check" color="secondary" size="16" />
                          <v-progress-circular
                            v-else
                            indeterminate
                            :color="downloadFilesState === 1 ? 'secondary' : 'background'"
                            size="16"
                            width="1"
                          />
                          <span>Fetching files</span>
                        </div>

                        <v-progress-linear
                          :model-value="downloadPercentageProgress"
                          :buffer-value="nextDownloadPercentage"
                          color="secondary"
                          height="25"
                        >
                          <template #default>
                            {{ $formatBytes(downloadBytesProgress) }} of {{ $formatBytes(totalSize) }}
                          </template>
                        </v-progress-linear>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" md="6">
                  <v-card>
                    <v-card-title class="d-flex align-center" style="gap: 1rem">
                      <v-icon icon="mdi-server-outline" />
                      <div>
                        <div class="text-caption">
                          Uploading to:
                        </div>
                        <div>{{ toServer?.url }}</div>
                      </div>
                    </v-card-title>
                    <v-divider />
                    <v-card-text>
                      <div class="d-flex flex-column" style="gap: 1rem">
                        <div class="d-flex align-center" style="gap: 1rem">
                          <v-icon v-if="downloadTestState === -1 || uploadTestState === -1" icon="mdi-close" color="error" size="16" />
                          <v-icon v-else-if="uploadTestState === 2" icon="mdi-check" color="secondary" size="16" />
                          <v-progress-circular
                            v-else
                            indeterminate
                            :color="uploadTestState === 1 ? 'secondary' : 'background'"
                            size="16"
                            width="1"
                          />
                          <span>Testing server communication</span>
                        </div>
                        <div v-if="structure" class="d-flex align-center" style="gap: 1rem">
                          <v-icon v-if="downloadTestState === -1 || uploadTestState === -1" icon="mdi-help-circle-outline" size="16" />
                          <v-icon v-else-if="downloadStructureState === -1 || uploadStructureState === -1" icon="mdi-close" color="error" size="16" />
                          <v-icon v-else-if="uploadStructureState === 2" icon="mdi-check" color="secondary" size="16" />
                          <v-progress-circular
                            v-else
                            indeterminate
                            :color="uploadStructureState === 1 ? 'secondary' : 'background'"
                            size="16"
                            width="1"
                          />
                          <span>Uploading interface content</span>
                        </div>
                        <div v-if="userData" class="d-flex align-center" style="gap: 1rem">
                          <v-icon v-if="downloadTestState === -1 || uploadTestState === -1" icon="mdi-help-circle-outline" size="16" />
                          <v-icon v-else-if="downloadUserDataState === -1 || uploadUserDataState === -1" icon="mdi-close" color="error" size="16" />
                          <v-icon v-else-if="uploadUserDataState === 2" icon="mdi-check" color="secondary" size="16" />
                          <v-progress-circular
                            v-else
                            indeterminate
                            :color="uploadUserDataState === 1 ? 'secondary' : 'background'"
                            size="16"
                            width="1"
                          />
                          <span>Uploading user data</span>
                        </div>
                        <div v-if="files" class="d-flex align-center" style="gap: 1rem">
                          <v-icon v-if="uploadTestState === -1" icon="mdi-help-circle-outline" size="16" />
                          <v-icon v-else-if="downloadFilesState === -1 || uploadFilesState === -1" icon="mdi-close" color="error" size="16" />
                          <v-icon v-else-if="uploadFilesState === 2" icon="mdi-check" color="secondary" size="16" />
                          <v-progress-circular
                            v-else
                            indeterminate
                            :color="uploadFilesState === 1 ? 'secondary' : 'background'"
                            size="16"
                            width="1"
                          />
                          <span>Uploading files</span>
                        </div>

                        <v-progress-linear
                          :model-value="uploadPercentageProgress"
                          :buffer-value="nextUploadPercentage"
                          color="secondary"
                          height="25"
                        >
                          <template #default>
                            {{ $formatBytes(uploadBytesProgress) }} of {{ $formatBytes(totalSize) }}
                          </template>
                        </v-progress-linear>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-window-item>
            <v-window-item>
              <v-empty-state
                color="secondary"
                icon="mdi-transfer"
                title="Migration Completed!"
                text="Your project has been migrated to your new server successfully!"
              />
            </v-window-item>
          </v-window>
        </v-card-text>
      </v-sheet>
      <v-card-actions>
        <v-btn
          v-if="panel === 2"
          variant="flat"
          @click="close"
        >
          Close
        </v-btn>
        <v-btn
          v-if="hasError"
          variant="flat"
          prepend-icon="mdi-arrow-left"
          @click="goBack"
        >
          Back
        </v-btn>
        <v-btn
          v-if="panel <= 1 && !hasError"
          :loading="migrating"
          :disabled="!canMigrate || panel !== 0"
          :color="canMigrate && panel === 0 ? 'warning' : undefined"
          variant="flat"
          append-icon="mdi-arrow-right"
          @click="migrate"
        >
          Migrate
        </v-btn>
        <v-btn
          v-if="panel < 2"
          :disabled="migrating && !hasError"
          @click="close"
        >
          <span>Cancel</span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
