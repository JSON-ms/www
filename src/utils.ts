import demoInterface from '@/assets/demo-interface.yaml'
import type { IData, IInterface } from '@/interfaces';
import YAML from 'yamljs';
import defaultInterfaceStructure from '@/assets/default-interface-structure.json';
import merge from 'ts-deepmerge';

export const getParsedInterface = (data: IInterface): IData => {
  try {
    const json: IData = YAML.parse(data.content) || {};
    if (typeof json === 'string') {
      return defaultInterfaceStructure as IData;
    }
    const mergedInterface = merge(defaultInterfaceStructure as IData, json);
    if (Object.keys(mergedInterface.locales).length === 0) {
      mergedInterface.locales = { 'en-US': 'English (US)' };
    }
    return mergedInterface as IData;
  } catch {
    return defaultInterfaceStructure as IData;
  }
}

export const getInterface = (content: string = getDefaultInterfaceContent()): IInterface => {
  return {
    label: 'Untitled',
    content,
    server_url: '',
    permission_interface: [],
    permission_admin: [],
    type: 'owner',
  }
}

export const getDefaultInterfaceContent = (): string => {
  const version = JSON.parse(process.env.APP_VERSION);
  return (demoInterface as string)
    .replace('[VERSION]', 'v' + version)
    .replace('[INTERFACE_EDITOR_URL]', window.location.origin);
}

export const parseInterfaceDataToAdminData = (data: IData, override: any = {}): any => {
  const result: any = {
    i18n: {},
    general: {},
  };
  function parseFields(fields: any, translatableOnly = false) {
    Object.entries(fields).forEach(([key, field]: any) => {
      if (field.type === 'array') {
        fields[key] = [];//parseFields(structuredClone(field.items), translatableOnly)
      } else if (translatableOnly && (field.type || '').startsWith('i18n')) {
        fields[key] = null;
      } else if (!translatableOnly && !(field.type || '').startsWith('i18n')) {
        fields[key] = null;
      } else {
        delete fields[key];
      }
    });
    return fields;
  }
  Object.entries(data.locales).forEach(([locale]) => {
    result.i18n[locale] = {};
    Object.entries(data.sections).forEach(([key, section]) => {
      if (section) {
        result.i18n[locale][key] = parseFields(structuredClone(section.fields), true);
        result.general[key] = parseFields(structuredClone(section.fields));
        if (Object.keys(result.i18n[locale][key]).length === 0) {
          delete result.i18n[locale][key];
        }
        if (Object.keys(result.general[key]).length === 0) {
          delete result.general[key];
        }
      }
    });
  });
  return merge(result, override);
}
