import {computed, ref} from 'vue';
import {
  getStructure,
  isNativeObject,
  objectsAreDifferent,
  isFieldType,
  getDataByPath,
  valueToString,
  parseStringValue,
  getFieldSchemaKey,
  loopThroughFields,
  isValidField,
  deepToRaw,
  isFieldI18n, dataToFieldPath
} from '@/utils';
import type {IField, IStructure, IStructureData, IServerSettings, IEndpoint} from '@/interfaces';
import Rules from '@/rules';
import {useGlobalStore} from '@/stores/global';
import {Services} from '@/services';
import {useRoute} from 'vue-router';
import defaultStructure  from '@/assets/default-structure.json';
import {Composer, Parser, LineCounter, Document } from 'yaml'
import merge from 'ts-deepmerge';
import {useModelStore} from '@/stores/model';
import {useTypings} from "@/composables/typings";
import {parseYamlAndFindPaths, type PathValue} from "@/composables/yaml";

export interface EditorAnnotation {
  row: number,
  column: number,
  text: string
  value: string
  type: 'error' | 'warning' | 'info'
}
const siteCompatible = ref(false);
const siteNotCompatibleSnack = ref(false);
const structureStates = ref({
  saving: false,
  saved: false,
  deleting: false,
  deleted: false,
  loadingSecretKey: false,
  secretKeyLoaded: false,
  loadingCypherKey: false,
  cypherKeyLoaded: false,
})
const serverSettings = ref<IServerSettings>({
  postMaxSize: '8M',
  publicUrl: '',
  supportedFeatures: [],
  uploadMaxSize: '2M',
  version: '',
})

export function useStructure() {

  const globalStore = useGlobalStore();
  const modelStore = useModelStore();
  const currentRoute = useRoute();
  const yamlException = ref<(EditorAnnotation)[]>([]);

  const adminBaseUrl = ref(window.location.origin);
  const secretKey = ref('');
  const cypherKey = ref('');

  const canOpenAdminUrl = computed((): boolean => {
    return !!(modelStore.structure.uuid) || !globalStore.session.loggedIn;
  })
  const adminUrl = computed((): string => {
    return adminBaseUrl.value + '/admin/' + (modelStore.structure.hash || 'demo');
  })
  const endpoint = computed((): IEndpoint | null => {
    return globalStore.session.endpoints.find(endpoint => endpoint.uuid === modelStore.structure.endpoint) ?? null;
  })
  const computedServerSecretKey = computed((): string => {
    return structureStates.value.secretKeyLoaded
      ? secretKey.value
      : endpoint.value?.secret || '';
  })
  const computedCypherKey = computed((): string => {
    return structureStates.value.cypherKeyLoaded
      ? cypherKey.value
      : endpoint.value?.cypher || '';
  })

  const structureIsPristine = computed((): boolean => {
    return !objectsAreDifferent(modelStore.structure, modelStore.originalStructure, [
      'label', 'logo', 'content', 'permission_admin', 'permission_structure', 'endpoint'
    ]) && modelStore.structure.content === modelStore.temporaryContent;
  })

  const getYamlItemByPath = (doc: Document.Parsed<any>, path: string, lineCounter: LineCounter): any => {
    const loop = (items: any): any => {
      const splitPath = path.split('.');
      const currentKey = splitPath.shift();
      path = splitPath.join('.');
      for (const item of items) {
        if (item.key.source === currentKey) {
          if (splitPath.length === 0) {
            const line = lineCounter.linePos(item.value?.range[0]);
            return {
              ...item,
              ...line,
            }
          } else if (Array.isArray(item.value?.items)) {
            return loop(item.value.items);
          }
        }
      }
    }
    return loop(doc.contents.items || []);
  }

  type YamlErrorCallback = (value: any, key: string) => string | boolean;
  type YamlErrorCheckList = { [key: string]: YamlErrorCallback }
  const getYamlEditorExceptions = (doc: Document.Parsed<any>, lineCounter: LineCounter): EditorAnnotation[] => {
    if (!doc.contents.items) {
      const line = lineCounter.linePos(doc.contents.range[0]);
      return [{
        row: line.line - 1,
        column: line.col,
        text: 'Unable to parse YAML document.',
        type: 'error',
        value: 'Undefined',
      }];
    }

    const errors: EditorAnnotation[] = [];
    const errorList: YamlErrorCheckList = {
      'global.title': (value, key) => Rules.required(value) || `Property ${key} is missing in the document.`,
      'global.preview': (value) => !value || Rules.isUrl(value) || 'Must be a valid URL',
    };
    Object.keys(errorList).forEach(key => {
      const callback = errorList[key];
      const item = getYamlItemByPath(doc, key, lineCounter);
      if (!item) {
        const text = callback(null, key);
        if (typeof text === 'string') {
          errors.push({
            row: 0,
            column: 0,
            text,
            type: 'error',
            value: 'Undefined',
          });
        }
      } else {
        const result = callback(item.value?.value, key);
        if (typeof result === 'string') {
          const line = lineCounter.linePos(item.value.range[0]);
          errors.push({
            row: line.line - 1,
            column: line.col,
            text: result,
            type: 'error',
            value: item.value?.value,
          });
        }
      }
    })
    return errors;
  }

  const isFieldVisible = (field: IField, currentPath?: string): boolean => {
    if (field.conditional) {
      const conditions = Array.isArray(field.conditional) ? field.conditional : [field.conditional];
      for (let i = 0; i < conditions.length; i++) {
        const subConditions = conditions[i].split('&');
        for (let j = 0; j < subConditions.length; j++) {
          const subCondition = subConditions[j];
          const [ path, operator, ...expectedValue ] = subCondition.split(' ').map((item: string) => item.trim());

          let adjustedPath = path;
          let adjustedExpectedValue = expectedValue.join(' ');
          adjustedExpectedValue = parseStringValue(adjustedExpectedValue);
          if (typeof adjustedExpectedValue === 'string') {
            if (adjustedExpectedValue.startsWith('"') && adjustedExpectedValue.endsWith('"')) {
              adjustedExpectedValue = adjustedExpectedValue.slice(1, -1);
            }
            adjustedExpectedValue = adjustedExpectedValue.replace(/\\"/g, '"')
          }

          if (path.startsWith('this.')) {
            adjustedPath = (currentPath ? currentPath + '.' : '') + path.substring(5);
          }
          const value = getDataByPath(modelStore.userData, adjustedPath);
          if (
            (operator === '===' && value === adjustedExpectedValue)
            || (operator === '!==' && value !== adjustedExpectedValue)
            || (operator === '>' && value > adjustedExpectedValue)
            || (operator === '>=' && value >= adjustedExpectedValue)
            || (operator === '<' && value < adjustedExpectedValue)
            || (operator === '<=' && value <= adjustedExpectedValue)
            || (operator === '==' && valueToString(value) === valueToString(adjustedExpectedValue))
            || (operator === '!=' && valueToString(value) !== valueToString(adjustedExpectedValue))
          ) {
            return true;
          }
        }
      }
    } else {
      return true;
    }
    return false;
  }

  const getParsedStructure = (data: IStructure = getStructure()): IStructureData | null => {
    let parseData: any = {};
    try {
      const lineCounter = new LineCounter();
      const tokens = new Parser(lineCounter.addNewLine).parse(data.content);
      const docs = new Composer().compose(tokens);

      yamlException.value = [];
      const json = Array.from(docs, doc => {
        const errors = getYamlEditorExceptions(doc, lineCounter);
        yamlException.value.push(...errors);
        return doc.toJS()
      })[0];
      if (yamlException.value.length > 0) {
        return null;
      }
      if (json === undefined) {
        return defaultStructure  as IStructureData;
      }
      const mergedStructure: any = merge(defaultStructure  as IStructureData, json);
      if (Object.keys(mergedStructure.locales).length === 0) {
        mergedStructure.locales = { 'en-US': 'English (US)' };
      }
      parseData = mergedStructure as IStructureData;
    } catch (e: any) {
      console.error(e);
      return null;
    }

    // @ts-expect-error process.env is parsed from backend
    const version = JSON.parse(process.env.APP_VERSION);
    parseData.global.copyright = (parseData.global.copyright || '').replace('{{version}}', version);

    // Check that all fields have required properties.
    const checkFields = (fields: {[key: string]: IField}): void => {
      Object.keys(fields).forEach(key => {
        const field = fields[key];
        if (isNativeObject(field)) {
          field.type = field.type ?? 'unknown';
          if (typeof field.type !== 'string') {
            field.type = 'unknown';
          }
          field.fields = isNativeObject(field.fields) ? field.fields : {};

          if (field.type.startsWith('schemas.')) {
            const schemaKey = getFieldSchemaKey(field);
            field.type = 'node';
            if (schemaKey) {
              field.fields = parseData.schemas[schemaKey] ?? {};
            }
          }

          checkFields(field.fields);

          if (isFieldType(field, 'array')) {
            field.items = Array.isArray(field.items)
              ? field.items
              : isNativeObject(field.items)
                ? field.items
                : {};
          }
        } else {
          fields[key] = {
            type: 'unknown',
            label: 'Unknown',
            fields: {},
          }
        }
      })
    }
    if (!isNativeObject(parseData.sections)) {
      parseData.sections = {};
    }
    checkFields(parseData.sections);

    return parseData;
  }

  let lastParsedData: IStructureData | null;
  const getParsedStructureData = (value: IStructure = modelStore.structure): IStructureData => {
    const parsedData = getParsedStructure(value);
    if (parsedData) {
      lastParsedData = parsedData;
      return parsedData;
    }
    if (lastParsedData) {
      return lastParsedData;
    }
    return defaultStructure ;
  }

  const structureHasSection = (section: string, data: IStructureData = structureParsedData.value) => {
    const keys = Object.keys(data.sections);
    return !!(keys.find(key => key === section));
  }

  const getAvailableSection = (data: IStructureData = structureParsedData.value, section = currentRoute.params.section): string => {
    const keys = Object.keys(data.sections);
    const found = keys.find(item => item === section);
    return found ?? keys[0] ?? 'home';
  }

  const getAvailableLocale = (data: IStructureData = structureParsedData.value, locale = currentRoute.params.locale): string => {
    const keys = Object.keys(data.locales);
    const found = keys.find(item => item === locale);
    const shortFound = keys.find(item => item.substring(0, 2) === locale?.toString().substring(0, 2));
    return found ?? shortFound ?? keys[0] ?? 'en-US';
  }

  const structureHasLocale = (locale: string, data: IStructureData = structureParsedData.value) => {
    const keys = Object.keys(data.locales);
    return !!(keys.find(key => key === locale));
  }

  const structureParsedData = computed((): IStructureData => {
    return getParsedStructureData();
  })

  const applyTemplate = (template: string, hash?: string, updateLabel = true) => {
    if (hash === 'new') {
      modelStore.structure = getStructure();
    }
    modelStore.structure.content = template;
    modelStore.structure.hash = hash ?? modelStore.structure.hash;

    if (hash === 'new') { // Needs to be after... do not merge with hash === new condition upstairs
      if (updateLabel) {
        modelStore.structure.content = modelStore.structure.content.replace('title: Dynamic Admin Panel Example', 'title: Untitled');
      }
      modelStore.structure.label = 'Untitled';
      modelStore.structure.logo = undefined;
    } else {
      modelStore.structure.label = structureParsedData.value.global.title ?? '';
      modelStore.structure.logo = structureParsedData.value.global.logo ?? '';
    }

    modelStore.structure.content = template;
    modelStore.setOriginalStructure(modelStore.structure)
  }

  const resetStructureSettings = () => {
    settingsKeys.forEach(key => {
      // @ts-expect-error keys are defined
      modelStore.structure[key] = structuredClone(modelStore.originalStructure[key]);
    })
  }

  const resetStructure = () => {
    siteCompatible.value = false;
    siteNotCompatibleSnack.value = false;
    modelStore.setOriginalStructure(modelStore.structure);
    serverSettings.value = {
      postMaxSize: '8M',
      publicUrl: '',
      supportedFeatures: [],
      uploadMaxSize: '2M',
      version: '',
    };
    structureStates.value = {
      saving: false,
      saved: false,
      deleting: false,
      deleted: false,
      loadingSecretKey: false,
      secretKeyLoaded: false,
      loadingCypherKey: false,
      cypherKeyLoaded: false,
    }
  }

  const getStructureRules = (key: string | null = null): ((value: any) => (string | boolean))[] => {
    const rules = [];
    if ([null, 'server_url'].includes(key)) {
      rules.push((value: string) => !value || Rules.isUrl(value) || 'This field must contain a valid URL');
      rules.push((value: string) => Rules.maxLength(value, 255) || 'This field must contain 255 characters or fewer.');
    }
    if ([null, 'permission_admin', 'permission_structure'].includes(key)) {
      rules.push((items: string[]) => (items || []).every(value => Rules.email(value)) || 'All items from this list must be valid email addresses.');
    }
    return rules;
  }

  const getStructureErrors = (keys: string | string[] = Object.keys(modelStore.structure)): { key: string, value: string }[] => {
    const errors: { key: string, value: string }[] = [];
    keys = Array.isArray(keys) ? keys : [keys];
    keys.forEach(key => {
      const rules = getStructureRules(key);
      for (const index in rules) {
        const rule = rules[index];
        // @ts-expect-error I don't know why...
        const result = rule(modelStore.structure[key]);
        if (typeof result === 'string') {
          errors.push({ key, value: result });
        }
      }
    })
    return errors;
  }

  const settingsKeys = [
    'server_url',
    'permission_admin',
    'permission_structure',
  ]
  const structureHasSettingsError = computed((): boolean => {
    return getStructureErrors(settingsKeys).length > 0;
  });

  const structureHasError = (keys: string | string[] = Object.keys(modelStore.structure)): boolean => {
    return getStructureErrors(keys).length > 0;
  }

  const getSecretKeySimple = async (endpointUuid: string): Promise<string> => {
    return Services.get(import.meta.env.VITE_SERVER_URL + '/endpoint/secret-key/' + endpointUuid);
  }

  const getSecretKey = async (): Promise<string> => {
    structureStates.value.loadingSecretKey = true;
    structureStates.value.secretKeyLoaded = false;
    return getSecretKeySimple(endpoint.value?.uuid || '')
      .then(response => {
        secretKey.value = response;
        structureStates.value.secretKeyLoaded = true;
        return response;
      })
      .catch(error => globalStore.catchError(error))
      .finally(() => structureStates.value.loadingSecretKey = false)
  }

  const getCypherKey = async (): Promise<string> => {
    structureStates.value.loadingCypherKey = true;
    structureStates.value.cypherKeyLoaded = false;
    return Services.get(import.meta.env.VITE_SERVER_URL + '/endpoint/cypher-key/' + endpoint.value?.uuid)
      .then(response => {
        cypherKey.value = response;
        structureStates.value.cypherKeyLoaded = true;
        return response;
      })
      .catch(error => globalStore.catchError(error))
      .finally(() => structureStates.value.loadingCypherKey = false)
  }

  const createStructure = (): Promise<IStructure> => {
    return new Promise((resolve) => {
      globalStore.setPrompt({
        ...globalStore.prompt,
        visible: true,
        title: 'New Document',
        body: 'If you create a new document, you may lose any unsaved work. Do you want to continue?',
        btnText: 'Create',
        btnIcon: 'mdi-plus',
        btnColor: 'secondary',
        callback: () => new Promise(promptResolve => {
          resolve(modelStore.structure);
          promptResolve();
        })
      })
    })
  }

  const saveStructureSimple = (
    structure: IStructure = modelStore.structure,
  ): Promise<IStructure> => {
    const parsedStructureData = getParsedStructure(structure);
    const body = {
      content: { ...structure },
      data: {},
    }
    if (parsedStructureData) {
      body.content.label = parsedStructureData.global.title ?? 'Untitled';
      body.content.logo = parsedStructureData.global.logo ?? null;
      body.data = parsedStructureData;
    }
    const promises = [
      Services.post(import.meta.env.VITE_SERVER_URL + '/structure' + (structure.uuid ? '/' + structure.uuid : ''), body)
    ];
    if (structure.hash && structure.hash !== 'new' && structure.server_url) {
      const path = (structure.server_url + '/structure/save/' + (structure.hash) || '');
      promises.push(
        Services.post(path, parsedStructureData, {
          'Content-Type': 'application/json',
          'X-Jms-Api-Key': structure.server_secret,
        })
      )
    }
    return Promise.all(promises).then(response => {
      return response[0];
    })
  }

  const saveStructure = (structure: IStructure = modelStore.structure): Promise<IStructure> => {
    return new Promise((resolve, reject) => {
      if (!canSaveStructure.value) {
        resolve(structure);
      }

      const saveCallback = () => {
        useTypings().syncToFolder(structure, ['structure', 'typings', 'default', 'settings', 'index']);
        structureStates.value.saved = true;
        setTimeout(() => structureStates.value.saved = false, 2000);
      }

      if (globalStore.session.loggedIn) {
        structureStates.value.saving = true;
        saveStructureSimple(structure)
          .then(response => {
            saveCallback();
            modelStore.setStructure(response);
            modelStore.setOriginalStructure(response);
            globalStore.updateStructure(response);
            resolve(modelStore.structure);
          })
          .catch(error => {
            reject(error);
            globalStore.catchError(error);
            return error;
          })
          .finally(() => structureStates.value.saving = false);
      } else {
        saveCallback();
        resolve(modelStore.structure);
      }
    })
  }

  const deleteStructure = (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      if (!canDeleteStructure.value) {
        resolve(false);
      }

      globalStore.setPrompt({
        ...globalStore.prompt,
        visible: true,
        title: 'Delete structure',
        body: 'By proceeding, you will delete your structure and your users won\'t be able to access this admin panel anymore. Are you sure you want to continue?',
        btnText: 'Delete',
        btnIcon: 'mdi-delete-outline',
        btnColor: 'error',
        callback: () => new Promise(promptResolve => {
          structureStates.value.deleting = true;
          Services.delete(import.meta.env.VITE_SERVER_URL + '/structure/' + modelStore.structure.uuid)
            .then(response => {
              structureStates.value.deleted = true;
              setTimeout(() => structureStates.value.deleting = false, 2000);
              resolve(true);
              return response;
            })
            .catch(error => {
              reject(error);
              globalStore.catchError(error);
              return error;
            })
            .finally(() => {
              promptResolve();
              structureStates.value.deleting = false
            });
        })
      })
    })
  }

  const setDefaultValues = (structure: IStructure, data: any): void => {
    const parsedStructure = getParsedStructure(structure);
    if (parsedStructure) {
      const content = structure.content;
      const fields = parsedStructure.sections as unknown as { [key: string]: IField; };
      const pathsValues: PathValue[] = [];
      loopThroughFields(fields, (field, path, fieldData) => {
        if (isValidField(field)) {
          const fullPath = dataToFieldPath(field, path);
          const localeKeys = Object.keys(parsedStructure.locales);
          const clonedData = structuredClone(deepToRaw(fieldData)) ?? {};
          delete clonedData.default;
          if (isFieldI18n(field) && isNativeObject(clonedData)) {
            localeKeys.forEach(locale => {
              if (!clonedData[locale]) {
                delete clonedData[locale];
              }
            })
            if (Object.keys(clonedData).length > 0) {
              pathsValues.push({
                path: fullPath,
                value: clonedData,
              });
            }
          } else if (clonedData && (!Array.isArray(clonedData) || clonedData.length > 0)) {
            pathsValues.push({
              path: fullPath,
              value: clonedData,
            });
          }
        }
      }, data, false);
      structure.content = parseYamlAndFindPaths(content, pathsValues, value => {
        if (Array.isArray(value)) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          return value.map(({ hash, ...rest }) => rest); // Remove hash parameter
        }
        return value || undefined;
      }, true);
    }
  }

  const canSaveStructure = computed(() => {
    return !structureIsPristine.value
      && !structureHasSettingsError.value
  })

  const canDeleteStructure = computed((): boolean => {
    return !!(modelStore.structure.uuid);
  })

  return {
    adminBaseUrl,
    canOpenAdminUrl,
    adminUrl,
    computedServerSecretKey,
    computedCypherKey,
    structureParsedData,
    structureStates,
    structureIsPristine,
    getAvailableSection,
    getAvailableLocale,
    structureHasSection,
    structureHasLocale,
    canSaveStructure,
    canDeleteStructure,
    getParsedStructureData,
    getStructureRules,
    getStructureErrors,
    structureHasSettingsError,
    serverSettings,
    yamlException,
    structureHasError,
    getSecretKey,
    getCypherKey,
    createStructure,
    saveStructureSimple,
    saveStructure,
    deleteStructure,
    applyTemplate,
    resetStructure,
    resetStructureSettings,
    secretKey,
    cypherKey,
    isFieldVisible,
    getSecretKeySimple,
    setDefaultValues,
  };
}
