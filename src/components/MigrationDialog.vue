<script setup lang="ts">
import {useUserData} from "@/composables/user-data";
import StructureSelector from "@/components/StructureSelector.vue";
import type {IStructure, IEndpoint} from '@/interfaces';
import {useGlobalStore} from "@/stores/global";
import {computed, ref, watch} from "vue";
import {useModelStore} from "@/stores/model";
import {useMigration} from "@/composables/migration";

const visible = defineModel<boolean>('visible');
const {
  structures = [],
} = defineProps<{
  structures: IStructure[],
}>();
const { getUserFiles, fetchUserData, userDataLoading } = useUserData();
const { structure, fromEndpoint, toEndpoint, includeStructure, includeUserData, userDataContent, includeFiles, fileList, migrating, downloadBytesProgress, uploadBytesProgress, canMigrate, migrateUserData, totalSize, downloadPercentageProgress, uploadPercentageProgress, downloadStructureState, downloadUserDataState, downloadFilesState, uploadStructureState, uploadUserDataState, uploadFilesState, hasError, downloadTestState, uploadTestState, resetStates, nextDownloadPercentage, nextUploadPercentage } = useMigration();
const globalStore = useGlobalStore();
const modelStore = useModelStore();
const panel = ref<number>(0);

const migrate = () => {
  if (structure.value) {
    panel.value++;
    migrateUserData(structure.value).then(() => {
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
const onStructureChange = () => {
  fileList.value = [];
  userDataContent.value = '';
  if (structure.value) {
    fromEndpoint.value = structure.value.endpoint;
    fetchUserData(structure.value).then(response => {
      if (structure.value) {
        fileList.value = getUserFiles(structure.value, response.data);
        userDataContent.value = response.data;
      }
    })
  }
}

const fromServer = computed((): (IEndpoint | undefined) => globalStore.session.endpoints.find(item => item.uuid === fromEndpoint.value));
const toServer = computed((): (IEndpoint | undefined) => globalStore.session.endpoints.find(item => item.uuid === toEndpoint.value));

watch(() => visible.value, () => {
  if (visible.value) {
    resetStates();

    panel.value = 0;
    structure.value = structures.find(item => item.uuid === modelStore.structure.uuid) ?? null;
    fromEndpoint.value = null;
    toEndpoint.value = null;
    includeStructure.value = false;
    includeUserData.value = true;
    userDataContent.value = '';
    includeFiles.value = false
    fileList.value = [];
    if (structure.value) {
      onStructureChange();
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

      <v-card-text :class="panel === 1 ? 'bg-background pa-4' : undefined">
        <v-window v-model="panel">
          <v-window-item>
            <div class="d-flex flex-column" style="gap: 1rem">
              <p>Choose the structure you wish to migrate.</p>
              <StructureSelector
                v-model="structure"
                :structures="structures"
                :loading="userDataLoading"
                label="Structure"
                type="admin"
                large-text
                clearable
                @update:model-value="onStructureChange"
              />

              <v-divider />

              <v-row>
                <v-col cols="12" md="6" class="d-flex flex-column" style="gap: 1rem">
                  <p>Choose the original server that contains the information you wish to transfer.</p>
                  <v-select
                    v-model="fromEndpoint"
                    :items="globalStore.session.endpoints.filter(item => item.uuid !== toEndpoint)"
                    :disabled="!structure"
                    item-title="url"
                    item-value="uuid"
                    label="Copy from"
                    prepend-inner-icon="mdi-webhook"
                    hide-details="auto"
                    required
                    clearable
                    autocomplete="endpoint"
                  />
                </v-col>
                <v-col cols="12" md="6" class="d-flex flex-column" style="gap: 1rem">
                  <p>Choose the new server that will receive the transferred information.</p>
                  <v-select
                    v-model="toEndpoint"
                    :items="globalStore.session.endpoints.filter(item => item.uuid !== fromEndpoint)"
                    :disabled="!structure || !fromEndpoint"
                    item-title="url"
                    item-value="uuid"
                    label="Copy to"
                    prepend-inner-icon="mdi-webhook"
                    hide-details="auto"
                    required
                    clearable
                    autocomplete="endpoint"
                  />
                </v-col>
              </v-row>

              <v-divider />

              <div class="d-flex align-center" style="gap: 1rem">
                <v-checkbox
                  v-model="includeUserData"
                  :disabled="!structure"
                  label="User data"
                  hide-details
                />
                <v-checkbox
                  v-model="includeFiles"
                  :disabled="!structure"
                  label="Files"
                  hide-details
                />
              </div>

              <v-expand-transition>
                <div v-if="structure">
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
                      <div v-if="includeStructure" class="d-flex align-center" style="gap: 1rem">
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
                        <span>Fetching structure content</span>
                      </div>
                      <div v-if="includeUserData" class="d-flex align-center" style="gap: 1rem">
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
                      <div v-if="includeFiles" class="d-flex align-center" style="gap: 1rem">
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
                      <div v-if="includeStructure" class="d-flex align-center" style="gap: 1rem">
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
                        <span>Uploading structure content</span>
                      </div>
                      <div v-if="includeUserData" class="d-flex align-center" style="gap: 1rem">
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
                      <div v-if="includeFiles" class="d-flex align-center" style="gap: 1rem">
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
