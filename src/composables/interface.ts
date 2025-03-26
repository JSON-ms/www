import {computed, type Ref, ref} from 'vue';
import {deepToRaw, getInterface, isNativeObject, objectsAreDifferent} from '@/utils';
import type {IField, IInterface, IInterfaceData, IServerSettings} from '@/interfaces';
import Rules from '@/rules';
import {useGlobalStore} from '@/stores/global';
import {Services} from '@/services';
import {useRoute} from 'vue-router';
import defaultInterfaceStructure from '@/assets/default-interface-structure.json';
import {Composer, Parser, LineCounter, Document} from 'yaml'
import merge from 'ts-deepmerge';

export interface EditorAnnotation {
  row: number,
  column: number,
  text: string
  value: string
  type: 'error' | 'warning' | 'info'
}

let instance: any = null;

export function useInterface(model: Ref<IInterface>) {
  if (!instance) {
    const currentRoute = useRoute();
    const interfaceOriginalData = ref(structuredClone(deepToRaw(model.value)));
    const siteCompatible = ref(false);
    const siteNotCompatibleSnack = ref(false);
    const yamlException = ref<(EditorAnnotation | null)[]>([]);

    const interfaceStates = ref({
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
      uploadMaxSize: '2M',
    })

    const adminBaseUrl = ref(window.location.origin);
    const secretKey = ref('');
    const cypherKey = ref('');

    const canOpenAdminUrl = computed((): boolean => {
      const globalStore = useGlobalStore();
      return !!(model.value.uuid) || !globalStore.session.loggedIn;
    })
    const adminUrl = computed((): string => {
      return adminBaseUrl.value + '/admin/' + (model.value.hash || 'demo');
    })
    const computedServerSecretKey = computed((): string => {
      return interfaceStates.value.secretKeyLoaded
        ? secretKey.value
        : model.value.server_secret || '';
    })
    const computedCypherKey = computed((): string => {
      return interfaceStates.value.cypherKeyLoaded
        ? cypherKey.value
        : model.value.cypher_key || '';
    })

    const setInterfaceModel = (data: Ref<IInterface>) => {
      model.value = data.value;
    }

    const setInterfaceData = (value: any): void => {
      for (const key in model.value) {
        if (model.value.hasOwnProperty(key)) {
          // @ts-expect-error it's all good...
          delete model.value[key];
        }
      }
      Object.assign(model.value, structuredClone(deepToRaw(value)));
    }

    const setInterfaceOriginalData = (value: IInterface): void => {
      for (const key in interfaceOriginalData.value) {
        if (interfaceOriginalData.value.hasOwnProperty(key)) {
          delete interfaceOriginalData.value[key];
        }
      }
      Object.assign(interfaceOriginalData.value, structuredClone(deepToRaw(value)));
    }

    const interfaceIsPristine = computed((): boolean => {
      return !objectsAreDifferent(model.value, interfaceOriginalData.value, [
        'label', 'logo', 'content',
      ])
    })

    const getYamlItemByPath = (doc: Document.Parsed<any>, path: string, lineCounter: LineCounter): any => {
      const loop = (items: any): any => {
        const splitPath = path.split('.');
        const currentKey = splitPath.shift();
        path = splitPath.join('.');
        for (const item of items) {
          if (item.key.source === currentKey) {
            if (splitPath.length === 0) {
              const line = lineCounter.linePos(item.value.range[0]);
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

    const getParsedInterface = (data: IInterface = getInterface()): IInterfaceData | null => {
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
          return defaultInterfaceStructure as IInterfaceData;
        }
        const mergedInterface: any = merge(defaultInterfaceStructure as IInterfaceData, json);
        if (Object.keys(mergedInterface.locales).length === 0) {
          mergedInterface.locales = { 'en-US': 'English (US)' };
        }
        parseData = mergedInterface as IInterfaceData;
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
            if (field.fields) {
              checkFields(field.fields);
            }
          } else {
            fields[key] = {
              type: 'unknown',
              label: 'Unknown',
            }
          }
        })
      }
      checkFields(parseData.sections);

      return parseData;
    }

    let lastParsedData: IInterfaceData | null;
    const getParsedInterfaceData = (value: IInterface = model.value): IInterfaceData => {
      const parsedData = getParsedInterface(value);
      if (parsedData) {
        lastParsedData = parsedData;
        return parsedData;
      }
      if (lastParsedData) {
        return lastParsedData;
      }
      return defaultInterfaceStructure;
    }

    const interfaceHasSection = (section: string, data: IInterfaceData = interfaceParsedData.value) => {
      const keys = Object.keys(data.sections);
      return !!(keys.find(section => section === currentRoute.params.section));
    }

    const getAvailableSection = (data: IInterfaceData = interfaceParsedData.value): string => {
      const keys = Object.keys(data.sections);
      const found = keys.find(section => section === currentRoute.params.section);
      return found ?? keys[0] ?? 'home';
    }

    const getAvailableLocale = (data: IInterfaceData = interfaceParsedData.value): string => {
      const keys = Object.keys(data.locales);
      const found = keys.find(locale => locale === currentRoute.params.locale);
      const shortFound = keys.find(locale => locale.substring(0, 2) === currentRoute.params.locale.toString().substring(0, 2));
      return found ?? shortFound ?? keys[0] ?? 'en-US';
    }

    const interfaceHasLocale = (locale: string, data: IInterfaceData = interfaceParsedData.value) => {
      const keys = Object.keys(data.locales);
      return !!(keys.find(locale => locale === currentRoute.params.locale));
    }

    const interfaceParsedData = computed((): IInterfaceData => {
      return getParsedInterfaceData();
    })

    const applyTemplate = (template: string, hash?: string, updateLabel = true) => {
      if (hash === 'new') {
        model.value = getInterface();
      }
      model.value.content = template;
      model.value.hash = hash ?? model.value.hash;

      if (hash === 'new') { // Needs to be after... do not merge with hash === new condition upstairs
        if (updateLabel) {
          model.value.content = model.value.content.replace('title: Dynamic Admin Panel Example', 'title: Untitled');
        }
        model.value.label = 'Untitled';
        model.value.logo = undefined;
      } else {
        model.value.label = interfaceParsedData.value.global.title ?? '';
        model.value.logo = interfaceParsedData.value.global.logo ?? '';
      }

      model.value.content = template;
      setInterfaceOriginalData(model.value)
    }

    const resetInterfaceSettings = () => {
      settingsKeys.forEach(key => {
        // @ts-expect-error keys are defined
        model.value[key] = structuredClone(interfaceOriginalData.value[key]);
      })
    }

    const resetInterface = () => {
      siteCompatible.value = false;
      siteNotCompatibleSnack.value = false;

      setInterfaceOriginalData(model.value);
    }

    const getInterfaceRules = (key: string | null = null): ((value: any) => (string | boolean))[] => {
      const rules = [];
      if ([null, 'server_url'].includes(key)) {
        rules.push((value: string) => !value || Rules.isUrl(value) || 'This field must contain a valid URL');
        rules.push((value: string) => Rules.maxLength(value, 255) || 'This field must contain 255 characters or fewer.');
      }
      if ([null, 'permission_admin', 'permission_interface'].includes(key)) {
        rules.push((items: string[]) => (items || []).every(value => Rules.email(value)) || 'All items from this list must be valid email addresses.');
      }
      return rules;
    }

    const getInterfaceErrors = (keys: string | string[] = Object.keys(model.value)): { key: string, value: string }[] => {
      const errors: { key: string, value: string }[] = [];
      keys = Array.isArray(keys) ? keys : [keys];
      keys.forEach(key => {
        const rules = getInterfaceRules(key);
        for (const index in rules) {
          const rule = rules[index];
          // @ts-expect-error I don't know why...
          const result = rule(model.value[key]);
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
      'permission_interface',
    ]
    const interfaceHasSettingsError = computed((): boolean => {
      return getInterfaceErrors(settingsKeys).length > 0;
    });

    const interfaceHasError = (keys: string | string[] = Object.keys(model.value)): boolean => {
      return getInterfaceErrors(keys).length > 0;
    }

    const getSecretKey = (): Promise<string> => {
      const globalStore = useGlobalStore();
      interfaceStates.value.loadingSecretKey = true;
      interfaceStates.value.secretKeyLoaded = false;
      return Services.get(import.meta.env.VITE_SERVER_URL + '/interface/secret-key/' + model.value.uuid)
        .catch(error => globalStore.catchError(error))
        .finally(() => {
          interfaceStates.value.loadingSecretKey = false;
          interfaceStates.value.secretKeyLoaded = true;
        })
    }

    const getCypherKey = (): Promise<string> => {
      const globalStore = useGlobalStore();
      interfaceStates.value.loadingCypherKey = true;
      interfaceStates.value.cypherKeyLoaded = false;
      return Services.get(import.meta.env.VITE_SERVER_URL + '/interface/cypher-key/' + model.value.uuid)
        .catch(error => globalStore.catchError(error))
        .finally(() => {
          interfaceStates.value.loadingCypherKey = false;
          interfaceStates.value.cypherKeyLoaded = true;
        })
    }

    const createInterface = (): Promise<Ref<IInterface>> => {
      return new Promise((resolve) => {
        const globalStore = useGlobalStore();
        globalStore.setPrompt({
          ...globalStore.prompt,
          visible: true,
          title: 'New Document',
          body: 'If you create a new document, you may lose any unsaved work. Do you want to continue?',
          btnText: 'Create',
          btnIcon: 'mdi-plus',
          btnColor: 'secondary',
          callback: () => new Promise(promptResolve => {
            resolve(model);
            promptResolve();
          })
        })
      })
    }

    const saveInterface = (): Promise<Ref<IInterface>> => {
      const body = {
        ...model.value,
        label: interfaceParsedData.value.global.title ?? 'Untitled',
        logo: interfaceParsedData.value.global.logo,
      };
      return new Promise((resolve, reject) => {
        if (!canSaveInterface.value) {
          resolve(model);
        }

        interfaceStates.value.saving = true;
        const globalStore = useGlobalStore();
        Services.post(import.meta.env.VITE_SERVER_URL + '/interface' + (model.value.uuid ? '/' + model.value.uuid : ''), body)
          .then((response: IInterface) => {
            setInterfaceOriginalData(response);
            setInterfaceData(response);
            resolve(model);
          })
          .catch(error => {
            globalStore.catchError(error);
            reject(error);
            return error;
          })
          .finally(() => interfaceStates.value.saving = false);
      })
    }

    const deleteInterface = (): Promise<boolean> => {
      return new Promise((resolve, reject) => {
        if (!canDeleteInterface.value) {
          resolve(false);
        }

        const globalStore = useGlobalStore();
        globalStore.setPrompt({
          ...globalStore.prompt,
          visible: true,
          title: 'Delete interface',
          body: 'By proceeding, you will delete your interface and your users won\'t be able to access this admin panel anymore. Are you sure you want to continue?',
          btnText: 'Delete',
          btnIcon: 'mdi-delete-outline',
          btnColor: 'error',
          callback: () => new Promise(promptResolve => {
            interfaceStates.value.deleting = true;
            Services.delete(import.meta.env.VITE_SERVER_URL + '/interface/' + model.value.uuid)
              .then(response => {
                interfaceStates.value.deleted = true;
                setTimeout(() => interfaceStates.value.deleting = false, 2000);
                resolve(true);
                return response;
              })
              .catch(error => {
                globalStore.catchError(error);
                reject(error);
                return error;
              })
              .finally(() => {
                promptResolve();
                interfaceStates.value.deleting = false
              });
          })
        })
      })
    }

    const canSaveInterface = computed(() => {
      return interfaceOriginalData.value && !interfaceIsPristine.value
        && !interfaceHasSettingsError.value;
    })

    const canDeleteInterface = computed((): boolean => {
      return !!(model.value.uuid);
    })

    setInterfaceOriginalData(model.value);

    instance = {
      adminBaseUrl,
      canOpenAdminUrl,
      adminUrl,
      computedServerSecretKey,
      computedCypherKey,
      setInterfaceModel,
      interfaceParsedData,
      interfaceOriginalData,
      interfaceStates,
      interfaceIsPristine,
      getAvailableSection,
      getAvailableLocale,
      interfaceHasSection,
      interfaceHasLocale,
      canSaveInterface,
      canDeleteInterface,
      setInterfaceData,
      setInterfaceOriginalData,
      getParsedInterfaceData,
      getInterfaceRules,
      getInterfaceErrors,
      interfaceHasSettingsError,
      serverSettings,
      yamlException,
      interfaceHasError,
      getSecretKey,
      getCypherKey,
      createInterface,
      saveInterface,
      deleteInterface,
      applyTemplate,
      resetInterface,
      resetInterfaceSettings,
    };
  }

  return instance;
}
