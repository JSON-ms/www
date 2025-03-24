import {computed, type Ref, ref} from 'vue';
import {deepToRaw, getInterface, getParsedInterface, objectsAreDifferent} from '@/utils';
import type {IInterface, IInterfaceData, IServerSettings} from '@/interfaces';
import Rules from '@/rules';
import {useGlobalStore} from '@/stores/global';
import {Services} from '@/services';
import {useRoute} from 'vue-router';

let instance: any = null;

export function useInterface(model: Ref<IInterface>) {
  if (!instance) {
    const currentRoute = useRoute();
    const interfaceOriginalData = ref(structuredClone(deepToRaw(model.value)));
    const siteCompatible = ref(false);
    const siteNotCompatibleSnack = ref(false);

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

    const setInterfaceModel = (data: Ref<IInterface>) => {
      model = data;
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

    const getParsedInterfaceData = (value: IInterface = model.value): IInterfaceData => {
      return getParsedInterface(value);
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

    const interfaceHasSettingsError = computed((): boolean => {
      return getInterfaceErrors([
        'server_url',
        'permission_admin',
        'permission_interface',
      ]).length > 0;
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
      return new Promise((resolve, reject) => {
        if (!canSaveInterface.value) {
          resolve(model);
        }

        interfaceStates.value.saving = true;
        const globalStore = useGlobalStore();
        Services.post(import.meta.env.VITE_SERVER_URL + '/interface' + (model.value.uuid ? '/' + model.value.uuid : ''), {
          ...model.value,
          label: interfaceParsedData.value.global.title ?? 'Untitled',
          logo: interfaceParsedData.value.global.logo,
        })
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
      return interfaceOriginalData.value && !interfaceIsPristine.value;
    })

    const canDeleteInterface = computed((): boolean => {
      return !!(model.value.uuid);
    })

    setInterfaceOriginalData(model.value);

    instance = {
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
      interfaceHasError,
      getSecretKey,
      getCypherKey,
      createInterface,
      saveInterface,
      deleteInterface,
      applyTemplate,
      resetInterface,
    };
  }

  return instance;
}
