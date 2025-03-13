import type {IInterfaceData, IInterface} from '@/interfaces';
import {deepToRaw, getDefaultInterfaceContent, getInterface, getParsedInterface} from '@/utils';
import {ref} from 'vue';
import {Services} from '@/services';
import {useGlobalStore} from '@/stores/global';
import blankInterface from '@/assets/blank-interface.yaml';
import Rules from '@/rules';
import BaseModel from '@/models/base.model';

const defaultInterface = getInterface(getDefaultInterfaceContent());

export default class InterfaceModel extends BaseModel<IInterface, InterfaceModel> {

  constructor(value: IInterface = defaultInterface) {
    super(value);
  }

  protected readonly currentStates = ref({
    saving: false,
    saved: false,
    deleting: false,
    deleted: false,
    loadingSecretKey: false,
    secretKeyLoaded: false,
    loadingCypherKey: false,
    cypherKeyLoaded: false,
  })

  public getParsedData(): IInterfaceData {
    return getParsedInterface(this.data);
  }

  public getRules(key: string | null = null): ((value: any) => (string | boolean))[] {
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

  public getErrors(keys: string | string[] = Object.keys(this.data)): { key: string, value: string }[] {
    const errors: { key: string, value: string }[] = [];
    keys = Array.isArray(keys) ? keys : [keys];
    keys.forEach(key => {
      const rules = this.getRules(key);
      for (const index in rules) {
        const rule = rules[index];
        // @ts-expect-error I don't know why...
        const result = rule(this.data[key]);
        if (typeof result === 'string') {
          errors.push({ key, value: result });
        }
      }
    })
    return errors;
  }

  public get hasSettingsError(): boolean {
    return this.getErrors([
      'server_url',
      'permission_admin',
      'permission_interface',
    ]).length > 0;
  }

  public getSecretKey(): Promise<string> {
    const globalStore = useGlobalStore();
    this.states.value.loadingSecretKey = true;
    this.states.value.secretKeyLoaded = false;
    return Services.get(import.meta.env.VITE_SERVER_URL + '/interface/secret-key/' + this.data.uuid)
      .catch(error => globalStore.catchError(error))
      .finally(() => {
        this.states.value.loadingSecretKey = false;
        this.states.value.secretKeyLoaded = true;
      })
  }

  public getCypherKey(): Promise<string> {
    const globalStore = useGlobalStore();
    this.states.value.loadingCypherKey = true;
    this.states.value.cypherKeyLoaded = false;
    return Services.get(import.meta.env.VITE_SERVER_URL + '/interface/cypher-key/' + this.data.uuid)
      .catch(error => globalStore.catchError(error))
      .finally(() => {
        this.states.value.loadingCypherKey = false;
        this.states.value.cypherKeyLoaded = true;
      })
  }

  public create(): Promise<InterfaceModel> {
    return new Promise((resolve) => {
      if (!this.canCreate) {
        resolve(this);
      }

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
          const newInterface = getInterface(blankInterface);
          this.setOriginalData(newInterface);
          this.setData(newInterface);
          resolve(this);
          promptResolve();
        })
      })
    })
  }

  public save(): Promise<InterfaceModel> {
    return new Promise((resolve, reject) => {
      if (!this.canSave) {
        resolve(this);
      }

      this.states.value.saving = true;
      const globalStore = useGlobalStore();
      const parsedInterface = getParsedInterface(deepToRaw(this.data));
      Services.post(import.meta.env.VITE_SERVER_URL + '/interface' + (this.data.uuid ? '/' + this.data.uuid : ''), {
        ...this.data,
        label: parsedInterface.global.title ?? 'Untitled',
        logo: parsedInterface.global.logo,
      })
        .then((response: IInterface) => {
          this.setOriginalData(response);
          this.setData(response);
          resolve(this);
        })
        .catch(error => {
          globalStore.catchError(error);
          reject(error);
          return error;
        })
        .finally(() => this.states.value.saving = false);
    })
  }

  public delete(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.canDelete) {
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
          this.states.value.deleting = true;
          Services.delete(import.meta.env.VITE_SERVER_URL + '/interface/' + this.data.uuid)
            .then(response => {
              this.states.value.deleted = true;
              setTimeout(() => this.states.value.deleting = false, 2000);
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
              this.states.value.deleting = false
            });
        })
      })
    })
  }
}
