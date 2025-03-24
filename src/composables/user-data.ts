import type {IField, IInterface, IInterfaceData} from '@/interfaces';
import {Services} from '@/services';
import {computed, type Ref, ref} from 'vue';
import {useGlobalStore} from '@/stores/global';
import {useInterface} from '@/composables/interface';
import {
  deepToRaw,
  getDataByPath,
  getFieldByPath, objectsAreDifferent,
  parseFields,
  processObject,
  downloadFilesAsZip, loopThroughFields,
} from '@/utils';
import Rules from '@/rules';

let instance: any = null;

export function useUserData(interfaceModel: Ref<IInterface>, userData: Ref<any>) {
  if (!instance) {
    const loading = ref(false);
    const loaded = ref(false);
    const downloading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const globalStore = useGlobalStore();
    const { interfaceParsedData, interfaceIsPristine } = useInterface(interfaceModel);
    const userOriginalData = ref(structuredClone(deepToRaw(userData.value)));

    const canFetchUserData = computed((): boolean => {
      return globalStore.session.loggedIn
        && canInteractWithServer.value;
    })

    const canInteractWithServer = computed((): boolean => {
      return !!(interfaceModel.value.server_url)
        && !!(interfaceModel.value.hash);
    })

    const userDataHasChanged = computed((): boolean => objectsAreDifferent(userData.value, userOriginalData.value));

    const canSave = computed((): boolean => {
      return !saving.value
        && canInteractWithServer.value
        && !userDataHasError.value
        && userDataHasChanged.value
        && interfaceIsPristine.value;
    })

    const userDataHasError = computed((): boolean => {
      return Object.keys(getUserDataErrors()).length > 0;
    })

    const getUserDataErrors = (obj = interfaceParsedData.value.sections, prefix = ''): { [key: string]: string } => {
      const errors: { [key: string]: string } = {};
      const dig = (fields: { [key: string]: IField }, parentPath = '', parent?: IField) => {
        Object.keys(fields).forEach(key => {
          const field = fields[key];
          if (!field) {
            return;
          }
          const fieldPath = parentPath === '' ? key : parentPath + '.' + key;
          if (field.fields) {
            dig(field.fields, fieldPath, field);
            return;
          }

          const checkError = (field: IField, checkValue: any, suffix: string = '') => {
            if (field.required && !Rules.required(checkValue)) {
              errors[fieldPath + suffix] = 'This field is required';
            }
          }
          const value = getFieldByPath(userData.value, fieldPath);
          if (parent?.type?.includes('array') && Array.isArray(value)) {
            value.forEach((val, index) => {
              if (field.fields) {
                dig(field.fields, fieldPath, field);
                return;
              }
              if (field.type.includes('i18n')) {
                Object.keys(interfaceParsedData.value.locales).forEach(localeKey => {
                  checkError(field, val[key] && val[key][localeKey], '[' + index + '].' + localeKey);
                })
              } else {
                checkError(field, val[key], '[' + index + ']');
              }
            })
          }
          else if (field.type.includes('i18n')) {
            Object.keys(interfaceParsedData.value.locales).forEach(localeKey => {
              checkError(field, value && value[localeKey], '.' + localeKey);
            })
          } else {
            checkError(field, value);
          }
        })
      }
      dig(obj, prefix);
      return errors;
    }

    const applyUserData = (response: any, alsoOriginalData = true) => {
      const parsedData = getParsedUserData(interfaceParsedData.value, deepToRaw(response));
      userData.value = structuredClone(parsedData);
      if (alsoOriginalData) {
        userOriginalData.value = structuredClone(parsedData);
      }
      // applySet('admin', userData, originalUserData);
    }

    const fetchUserData = () => {
      return new Promise((resolve, reject) => {
        if (interfaceModel.value.hash && interfaceModel.value.server_url) {
          loading.value = true;
          Services.get((interfaceModel.value.server_url + '?hash=' + (interfaceModel.value.hash) || ''), {
            'Content-Type': 'application/json',
            'X-Jms-Api-Key': interfaceModel.value.server_secret,
          })
            .then(response => {
              loaded.value = true;
              resolve(response);
              return response;
            })
            .catch(reason => {
              globalStore.catchError(reason);
              reject(reason);
            })
            .finally(() => loading.value = false);
        }
      })
    }

    const downloadUserData = () => {

      const files: string[] = [];
      loopThroughFields(interfaceParsedData.value.sections, userData.value, (field, data) => {
        if (['i18n:file', 'i18n:image', 'i18n:video', 'file', 'image', 'video'].includes(field.type)) {
          files.push(interfaceModel.value.server_url + '/' + data.path);
        }
      })
      downloading.value = true;
      return Services.get((interfaceModel.value.server_url + '?hash=' + interfaceModel.value.hash) || '', {
        'Content-Type': 'application/json',
        'X-Jms-Api-Key': interfaceModel.value.server_secret,
      }, true)
        .then(response => {
          return downloadFilesAsZip(files, response, interfaceModel.value.label);
        })
        .catch(globalStore.catchError)
        .finally(() => downloading.value = false);
    }

    const saveUserData = async (): Promise<any> => {
      saving.value = true;

      const { interfaceParsedData } = useInterface(interfaceModel);
      return Services.post(interfaceModel.value.server_url || '', {
        hash: interfaceModel.value.hash,
        data: userData.value,
        interface: interfaceParsedData.value,
      }, {
        'Content-Type': 'application/json',
        'X-Jms-Api-Key': interfaceModel.value.server_secret,
      })
        .then(response => {
          applyUserData(response.data);
        })
        .catch(globalStore.catchError)
        .finally(() => {
          saving.value = false;
          saved.value = true;
          setTimeout(() => saved.value = false, 1000);
        });
    }

    const resetUserData = () => {
      userData.value = structuredClone(deepToRaw(userOriginalData.value));
    }

    const getParsedFields = (fields: {[key: string]: IField}, locales: {[key: string]: string}, override: any = {}): any => {
      const result: any = parseFields(structuredClone(fields), locales);
      const processCallback = (parent: any, key: string, path: string) => {
        const overrideValue = getDataByPath(override, path);
        const field = getFieldByPath(fields, path);

        // Array
        if (['array', 'i18n:array'].includes(field.type) || field.multiple) {
          if (!overrideValue || !Array.isArray(overrideValue)) {
            return;
          }
          if (field.fields) {
            parent[key] = [];
            overrideValue.forEach(overrideItem => {
              parent[key].push(getParsedFields(field.fields, locales, overrideItem));
            })
          }
          return parent[key];
        }

        // Files
        if (['file', 'i18n:file', 'image', 'i18n:image', 'video', 'i18n:video'].includes(field.type)) {
          if (typeof overrideValue === 'object' && overrideValue !== null && typeof overrideValue.path === 'string' && typeof overrideValue.meta === 'object') {
            return parent[key] = overrideValue;
          }
          return parent[key];
        }

        // Number/String
        if ((typeof parent[key] !== 'object' || typeof parent[key] !== null) && ['number', 'string', 'boolean'].includes(typeof overrideValue)) {
          return parent[key] = overrideValue;
        }
      };
      processObject(result, processCallback);
      return result;
    }

    const getParsedUserData = (data: IInterfaceData = interfaceParsedData.value, override: any = {}): any => {
      const result: any = {};
      for (const key in data?.sections) {
        if (data?.sections[key]?.fields) {
          result[key] = getParsedFields(data?.sections[key].fields, data.locales, override[key]);
        }
      }
      return result;
    }

    userData.value = getParsedUserData(interfaceParsedData.value, userData.value);

    instance = {
      userDataSaving: saving,
      userDataSaved: saved,
      userDataLoading: loading,
      userDataLoaded: loaded,
      canSave,
      userData,
      getUserDataErrors,
      userDataHasError,
      userDataHasChanged,
      canFetchUserData,
      canInteractWithServer,
      applyUserData,
      fetchUserData,
      resetUserData,
      downloading,
      saveUserData,
      downloadUserData,
      getParsedUserData,
    };
  }

  return instance;
}
