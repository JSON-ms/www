import type {IField, IFile, IInterface, IInterfaceData} from '@/interfaces';
import {Services} from '@/services';
import {computed, ref} from 'vue';
import {useGlobalStore} from '@/stores/global';
import {useInterface} from '@/composables/interface';
import {
  deepToRaw,
  getDataByPath,
  getFieldByPath, objectsAreDifferent,
  parseFields,
  processObject,
  downloadFilesAsZip, loopThroughFields, isFieldType, generateHash, isFieldArrayType,
} from '@/utils';
import Rules from '@/rules';
import {useModelStore} from '@/stores/model';

const loading = ref(false);
const loaded = ref(false);
const downloading = ref(false);
const saving = ref(false);
const saved = ref(false);

export function useUserData() {
  const globalStore = useGlobalStore();
  const modelStore = useModelStore();
  const { interfaceParsedData, interfaceIsPristine, interfaceHasError, getParsedInterfaceData } = useInterface();

  const canFetchUserData = computed((): boolean => {
    return globalStore.session.loggedIn
      && canInteractWithServer.value;
  })

  const canInteractWithServer = computed((): boolean => {
    return !!(modelStore.interface.server_url)
      && !!(modelStore.interface.hash)
      && !interfaceHasError('server_url');
  })

  const userDataHasChanged = computed((): boolean => objectsAreDifferent(modelStore.userData, modelStore.originalUserData));

  const canSave = computed((): boolean => {
    return !saving.value
      && globalStore.session.loggedIn
      && canInteractWithServer.value
      // && !userDataHasError.value
      && userDataHasChanged.value
      && interfaceIsPristine.value;
  })

  const userDataHasError = computed((): boolean => {
    return Object.keys(getUserDataErrors()).length > 0;
  })

  const getUserDataErrors = (obj: {[key: string]: IField} = interfaceParsedData.value.sections as unknown as {[key: string]: IField}, prefix = ''): { [key: string]: string } => {
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
        }

        const checkError = (field: IField, checkValue: any, suffix: string = '') => {
          if (field.required && !Rules.required(checkValue)) {
            errors[fieldPath + suffix] = 'This field is required';
          }
        }
        const value = getFieldByPath(modelStore.userData, fieldPath);
        if (['array', 'i18n:array'].includes(parent?.type ?? '') && Array.isArray(value)) {
          value.forEach((val, index) => {
            if (field.fields) {
              dig(field.fields, fieldPath, field);
            }
            if (isFieldType(field, 'i18n')) {
              Object.keys(interfaceParsedData.value.locales).forEach(localeKey => {
                checkError(field, val[key] && val[key][localeKey], '[' + index + '].' + localeKey);
              })
            } else {
              checkError(field, val[key], '[' + index + ']');
            }
          })
        }
        else if (isFieldType(field, 'i18n')) {
          Object.keys(interfaceParsedData.value.locales).forEach(localeKey => {
            checkError(field, value && value[localeKey], '.' + localeKey);
          })
        } else {
          checkError(field, value);
        }
      })
    }
    dig(obj as unknown as { [key: string]: IField }, prefix);
    return errors;
  }

  const fetchUserDataSimple = (interfaceModel: IInterface = modelStore.interface): Promise<any> => {
    const path = (interfaceModel.server_url + '/data/' + (interfaceModel.hash) || '');
    return Services.get(path, {
      'Content-Type': 'application/json',
      'X-Jms-Api-Key': interfaceModel.server_secret,
    })
  }

  const fetchUserData = (interfaceModel: IInterface = modelStore.interface): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (interfaceModel.hash && interfaceModel.server_url) {
        loading.value = true;
        fetchUserDataSimple(interfaceModel).then(response => {
          loaded.value = true;
          const parsedInterface = getParsedInterfaceData(interfaceModel);
          response.data = getParsedUserData(parsedInterface, response.data);
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

  const getUserFiles = (interfaceModel: IInterface = modelStore.interface, data: any = modelStore.userData): IFile[] => {
    const parsedInterface = getParsedInterfaceData(interfaceModel);
    const files: IFile[] = [];
    const sections = parsedInterface.sections as unknown as { [key: string]: IField; };
    loopThroughFields(sections, (field, path, data) => {
      if (isFieldType(field, 'file')) {
        if (Array.isArray(data)) {
          data.forEach(file => {
            if (file.path && file.meta.size > 0) {
              files.push(file);
            }
          })
        }
        else if (data && data.path && data.meta.size > 0) {
          files.push(data);
        }
      }
    }, data)
    return files;
  }

  const testServer = (
    url: string,
    serverSecret: string,
  ): Promise<boolean> => {
    return Services.get(url + '/test/try', {
      'Content-Type': 'application/json',
      'X-Jms-Api-Key': serverSecret,
    }, true)
      .catch(globalStore.catchError)
  }

  const downloadUserData = () => {
    const files = getUserFiles().map(file => modelStore.interface.server_url + '/file/read/' + file.path);
    downloading.value = true;
    const path = (modelStore.interface.server_url + '/data/' + modelStore.interface.hash) || ''
    return Services.get(path, {
      'Content-Type': 'application/json',
      'X-Jms-Api-Key': modelStore.interface.server_secret,
    }, true)
      .then(response => {
        return downloadFilesAsZip(files, response, modelStore.interface.label);
      })
      .catch(globalStore.catchError)
      .finally(() => downloading.value = false);
  }

  const saveUserDataSimple = async (
    interfaceModel: IInterface = modelStore.interface,
    data: any = modelStore.userData,
    serverUrl?: string,
    serverSecret?: string,
  ): Promise<any> => {
    serverUrl = serverUrl ? serverUrl : interfaceModel.server_url;
    serverSecret = serverSecret ? serverSecret : interfaceModel.server_secret;
    const path = (serverUrl + '/data/' + (interfaceModel.hash) || '');
    const parsedInterface = getParsedInterfaceData(interfaceModel);
    const parsedData = getParsedUserData(parsedInterface, data, true);
    return Services.post(path, {
      hash: interfaceModel.hash,
      data: parsedData,
      interface: parsedInterface,
    }, {
      'Content-Type': 'application/json',
      'X-Jms-Api-Key': serverSecret,
    });
  }

  const saveUserData = async (
    interfaceModel: IInterface = modelStore.interface,
    data: any = modelStore.userData,
  ): Promise<any> => {
    saving.value = true;
    return saveUserDataSimple(interfaceModel, data).then(response => {
      setUserData(response.data, true);
      saved.value = true;
      setTimeout(() => saved.value = false, 1000);
    })
    .catch(globalStore.catchError)
    .finally(() => saving.value = false);
  }

  const setUserData = (data: any, setOriginal = false) => {
    const parsedData = getParsedUserData(interfaceParsedData.value, deepToRaw(data));
    modelStore.setUserData(parsedData, setOriginal);
  }

  const resetUserData = () => {
    modelStore.userData = structuredClone(deepToRaw(modelStore.originalUserData));
  }

  const getParsedFields = (fields: {[key: string]: IField}, locales: {[key: string]: string}, override: any = {}, clean = false): any => {

    const clonedFields = structuredClone(fields);
    const result: any = clean
      ? parseFields(clonedFields, locales, interfaceParsedData.value.schemas)
      : Object.assign({}, override, parseFields(clonedFields, locales, interfaceParsedData.value.schemas));

    const processCallback = (parent: any, key: string, path: string) => {
      const field = getFieldByPath(fields, path);
      if (!field) {
        return;
      }
      const defaultValue = field.default ? field.default : undefined;
      const overrideValue = getDataByPath(override, path, defaultValue);

      // Node
      if (isFieldType(field, 'node')) {
        return parent[key] = getParsedFields(field.fields, locales, overrideValue);
      }

      // Files
      if (isFieldType(field, 'file')) {
        if (typeof overrideValue === 'object' && overrideValue !== null && typeof overrideValue.path === 'string' && typeof overrideValue.meta === 'object') {
          return parent[key] = overrideValue;
        } else if (Array.isArray(overrideValue)) {
          parent[key] = [];
          overrideValue.forEach(value => {
            if (typeof value === 'object' && value !== null && typeof value.path === 'string' && typeof value.meta === 'object') {
              parent[key].push(value);
            }
          })
          return parent[key];
        }
        return parent[key];
      }

      // Array
      const isArray = isFieldArrayType(field);
      if (isArray || field.multiple) {
        if (!overrideValue || !Array.isArray(overrideValue)) {
          return;
        }
        if (isArray && field.fields && isFieldType(field, 'array')) {
          parent[key] = [];
          overrideValue.forEach(overrideItem => {
            parent[key].push(getParsedFields(field.fields, locales, overrideItem));
          })
        } else if (field.items && Array.isArray(overrideValue)) {
          return parent[key] = overrideValue;
        }

        // Make sure they all have hashes
        if (isFieldType(field, 'array')) {
          parent[key] = parent[key].map((item: any) => ({ ...item, hash: item.hash ?? generateHash(8) }))
        }
        // Otherwise just apply overridden value
        else if (Array.isArray(overrideValue)) {
          return parent[key] = overrideValue;
        }

        return parent[key];
      }

      // Number/String
      if (typeof parent[key] !== 'object' || typeof parent[key] !== null) {
        if (isFieldType(field, ['number', 'slider', 'rating'])) {
          return parent[key] = typeof overrideValue === 'number' ? overrideValue : field.required ? 0 : null;
        }
        if (isFieldType(field, 'boolean')) {
          return parent[key] = typeof overrideValue === 'boolean' ? overrideValue : field.required ? false : null;
        }
        return parent[key] = field.required && !overrideValue ? "" : overrideValue ?? null;
      }
    };
    processObject(result, processCallback, undefined, undefined, undefined, path => {
      const field = getFieldByPath(fields, path);
      if (isFieldType(field, 'file')) {
        return false;
      }
      return true;
    });
    return result;
  }

  const getParsedUserData = (data: IInterfaceData = interfaceParsedData.value, override: any = {}, clean = false): any => {
    const result: any = {};
    for (const key in data?.sections) {
      if (data?.sections[key]?.fields) {
        result[key] = getParsedFields(data?.sections[key].fields, data.locales, override[key], clean);
      }
    }
    return result;
  }

  return {
    userDataSaving: saving,
    userDataSaved: saved,
    userDataLoading: loading,
    userDataLoaded: loaded,
    canSave,
    getUserDataErrors,
    userDataHasError,
    userDataHasChanged,
    canFetchUserData,
    canInteractWithServer,
    fetchUserData,
    fetchUserDataSimple,
    resetUserData,
    downloading,
    saveUserData,
    saveUserDataSimple,
    downloadUserData,
    getParsedUserData,
    setUserData,
    getUserFiles,
    testServer,
  };
}
