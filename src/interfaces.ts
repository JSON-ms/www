type PHPMegabyte = `${number}M`;
export type TRule = { regex: string, message: string }
export type TEnum = {[key: string]: string[]} | {[key: string]: {[key: string]: string}}
export type TSchema = {[key: string]: { [key: string]: IField }}

export interface IServerSettings {
  postMaxSize: PHPMegabyte,
  publicUrl: string,
  supportedFeatures: string[],
  uploadMaxSize: PHPMegabyte,
  version: string,
}

export interface IPrompt {
  visible: boolean,
  type?: 'warning' | 'info' | 'error' | undefined,
  title?: string | undefined,
  icon?: string | undefined,
  color?: string | undefined,
  body: string,
  btnText?: string | undefined,
  btnIcon?: string | undefined,
  btnColor?: string | undefined,
  callback: () => Promise<void>,
  cancelText?: string | undefined,
  cancelCallback?: () => Promise<void>,
  cancelIcon?: string | undefined,
}

export interface IAdmin {
  drawer: boolean,
  structure: boolean,
  previewMode: 'mobile' | 'desktop' | null,
  dataTab: 'data' | 'settings' | 'docs',
  editorTab: 'structure' | 'blueprints' | 'settings' | 'integration',
  editorExpanded: boolean,
}

export interface ISnack {
  visible: boolean,
  color?: string | undefined,
  title?: string | undefined,
  icon?: string | undefined,
  body: string,
}

export interface IError {
  visible: boolean,
  title?: string | undefined,
  icon?: string | undefined,
  body: string,
}

export interface IFile {
  path: string | null,
  blob?: string | undefined,
  meta: {
    type?: string,
    size?: number | null,
    width?: number | null,
    height?: number | null,
    frameRate?: number,
    duration?: number,
    timestamp?: number,
    originalFileName?: string,
  }
}

export interface IUIConfig {
  toolbar: boolean
  toolbar_menu: boolean
  toolbar_logo: boolean
  toolbar_project_selector: boolean
  toolbar_project_selector_new: boolean
  toolbar_project_selector_delete: boolean
  toolbar_advanced: boolean
  toolbar_site_preview: boolean
  toolbar_site_preview_refresh: boolean
  toolbar_site_preview_mobile: boolean
  toolbar_site_preview_desktop: boolean
  toolbar_site_preview_blank: boolean
  toolbar_trigger_menu: boolean
  toolbar_info: boolean
  toolbar_locale_selector: boolean
  toolbar_login: boolean
  toolbar_settings: boolean
  toolbar_settings_edit_json: boolean
  toolbar_settings_fetch_data: boolean
  toolbar_settings_download_data: boolean
  toolbar_settings_migrate_data: boolean
  toolbar_settings_clear_data: boolean
  toolbar_settings_settings: boolean
  toolbar_settings_logout: boolean

  sidebar: boolean
  sidebar_sections: boolean
  sidebar_tools: boolean
  sidebar_tools_file_manager: boolean
  sidebar_advanced: boolean
  sidebar_advanced_hash: boolean
  sidebar_advanced_server: boolean
  sidebar_advanced_upload: boolean
  sidebar_tutorial: boolean
  sidebar_github: boolean
  sidebar_footer: boolean

  structure: boolean
  structure_menu: boolean
  structure_menu_structure: boolean
  structure_menu_blueprints: boolean
  structure_menu_settings: boolean
  structure_menu_integration: boolean
  structure_trigger_menu: boolean
  structure_settings: boolean
  structure_settings_endpoint: boolean
  structure_settings_permissions_structure: boolean
  structure_settings_permissions_admin: boolean
  structure_footer: boolean
  structure_footer_local_sync: boolean
  structure_footer_save: boolean

  site_preview: boolean

  data: boolean
  data_footer: boolean
  data_footer_set_as_default: boolean
  data_footer_sync_local: boolean
  data_footer_sync_endpoint: boolean

  documentation: boolean
}

export interface IUserSettings {
  appearanceDarkMode: boolean
  editorFontSize: number
  editorShowPrintMargin: boolean
  editorTabSize: number
  editorLiveUpdate: boolean
  editorUpdateTimeout: number
  editorAutoSyncFrom: boolean
  editorAutoSyncInterval: number
  autoCleanData: boolean
  userDataAutoFetch: boolean
  layoutEditorLocation: 'start' | 'end'
  layoutSitePreviewLocation: 'start' | 'end'
  layoutSitePreviewPadding: boolean
  layoutSitePreviewKeepRatio: boolean
  layoutAutoSplit: boolean
  blueprintsIncludeTypings: boolean
  blueprintsReadFromData: boolean
  blueprintsReadFromStructure: boolean
  blueprintsWriteToData: boolean
  blueprintsWriteToDefault: boolean
  blueprintsWriteToIndex: boolean
  blueprintsWriteToStructure: boolean
  blueprintsWriteToTypings: boolean
  blueprintsWriteToSettings: boolean
}

export interface IFileManager {
  visible: boolean,
  selected: IFile[],
  multiple: boolean,
  canSelect: boolean,
  callback?: (files?: IFile | IFile[]) => Promise<boolean>,
  accept: string | null,
}

export interface IStructure {
  uuid?: string
  hash?: string
  label: string
  logo?: string | null
  content: string
  server_url?: string
  server_secret?: string
  endpoint: string | null
  type: 'owner' | 'structure' | 'admin',
  owner_name?: string,
  permission_structure: string[],
  permission_admin: string[],
  created_by?: number
  created_at?: string
  updated_at?: string
}

export interface IEndpoint {
  uuid?: string
  url?: string
  secret?: string
  cypher?: string
  created_by?: number
  created_at?: string
  updated_at?: string
}

export interface ISession {
  loggedIn: boolean
  user?: {
    id: number | null,
    googleId: string | null,
    name: string,
    email: string | null,
    avatar: string | null,
    createdAt: string | null,
  }
  googleOAuthSignInUrl: string,
  structures: IStructure[],
  endpoints: IEndpoint[],
}

export interface IField {
  type: string
  label: string
  required?: boolean
  default?: any
  icon?: string
  hint?: string
  multiple?: boolean
  inline?: boolean
  min?: number
  max?: number
  length?: number
  step?: number
  'half-increments'?: boolean
  prepend?: string
  append?: string
  accept?: string | string[]
  'append-inner'?: string
  'prepend-inner'?: string
  fields: {[key: string]: IField}
  items?: {[key: string]: string} | string[] | string
  conditional?: string
  rules?: TRule[]
  collapsable?: boolean
  collapsed?: boolean
  swatches?: boolean
  canvas?: boolean
  inputs?: boolean
  sliders?: boolean
}

export interface ISection {
  title: string
  prepend?: string
  append?: string
  label?: string
  icon?: string
  path?: string | string[]
  fields: {[key: string]: IField}
}

export interface ITrigger {
  key?: string
  label: string
  icon?: string
  headers?: {[key: string]: string}
  method?: string
  url: string
  location: 'editor' | 'toolbar'
}

export interface IStructureData {
  global: {
    title?: string
    logo?: string
    preview?: string
  },
  triggers: {[key: string]: ITrigger},
  enums: TEnum,
  schemas: TSchema,
  locales: {[key: string]: string}
  sections: {[key: string]: ISection}
}
