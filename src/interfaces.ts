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
  cancelCallback?: () => Promise<void>,
}

export interface IAdmin {
  drawer: boolean,
  structure: boolean,
  previewMode: 'mobile' | 'desktop' | null,
  dataTab: 'data' | 'settings' | 'docs',
  editorTab: 'structure' | 'blueprints',
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

export interface IUserSettings {
  editorFontSize: number
  editorShowPrintMargin: boolean
  editorTabSize: number
  editorLiveUpdate: boolean
  editorUpdateTimeout: number
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

export interface IStructureData {
  global: {
    title?: string
    logo?: string
    preview?: string
  },
  enums: TEnum,
  schemas: TSchema,
  locales: {[key: string]: string}
  sections: {[key: string]: ISection}
}
