import { defineStore } from 'pinia';
import type {
  ISession,
  IPrompt,
  IError,
  ISnack,
  IAdmin,
  IStructure,
  IFileManager,
  IFile,
  IUserSettings
} from '@/interfaces';

const defaultUserSettings: IUserSettings = {
  appearanceDarkMode: false,
  editorFontSize: 16,
  editorLiveUpdate: true,
  editorUpdateTimeout: 1000,
  editorShowPrintMargin: false,
  editorAutoSyncFrom: true,
  editorAutoSyncInterval: 1000,
  autoCleanData: false,
  editorTabSize: 2,
  userDataAutoFetch: true,
  layoutEditorLocation: 'start',
  layoutSitePreviewLocation: 'start',
  layoutSitePreviewPadding: true,
  layoutSitePreviewKeepRatio: true,
  layoutAutoSplit: true,
  blueprintsIncludeTypings: true,
  blueprintsReadFromData: true,
  blueprintsReadFromStructure: true,
  blueprintsWriteToData: true,
  blueprintsWriteToDefault: true,
  blueprintsWriteToIndex: true,
  blueprintsWriteToStructure: true,
  blueprintsWriteToTypings: true,
  blueprintsWriteToSettings: true,
}

export const useGlobalStore = defineStore('global', {
  state: (): {
    theme: 'dark' | 'light',
    admin: IAdmin,
    snack: ISnack,
    error: IError,
    prompt: IPrompt,
    session: ISession,
    fileManager: IFileManager,
    userSettings: {
      visible: boolean,
      data: IUserSettings
    },
  } => ({
    theme: 'light',
    prompt: {
      body: '',
      visible: false,
      callback: () => new Promise(resolve => resolve()),
    },
    error: {
      body: '',
      visible: false,
    },
    snack: {
      title: '',
      body: '',
      visible: false,
    },
    admin: {
      drawer: window.innerWidth >= 1300,
      structure: window.innerWidth >= 1400,
      previewMode: window.innerWidth >= 1400 ? 'desktop' : 'mobile',
      dataTab: 'data',
      editorTab: 'structure',
      editorExpanded: false,
    },
    session: {
      loggedIn: false,
      user: {
        id: null,
        googleId: null,
        name: 'Anonymous',
        email: null,
        avatar: null,
        createdAt: null,
      },
      googleOAuthSignInUrl: '',
      structures: [],
      endpoints: [],
    },
    fileManager: {
      visible: false,
      selected: [],
      multiple: false,
      canSelect: false,
      callback: () => new Promise(resolve => resolve(true)),
      accept: null,
    },
    userSettings: {
      visible: false,
      data: structuredClone(defaultUserSettings)
    },
  }),
  actions: {
    catchError(error: Error) {
      try {
        const json = JSON.parse(error.message);
        this.error = {
          visible: true,
          body: json.body,
          title: json.title,
        };
      } catch {
        const serverError = [
          'Failed to fetch',
        ].includes(error.message);
        this.snack = {
          visible: true,
          icon: 'mdi-server-network-off',
          color: 'error',
          title: serverError ? 'Error Fetching Data' : 'Server Error',
          body: serverError ? 'Please check your endpoint URL or check your server settings.' : error.message,
        };
      }
      throw error;
    },
    setAdmin(admin: Partial<IAdmin>) {
      Object.assign(this.admin, admin);
    },
    setPrompt(prompt: IPrompt) {
      this.prompt = prompt;
    },
    setError(error: IError) {
      this.error = error;
    },
    setSnack(snack: ISnack) {
      this.snack = snack;
    },
    setSession(session: ISession) {
      this.session = session;
    },
    showFileManager(
      selected: IFile[] = [],
      canSelect = false,
      multiple = false,
      callback?: (files?: IFile | IFile[]) => Promise<boolean>,
      accept: null | string = null
    ) {
      this.fileManager.visible = true;
      this.fileManager.selected = selected;
      this.fileManager.multiple = multiple;
      this.fileManager.canSelect = canSelect;
      this.fileManager.accept = accept;
      this.fileManager.callback = callback;
    },
    initUserSettings() {
      try {
        const jsonStr = localStorage.getItem('jsonms/global:user-settings');
        if (jsonStr) {
          const json = JSON.parse(jsonStr);
          this.applyUserSettingsData(json);
        }
      } catch (e: any) {
        console.warn('Unable to fetch user settings from local storage.', e)
      }
    },
    applyUserSettingsData(data: any) {
      const values: any = {};
      Object.keys(defaultUserSettings).forEach(key => {
        // @ts-expect-error Keys are fetched from defaultUserSettings, so it's all fine...
        const originalValue = defaultUserSettings[key];
        values[key] = originalValue
        if (typeof data[key] === typeof originalValue) {
          values[key] = data[key] !== undefined ? data[key] : originalValue;
        }
      })
      this.userSettings.data = values;
    },
    setUserSettingsVisible(visible: boolean) {
      this.userSettings.visible = visible;
    },
    setUserSettings(userSettings: IUserSettings) {
      this.applyUserSettingsData(userSettings);
      localStorage.setItem('jsonms/global:user-settings', JSON.stringify(userSettings));
    },
    addStructure(item: IStructure) {
      if (!this.session.structures.find(inter => inter.uuid === item.uuid)) {
        this.session.structures.push(item);
      }
    },
    removeStructure(item: IStructure) {
      const filteredItems = this.session.structures.filter(child => child.uuid !== item.uuid);
      this.session.structures.length = 0;
      Array.prototype.push.apply(this.session.structures, filteredItems);
    },
    updateStructure(item: IStructure) {
      const index = this.session.structures.findIndex(child => child.uuid === item.uuid);
      if (index >= 0) {
        this.session.structures[index] = item;
      } else {
        this.addStructure(item);
      }
    },
  },
});
