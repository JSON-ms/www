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
  IUserSettings, IUIConfig, IBottomSheet
} from '@/interfaces';

const defaultUIConfig: IUIConfig = {
  toolbar: true,
  toolbar_menu: true,
  toolbar_logo: true,
  toolbar_project_selector: true,
  toolbar_project_selector_new: true,
  toolbar_project_selector_delete: true,
  toolbar_advanced: true,
  toolbar_site_preview: true,
  toolbar_site_preview_refresh: true,
  toolbar_site_preview_mobile: true,
  toolbar_site_preview_desktop: true,
  toolbar_site_preview_blank: true,
  toolbar_trigger_menu: true,
  toolbar_info: true,
  toolbar_locale_selector: true,
  toolbar_login: true,
  toolbar_settings: true,
  toolbar_settings_edit_json: true,
  toolbar_settings_fetch_data: true,
  toolbar_settings_download_data: true,
  toolbar_settings_migrate_data: true,
  toolbar_settings_clear_data: true,
  toolbar_settings_settings: true,
  toolbar_settings_logout: true,

  sidebar: true,
  sidebar_sections: true,
  sidebar_tools: true,
  sidebar_tools_file_manager: true,
  sidebar_advanced: true,
  sidebar_advanced_hash: true,
  sidebar_advanced_server: true,
  sidebar_advanced_upload: true,
  sidebar_tutorial: true,
  sidebar_theme: true,
  sidebar_github: true,
  sidebar_footer: true,

  structure: true,
  structure_menu: true,
  structure_menu_structure: true,
  structure_menu_blueprints: true,
  structure_menu_settings: true,
  structure_menu_integration: true,
  structure_trigger_menu: true,
  structure_settings: true,
  structure_settings_endpoint: true,
  structure_settings_permissions_structure: true,
  structure_settings_permissions_admin: true,
  structure_footer: true,
  structure_footer_local_sync: true,
  structure_footer_save: true,

  site_preview: true,

  data: true,
  data_footer: true,
  data_footer_set_as_default: true,
  data_footer_sync_local: true,
  data_footer_sync_endpoint: true,

  documentation: true,
}

const envForceUserSettings = import.meta.env.VITE_FORCE_USER_SETTINGS;
const envDefaultUserSettings = import.meta.env.VITE_DEFAULT_USER_SETTINGS;

const forceUserSettings: IUserSettings = envForceUserSettings && JSON.parse(envForceUserSettings || '{}') || {};
const defaultUserSettings: IUserSettings = Object.assign({}, {
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
  layoutAutoSplit: false,
  blueprintsIncludeTypings: true,
  blueprintsReadFromData: true,
  blueprintsReadFromStructure: true,
  blueprintsWriteToData: true,
  blueprintsWriteToDefault: true,
  blueprintsWriteToIndex: true,
  blueprintsWriteToStructure: true,
  blueprintsWriteToTypings: true,
  blueprintsWriteToSettings: true,
}, envDefaultUserSettings && JSON.parse(envDefaultUserSettings || '{}'));

export const useGlobalStore = defineStore('global', {
  state: (): {
    theme: 'dark' | 'light',
    bottomSheet: IBottomSheet,
    admin: IAdmin,
    snack: ISnack,
    error: IError,
    prompt: IPrompt,
    session: ISession,
    fileManager: IFileManager,
    uiConfig: IUIConfig,
    userSettings: {
      visible: boolean,
      data: IUserSettings
    },
  } => ({
    theme: 'light',
    bottomSheet: {
      visible: false,
      text: '',
    },
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
    uiConfig: structuredClone(defaultUIConfig),
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
    showBottomSheet(text: string, color: string | null = null, icon: string | null = null, loading = false) {
      Object.assign(this.bottomSheet, { visible: true, text, color, icon, loading });
    },
    hideBottomSheet() {
      this.bottomSheet.visible = false;
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
    initUIConfig() {
      const keys = (import.meta.env.VITE_UI_DISABLE || '')
          .split(',')
          .filter(Boolean)

      const overrides: Partial<IUIConfig> = {}

      for (const key of keys) {
        overrides[key.replaceAll('.', '_') as keyof IUIConfig] = false
      }

      Object.assign(this.uiConfig, overrides)
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
          Object.keys(forceUserSettings).forEach((key) => {
            // @ts-expect-error Injected from .env file
            this.userSettings.data[key] = forceUserSettings[key];
          })
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
      Object.keys(forceUserSettings).forEach((key) => {
        // @ts-expect-error Injected from .env file
        this.userSettings.data[key] = forceUserSettings[key];
      })
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
