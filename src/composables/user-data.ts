import type {IField, IInterfaceData} from '@/interfaces';
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
  downloadFilesAsZip, loopThroughFields, isFieldType,
} from '@/utils';
import Rules from '@/rules';
import {useModelStore} from '@/stores/model';

export function useUserData() {

  const loading = ref(false);
  const loaded = ref(false);
  const downloading = ref(false);
  const saving = ref(false);
  const saved = ref(false);
  const globalStore = useGlobalStore();
  const modelStore = useModelStore();
  const { interfaceParsedData, interfaceIsPristine, interfaceHasError } = useInterface();

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

  const fetchUserData = () => {
    return new Promise((resolve, reject) => {
      if (modelStore.interface.hash && modelStore.interface.server_url) {
        const path = (modelStore.interface.server_url + '/data/' + (modelStore.interface.hash) || '');
        loading.value = true;
        Services.get(path, {
          'Content-Type': 'application/json',
          'X-Jms-Api-Key': modelStore.interface.server_secret,
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
    const sections = interfaceParsedData.value.sections as unknown as { [key: string]: IField; };
    loopThroughFields(sections, (field, path, data) => {
      if (isFieldType(field, 'file') && data.path && data.meta.size > 0) {
        files.push(modelStore.interface.server_url + '/' + data.path);
      }
    }, modelStore.userData)
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

  const saveUserData = async (): Promise<any> => {
    saving.value = true;

    const path = (modelStore.interface.server_url + '/data/' + (modelStore.interface.hash) || '');
    const { interfaceParsedData } = useInterface();
    const parsedData = getParsedUserData(interfaceParsedData.value, modelStore.userData, true);
    return Services.post(path, {
      hash: modelStore.interface.hash,
      data: parsedData,
      interface: interfaceParsedData.value,
    }, {
      'Content-Type': 'application/json',
      'X-Jms-Api-Key': modelStore.interface.server_secret,
    })
      .then(response => {
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
      ? parseFields(clonedFields, locales)
      : Object.assign({}, override, parseFields(clonedFields, locales));

    const processCallback = (parent: any, key: string, path: string) => {
      const overrideValue = getDataByPath(override, path);
      const field = getFieldByPath(fields, path);
      if (!field) {
        return;
      }

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
      const isArray = isFieldType(field, 'array');
      if (isArray || field.multiple) {
        if (!overrideValue || !Array.isArray(overrideValue)) {
          return;
        }
        if (isArray && field.fields) {
          parent[key] = [];
          overrideValue.forEach(overrideItem => {
            parent[key].push(getParsedFields(field.fields, locales, overrideItem));
          })
        } else if (field.items && Array.isArray(overrideValue)) {
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
    resetUserData,
    downloading,
    saveUserData,
    downloadUserData,
    getParsedUserData,
    setUserData,
  };
}
