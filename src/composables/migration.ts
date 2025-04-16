import type {IFile, IStructure} from "@/interfaces";
import {computed, ref} from "vue";
import {useUserData} from "@/composables/user-data";
import {urlsToBlobArray} from "@/utils";
import {Services} from "@/services";
import {useGlobalStore} from "@/stores/global";

export function useMigration() {

  const globalStore = useGlobalStore();
  const { fetchUserDataSimple, saveUserDataSimple, getUserFiles, testServer, changeServerUrlInContent } = useUserData();

  const structure = ref<IStructure | null>(null);
  const fromWebhook = ref<string | null>(null);
  const toWebhook = ref<string | null>(null);
  const includeStructure = ref<boolean>(false);
  const includeUserData = ref<boolean>(true);
  const userDataContent = ref<any>('');
  const includeFiles = ref<boolean>(false);
  const fileList = ref<IFile[]>([]);

  const downloadTestState = ref<number>(0);
  const downloadStructureState = ref<-1 | 0 | 1 | 2>(0);
  const downloadUserDataState = ref<-1 | 0 | 1 | 2>(0);
  const downloadFilesState = ref<-1 | 0 | 1 | 2>(0);
  const uploadTestState = ref<number>(0);
  const uploadStructureState = ref<-1 | 0 | 1 | 2>(0);
  const uploadUserDataState = ref<-1 | 0 | 1 | 2>(0);
  const uploadFilesState = ref<-1 | 0 | 1 | 2>(0);

  const migrating = ref(false);
  const downloadBytesProgress = ref(0);
  const nextDownloadBytes = ref(0);
  const uploadBytesProgress = ref(0);
  const nextUploadBytes = ref(0);

  const hasError = computed((): boolean => {
    return downloadTestState.value === -1
      || downloadStructureState.value === -1
      || downloadUserDataState.value === -1
      || downloadFilesState.value === -1
      || uploadTestState.value === -1
      || uploadStructureState.value === -1
      || uploadUserDataState.value === -1
      || uploadFilesState.value === -1;
  });

  const resetStates = () => {
    downloadTestState.value = 0;
    downloadStructureState.value = 0;
    downloadUserDataState.value = 0;
    downloadFilesState.value = 0;
    uploadTestState.value = 0;
    uploadStructureState.value = 0;
    uploadUserDataState.value = 0;
    uploadFilesState.value = 0;

    downloadBytesProgress.value = 0;
    uploadBytesProgress.value = 0;
    nextDownloadBytes.value = 0;
    nextUploadBytes.value = 0;
  }

  const canMigrate = computed((): boolean => {
    return !migrating.value
      && structure.value !== null
      && fromWebhook.value !== null
      && toWebhook.value !== null
      && fromWebhook.value !== toWebhook.value
      && (
        includeStructure.value
        || includeUserData.value
        || includeFiles.value
      );
  })

  const migrateUserData = (structure: IStructure): Promise<void> => {
    return new Promise((resolve, reject) => {

      const fromServer = globalStore.session.webhooks.find(item => item.uuid === fromWebhook.value)
      const toServer = globalStore.session.webhooks.find(item => item.uuid === toWebhook.value)
      if (!fromServer || !toServer) {
        reject();
      }

      const fromServerUrl = structure?.server_url || '';
      const fromServerSecret = structure?.server_secret || '';
      const toServerUrl = toServer?.url || '';
      const toServerSecret = toServer?.secret || '';

      migrating.value = true;

      // Reinitialize states
      resetStates();

      // Executed at the end of every call to determine if everything has been migrated or not...
      const callback = () => {
        let completedSteps = 0;
        if (!includeStructure.value || (downloadStructureState.value === 2 && uploadStructureState.value === 2)) {
          completedSteps++;
        }
        if (!includeUserData.value || (downloadUserDataState.value === 2 && uploadUserDataState.value === 2)) {
          completedSteps++;
        }
        if (!includeFiles.value || (downloadFilesState.value === 2 && uploadFilesState.value === 2)) {
          completedSteps++;
        }
        if (completedSteps === 3) {
          migrating.value = false;
          resolve();
        }
      }

      const rejectCallback = (reason: any) => {
        migrating.value = false;
        reject(reason);
      }

      // Download/Upload structure structure
      // if (includeStructure.value) {
      //   downloadStructureState.value = 2;
      //   downloadBytesProgress.value += structure.content.length;
      //
      //   uploadStructureState.value = 1;
      //   saveStructureSimple(structure).then(() => {
      //     uploadStructureState.value = 2;
      //     uploadBytesProgress.value += structure.content.length;
      //     callback();
      //   }).catch(reason => {
      //     uploadStructureState.value = -1;
      //     rejectCallback(reason);
      //   })
      // }

      // First test if servers are responding
      downloadTestState.value = 1;
      testServer(fromServerUrl, fromServerSecret).then(() => {
        downloadTestState.value = 2;
        uploadTestState.value = 1;
        testServer(toServerUrl, toServerSecret).then(() => {
          uploadTestState.value = 2;

          // Download/Upload user data
          if (includeUserData.value) {
            downloadUserDataState.value = 1;
            fetchUserDataSimple(structure).then(response => {
              const newData = changeServerUrlInContent(structure, response.data, fromServerUrl, toServerUrl);
              const userDataLength = JSON.stringify(response.data).length;
              downloadUserDataState.value = 2;
              downloadBytesProgress.value += userDataLength;

              uploadUserDataState.value = 1;
              saveUserDataSimple(structure, newData, toServerUrl, toServerSecret).then(() => {
                uploadUserDataState.value = 2;
                uploadBytesProgress.value += userDataLength;
                callback();
              }).catch(reason => {
                uploadUserDataState.value = -1;
                rejectCallback(reason);
              })

              // Download/Upload files
              if (includeFiles.value) {
                downloadFilesState.value = 1;
                let totalUploadedFiles = 0;
                const files = getUserFiles(structure, response.data);
                const urls = files.map(file => fromServerUrl + '/file/read/' + file.path);
                if (urls.length === 0) {
                  uploadFilesState.value = 2;
                  callback();
                }
                urlsToBlobArray(urls, toServerSecret, (item, index) => {
                  downloadBytesProgress.value += files[index].meta.size;

                  if (uploadFilesState.value === -1) {
                    return;
                  }

                  // Upload item
                  if (uploadFilesState.value === 0) {
                    uploadFilesState.value = 1;
                  }
                  const file = new File([item.blob], item.filename, { type: item.blob.type });
                  nextUploadBytes.value += files[index].meta.size;
                  Services.upload(toServerUrl + '/file/upload/' + structure.hash, file, undefined, {
                    'X-Jms-Api-Key': toServerSecret,
                  })
                    .then(() => {
                      nextUploadBytes.value -= files[index].meta.size;
                      totalUploadedFiles++;
                      uploadBytesProgress.value += files[index].meta.size;
                      if (totalUploadedFiles === files.length) {
                        uploadFilesState.value = 2;
                      }
                      callback();
                    }).catch(reason => {
                    uploadFilesState.value = -1;
                    rejectCallback(reason);
                  })
                }, (url, index) => {
                  nextDownloadBytes.value = fileList.value[index].meta.size;
                }).then(() => {
                  downloadFilesState.value = 2;
                }).catch(reason => {
                  downloadFilesState.value = -1;
                  rejectCallback(reason);
                })
              }
            }).catch(reason => {
              downloadUserDataState.value = -1;
              rejectCallback(reason);
            })
          }
        }).catch(reason => {
          uploadTestState.value = -1;
          rejectCallback(reason);
        })
      }).catch(reason => {
        downloadTestState.value = -1;
        rejectCallback(reason);
      })
    })
  }

  const totalSize = computed((): number => {
    let size = 0;
    if (includeStructure.value && structure.value) {
      size += structure.value.content.length;
    }
    if (includeUserData.value && userDataContent.value) {
      size += JSON.stringify(userDataContent.value).length;
    }
    if (includeFiles.value) {
      size += fileList.value.reduce((acc: number, file: IFile) => acc + file.meta.size, 0);
    }
    return size;
  })

  const downloadPercentageProgress = computed((): number => {
    return downloadBytesProgress.value * 100 / totalSize.value;
  })
  const uploadPercentageProgress = computed((): number => {
    return uploadBytesProgress.value * 100 / totalSize.value;
  })

  const nextDownloadPercentage = computed((): number => {
    return nextDownloadBytes.value * 100 / totalSize.value;
  })
  const nextUploadPercentage = computed((): number => {
    return nextUploadBytes.value * 100 / totalSize.value;
  })

  return {
    structure,
    fromWebhook,
    toWebhook,
    includeStructure,
    includeUserData,
    userDataContent,
    includeFiles,
    fileList,
    migrating,
    downloadBytesProgress,
    uploadBytesProgress,
    canMigrate,
    migrateUserData,
    hasError,
    resetStates,
    totalSize,
    downloadTestState,
    downloadPercentageProgress,
    uploadPercentageProgress,
    downloadStructureState,
    downloadUserDataState,
    downloadFilesState,
    uploadTestState,
    uploadStructureState,
    uploadUserDataState,
    uploadFilesState,
    nextDownloadPercentage,
    nextUploadPercentage,
  };
}
