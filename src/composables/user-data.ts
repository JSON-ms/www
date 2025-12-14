import type {IField, IFile, IStructure, IStructureData} from '@/interfaces';
import {Services} from '@/services';
import {computed, ref} from 'vue';
import {useGlobalStore} from '@/stores/global';
import {
  deepToRaw,
  getDataByPath,
  getFieldByPath,
  objectsAreDifferent,
  parseFields,
  processObject,
  downloadFilesAsZip,
  loopThroughFields,
  isFieldType,
  generateHash,
  isFieldArrayType,
  isNativeObject,
  updateObjectByPath,
  getFieldDefaultValue,
  isValidField,
  isFieldI18n,
  fieldHasChildren
} from '@/utils';
import Rules from '@/rules';
import {useModelStore} from '@/stores/model';
import {useTypings, isFolderSynced, lastStateTimestamp} from "@/composables/typings";
import {useStructure} from "@/composables/structure";

const loading = ref(false);
const loaded = ref(false);
const downloading = ref(false);
const saving = ref(false);
const saved = ref(false);

export function useUserData() {

  const globalStore = useGlobalStore();
  const modelStore = useModelStore();
  const { structureParsedData, structureHasError, structureIsPristine, getParsedStructureData } = useStructure();

  const canFetchUserData = computed((): boolean => {
    return globalStore.session.loggedIn
      && canInteractWithServer.value;
  })

  const canInteractWithServer = computed((): boolean => {
    return !!(modelStore.structure.server_url)
      && !!(modelStore.structure.hash)
      && !structureHasError('server_url');
  })

  const canInteractWithSyncedFolder = computed((): boolean => {
    // lastStateTimestamp is a hack to force digestion of typings
    return lastStateTimestamp.value > 0 && isFolderSynced(modelStore.structure, 'typescript');
  })

  const userDataHasChanged = computed((): boolean => objectsAreDifferent(modelStore.userData, modelStore.originalUserData));

  const canSave = computed((): boolean => {
    return !saving.value
      && globalStore.session.loggedIn
      && (canInteractWithServer.value || canInteractWithSyncedFolder.value)
      // && !userDataHasError.value
      && userDataHasChanged.value
      && structureIsPristine.value;
  })

  const userDataHasError = computed((): boolean => {
    return Object.keys(getUserDataErrors()).length > 0;
  })

  const getUserDataErrors = (obj: {[key: string]: IField} = structureParsedData.value.sections as unknown as {[key: string]: IField}, prefix = '', parent?: IField): { [key: string]: string } => {
    const errors: { [key: string]: string } = {};
    const dig = (fields: { [key: string]: IField }, parentPath = '', parent?: IField) => {
      Object.keys(fields).forEach(key => {
        const field = fields[key];
        if (!field) {
          return;
        }
        const fieldPath = parentPath === '' ? key : parentPath + '.' + key;
        if (fieldHasChildren(field)) {
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
            if (fieldHasChildren(field)) {
              dig(field.fields, fieldPath, field);
            }
            if (isFieldType(field, 'i18n')) {
              Object.keys(structureParsedData.value.locales).forEach(localeKey => {
                checkError(field, val[key] && val[key][localeKey], '[' + index + '].' + localeKey);
              })
            } else {
              checkError(field, val[key], '[' + index + ']');
            }
          })
        }
        else if (isFieldType(field, 'i18n')) {
          Object.keys(structureParsedData.value.locales).forEach(localeKey => {
            checkError(field, value && value[localeKey], '.' + localeKey);
          })
        } else {
          checkError(field, value);
        }
      })
    }
    dig(obj as unknown as { [key: string]: IField }, prefix, parent);
    return errors;
  }

  const fetchUserDataSimple = (structure: IStructure = modelStore.structure): Promise<any> => {
    const path = (structure.server_url + '/data/' + (structure.hash) || '');
    return Services.get(path, {
      'Content-Type': 'application/json',
      'X-Jms-Api-Key': structure.server_secret,
    })
  }

  const fetchUserData = (structure: IStructure = modelStore.structure): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (structure.hash && structure.server_url) {
        loading.value = true;
        fetchUserDataSimple(structure).then(response => {
          loaded.value = true;
          const parsedStructure = getParsedStructureData(structure);
          response.data = getParsedUserData(parsedStructure, response.data);
          resolve(response);
          return response;
        })
        .catch(reason => {
          reject(reason);
          globalStore.catchError(reason);
        })
        .finally(() => loading.value = false);
      } else {
        reject();
      }
    })
  }

  const getUserFiles = (structure: IStructure = modelStore.structure, data: any = modelStore.userData): IFile[] => {
    const parsedStructure = getParsedStructureData(structure);
    const files: IFile[] = [];
    const sections = parsedStructure.sections as unknown as { [key: string]: IField; };
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

  const changeServerUrlInContent = (
    structure: IStructure = modelStore.structure,
    data: any,
    fromServerUrl: string,
    toServerUrl: string
  ): any => {
    const parsedStructure = getParsedStructureData(structure);
    const sections = parsedStructure.sections as unknown as { [key: string]: IField; };
    const newData = structuredClone(data);

    loopThroughFields(sections, (field, path, fieldData) => {
      if (isFieldType(field, ['markdown', 'wysiwyg'])) {
        if (isNativeObject(fieldData)) {
          const keys = Object.keys(fieldData);
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (typeof fieldData[key] === 'string') {
              const newValue = fieldData[key].replace(new RegExp(fromServerUrl, 'g'), toServerUrl)
              updateObjectByPath(newData, path + '.' + key, newValue);
            }
          }
        } else if (typeof fieldData === 'string') {
          const newValue = fieldData.replace(new RegExp(fromServerUrl, 'g'), toServerUrl)
          updateObjectByPath(newData, path, newValue);
        }
      }
    }, data);

    return newData;
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
    const files = getUserFiles().map(file => modelStore.structure.server_url + '/file/get/' + file.path);
    downloading.value = true;
    const path = (modelStore.structure.server_url + '/data/' + modelStore.structure.hash) || ''
    return Services.get(path, {
      'Content-Type': 'application/json',
      'X-Jms-Api-Key': modelStore.structure.server_secret,
    }, true)
      .then(response => {
        return downloadFilesAsZip(files, response, modelStore.structure.label, globalStore.userSettings.data.editorTabSize);
      })
      .catch(globalStore.catchError)
      .finally(() => downloading.value = false);
  }

  const saveUserDataSimple = async (
    structure: IStructure = modelStore.structure,
    data: any = modelStore.userData,
    serverUrl?: string,
    serverSecret?: string,
  ): Promise<any> => {
    serverUrl = serverUrl ? serverUrl : structure.server_url;
    serverSecret = serverSecret ? serverSecret : structure.server_secret;
    const path = (serverUrl + '/data/' + (structure.hash) || '');
    const parsedStructure = getParsedStructureData(structure);
    const parsedData = getParsedUserData(parsedStructure, data, true);
    return Services.post(path, {
      hash: structure.hash,
      data: parsedData,
      structure: parsedStructure,
    }, {
      'Content-Type': 'application/json',
      'X-Jms-Api-Key': serverSecret,
    });
  }

  const saveUserData = async (
    structure: IStructure = modelStore.structure,
    data: any = modelStore.userData,
    onlyEndpoint = false,
  ): Promise<IStructure> => {
    return new Promise((resolve) => {
      if (canInteractWithServer.value) {
        saving.value = true;
        return saveUserDataSimple(structure, data).then(response => {
          setUserData(response.data, true);
          if (!onlyEndpoint) {
            useTypings().syncToFolder(structure, 'typescript', ['data']);
          }
          saved.value = true;
          setTimeout(() => saved.value = false, 1000);
          resolve(data);
        })
        .catch(reason => {
          if (canInteractWithSyncedFolder.value && !onlyEndpoint) {
            useTypings().syncToFolder(structure, 'typescript', ['data']);
            saved.value = true;
            setTimeout(() => saved.value = false, 1000);
          }
          globalStore.catchError(reason);
        })
        .finally(() => saving.value = false);
      } else {
        setUserData(data, true);
        if (!onlyEndpoint) {
          useTypings().syncToFolder(structure, 'typescript', ['data']);
        }
        resolve(data);
      }
    })
  }

  const cleanUserData = () => {
    const parsedStructure = getParsedStructureData(modelStore.structure);
    const data = getParsedUserData(parsedStructure, modelStore.userData, true);
    setUserData(data, true);
  }

  const setUserData = (data: any, setOriginal = false) => {
    const parsedData = getParsedUserData(structureParsedData.value, structuredClone(deepToRaw(data)), globalStore.userSettings.data.autoCleanData);
    modelStore.setUserData(parsedData, setOriginal);
  }

  const resetUserData = () => {
    const originalData = deepToRaw(modelStore.originalUserData);
    const parsedData = getParsedUserData(structureParsedData.value, structuredClone(originalData));
    modelStore.setUserData(parsedData, true);
  }

  const getParsedFields = (fields: {[key: string]: IField}, locales: {[key: string]: string}, override: any = {}, clean = false): any => {

    const clonedFields = structuredClone(fields);
    const clonedParsedFields = parseFields(clonedFields, locales, structureParsedData.value.schemas);
    const result: any = clean
      ? clonedParsedFields
      : Object.assign({}, override, clonedParsedFields);

    const processCallback = (parent: any, key: string, path: string, obj: any) => {
      const field = getFieldByPath(fields, path);
      if (!field) {
        return;
      }

      if (isFieldArrayType(field) && !isFieldI18n(field) && !Array.isArray(obj) && obj !== null) {
        return parent[key] = [];
      }

      const defaultValue = getFieldDefaultValue(field, locales);
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
        const arrCallback = (parent: any, key: string, overrideValue: any): any => {
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
        if (isFieldI18n(field)) {
          const values: {[key: string]: any[]} = {};
          Object.entries(locales).forEach(([locale]) => {
            values[locale] = [];
            if (isNativeObject(parent[key]) && parent[key][locale]) {
              values[locale] = arrCallback(parent[key], locale, overrideValue[locale]);
            } else {
              values[locale] = parent[key] ?? [];
            }
          })
          return parent[key] = values;
        } else {
          return parent[key] = arrCallback(parent, key, overrideValue);
        }
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
    processObject(result, processCallback, undefined, undefined, undefined, (path: string, obj: any) => {
      const field = getFieldByPath(fields, path);

      if (isFieldArrayType(field) && !Array.isArray(obj) && !isFieldI18n(field)) {
        return false;
      }

      return !isValidField(field) && !isFieldI18n(field);
    });
    return result;
  }

  const getParsedUserData = (data: IStructureData = structureParsedData.value, override: any = {}, clean = false): any => {
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
    canInteractWithSyncedFolder,
    fetchUserData,
    fetchUserDataSimple,
    resetUserData,
    downloading,
    saveUserData,
    saveUserDataSimple,
    downloadUserData,
    getParsedUserData,
    setUserData,
    cleanUserData,
    getUserFiles,
    testServer,
    changeServerUrlInContent,
  };
}
