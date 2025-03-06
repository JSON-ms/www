import demoInterface from '@/assets/demo-interface.yaml'
import type { IData, IInterface } from '@/interfaces';
import YAML from 'yamljs';
import defaultInterfaceStructure from '@/assets/default-interface-structure.json';
import merge from 'ts-deepmerge';

export const getParsedInterface = (data: IInterface): IData => {
  try {
    const json: IData | string = YAML.parse(data.content) || {};
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
  // @ts-expect-error Because process is printed in JS at compilation time
  const version = JSON.parse(process.env.APP_VERSION);
  return (demoInterface as string)
    .replace('[VERSION]', 'v' + version)
    .replace('[INTERFACE_EDITOR_URL]', window.location.origin);
}

export const parseFields = (fields: any, locales = {}) => {
  const emptyStringTypes = ['i18n', 'wysiwyg', 'i18n:wysiwyg', 'markdown', 'i18n:markdown', 'date', 'i18n:date'];
  const multipleTypes = ['array', 'i18n:array'];
  const mayBeMultipleTypes = ['select', 'i18n:select', 'checkbox', 'i18n:checkbox', 'radio', 'i18n:radio'];
  const applyValues = (key: string) => {
    const type = fields[key].type || '';
    let value;
    if (multipleTypes.includes(type) || (mayBeMultipleTypes.includes(type) && !!(fields[key].multiple))) {
      console.log(type, fields[key])
      value = [];
    } else {
      value = emptyStringTypes.includes(type) ? '' : null;
    }
    return value;
  }

  const result: any = {};
  Object.entries(fields).forEach(([key, field]: any) => {
    result[key] = {};
    if (field.type.includes('i18n')) {
      Object.entries(locales).forEach(([locale]) => {
        result[key][locale] = applyValues(key);
        if (result[key][locale] === undefined) {
          delete result[key][locale];
        }
      })
    } else {
      result[key].general = applyValues(key);
      if (result[key].general === undefined) {
        delete result[key].general;
      }
    }
  });
  return result;
}

export const processObject = (obj: any, callback: (parent: any, key: string, path: string) => void, path = '', parent = null, parentKey: string | null = null) => {
  if (obj !== null && typeof obj === 'object') {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const currentPath = path ? `${path}.${key}` : key;
        processObject(obj[key], callback, currentPath, obj, key);
      }
    }
  } else if (parentKey) {
    callback(parent, parentKey, path);
  }
}

export const getValueByPath = (obj: any, path = '') => {
  const keys = path.split('.');
  return keys.reduce((accumulator: any, key: string) => {
    return (accumulator !== null && accumulator !== undefined) ? accumulator[key] : undefined;
  }, obj);
}

export const parseInterfaceDataToAdminData = (data: IData, override: any = {}): any => {
  const result: any = {};
  Object.entries(data.sections).forEach(([key, section]) => {
    if (section) {
      result[key] = parseFields(structuredClone(section.fields), data.locales);
      if (Object.keys(result[key]).length === 0) {
        delete result[key];
      }
    }
  });
  processObject(result, (parent, key, path) => {
    const overrideValue = getValueByPath(override, path);
    if (Array.isArray(parent[key]) && Array.isArray(overrideValue)) {
      parent[key] = overrideValue;
    }
    if (
      typeof parent[key] === 'object' && parent[key] !== null &&
      typeof overrideValue === 'object' && overrideValue !== null
    ) {
      parent[key] = overrideValue;
    }
    if (overrideValue !== null && overrideValue !== undefined && typeof parent[key] === typeof overrideValue) {
      parent[key] = overrideValue;
    }
    return parent[key];
  });
  return result;
}

export const objectAreDifferent = (obj1: any, obj2: any) => {

  if (obj1 === obj2) return false;

  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return true;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return true;
  }

  for (const key of keys1) {
    if (!keys2.includes(key)) {
      return true;
    }

    const value1 = obj1[key];
    const value2 = obj2[key];

    if (Array.isArray(value1) && Array.isArray(value2)) {
      if (value1.length !== value2.length) {
        return true;
      }
      for (let i = 0; i < value1.length; i++) {
        if (objectAreDifferent(value1[i], value2[i])) {
          return true;
        }
      }
    } else if (objectAreDifferent(value1, value2)) {
      return true;
    }
  }

  return false;
}

export const generateHash = (length = 10) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let hash = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    hash += characters[randomIndex];
  }
  return hash;
}
