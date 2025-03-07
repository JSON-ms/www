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
}

export interface IError {
  visible: boolean,
  title?: string | undefined,
  icon?: string | undefined,
  body: string,
}

export interface IInterface {
  uuid?: string
  hash?: string
  label: string
  content: string
  server_url?: string
  type: 'owner' | 'interface' | 'admin',
  owner_name?: string,
  permission_interface: string[],
  permission_admin: string[],
  created_by?: number
  created_at?: string
  updated_at?: string
}

export interface ISession {
  loggedIn: boolean
  user: {
    id: number | null,
    googleId: string | null,
    name: string,
    email: string | null,
    avatar: string | null,
    createdAt: string | null,
  }
  googleOAuthSignInUrl: string,
  interfaces: IInterface[],
}

export interface IField {
  type: string
  label: string
  required?: boolean
  icon?: string
  hint?: string
  multiple?: boolean
  inline?: boolean
  fields?: {[key: string]: IField}
  items?: {[key: string]: string} | string[]
}

export interface ISection {
  title: string
  prepend?: string
  append?: string
  label?: string
  icon?: string
  fields: {[key: string]: IField}
}

export interface IData {
  global: {
    title?: string
    copyright?: string
    logo?: string
    theme?: {
      default?: 'dark' | 'light',
      dark?: {
        primary: string
      },
      light?: {
        primary: string
      }
    }
  },
  enums: {[key: string]: string[]} | {[key: string]: {[key: string]: string}},
  locales: {[key: string]: string}
  sections: {[key: string]: ISection}
}
