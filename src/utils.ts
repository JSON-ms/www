import demoInterface from '@/assets/demo-interface.yaml'
import type { IInterfaceData, IInterface } from '@/interfaces';
import YAML from 'yamljs';
import defaultInterfaceStructure from '@/assets/default-interface-structure.json';
import merge from 'ts-deepmerge';
import type {Ref} from 'vue';
import {isReactive, isReadonly, isRef, toRaw} from 'vue';

export const getParsedInterface = (data: IInterface = getInterface()): IInterfaceData => {
  let parseData: any = {};
  try {
    const json: IInterfaceData | string = YAML.parse(data.content) || {};
    if (typeof json === 'string') {
      return defaultInterfaceStructure as IInterfaceData;
    }
    const mergedInterface = merge(defaultInterfaceStructure as IInterfaceData, json);
    if (Object.keys(mergedInterface.locales).length === 0) {
      mergedInterface.locales = { 'en-US': 'English (US)' };
    }
    parseData = mergedInterface as IInterfaceData;
  } catch {
    parseData = defaultInterfaceStructure as IInterfaceData;
  }
  // @ts-expect-error process.env is parsed from backend
  const version = JSON.parse(process.env.APP_VERSION);
  parseData.global.copyright = (parseData.global.copyright || '').replace('{{version}}', version)
  return parseData;
}

export const getInterface = (content: string = getDefaultInterfaceContent()): IInterface => {
  return {
    label: 'Untitled',
    hash: 'new',
    content,
    server_url: '',
    permission_interface: [],
    permission_admin: [],
    type: 'owner',
  }
}

export const getDefaultInterfaceContent = (): string => {
  return (demoInterface as string)
    .replace('[INTERFACE_EDITOR_URL]', window.location.origin);
}

export const parseFields = (fields: any = {}, locales = {}) => {
  fields = fields ? fields : {}; // Make sure it's an object

  const emptyStringTypes = ['i18n', 'wysiwyg', 'i18n:wysiwyg', 'markdown', 'i18n:markdown', 'date', 'i18n:date'];
  const multipleTypes = ['array', 'i18n:array'];
  const fileTypes = ['file', 'i18n:file', 'image', 'i18n:image', 'video', 'i18n:video'];
  const mayBeMultipleTypes = ['select', 'i18n:select', 'checkbox', 'i18n:checkbox', 'radio', 'i18n:radio'];
  const applyValues = (key: string) => {
    const type = fields[key].type || '';
    let value;
    if (multipleTypes.includes(type) || (mayBeMultipleTypes.includes(type) && !!(fields[key].multiple))) {
      value = [];
    } else if (fileTypes.includes(type)) {
      value = null;
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
      result[key] = applyValues(key);
    }
  });
  return result;
}

export const processObject = (obj: any, callback: (parent: any, key: string, path: string) => void, path = '', parent = null, parentKey: string | null = null) => {
  if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
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

export const getDataByPath = (obj: any, path = '') => {
  const keys = path.split('.');
  return keys.reduce((accumulator: any, key: string) => {
    return (accumulator !== null && accumulator !== undefined) ? accumulator[key] : undefined;
  }, obj);
}

export const getFieldByPath = (obj: any, path: string): any => {
  const keys = path.split('.');
  let current = obj;
  let lastFound = undefined;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    // If it's the first key, just access it directly
    if (i === 0) {
      current = current[key];
    } else {
      // For subsequent keys, first check 'fields', then the key itself
      if (current && current.fields && current.fields[key] !== undefined) {
        lastFound = current; // Update last found object
        current = current.fields[key];
      } else {
        lastFound = current; // Update last found object
        current = current[key];
      }
    }

    // If current becomes undefined, we continue but keep track of last found
    if (current === undefined) {
      break;
    }
  }

  // If the last key was not found, return the last found object
  return current !== undefined ? current : lastFound;
}

export const parseInterfaceDataToAdminData = (data: IInterfaceData, override: any = {}): any => {
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
    const overrideValue = getDataByPath(override, path);
    const field = getFieldByPath(data.sections, path);

    // Array
    if (['array', 'i18n:array'].includes(field.type)) {
      if (Array.isArray(overrideValue)) {
        return parent[key] = overrideValue;
      }
      return parent[key];
    }

    // Files
    if (['file', 'i18n:file', 'image', 'i18n:image', 'video', 'i18n:video'].includes(field.type)) {
      if (typeof overrideValue === 'object' && overrideValue !== null && typeof overrideValue.path === 'string' && typeof overrideValue.meta === 'object') {
        return parent[key] = overrideValue;
      }
      return parent[key];
    }

    // Number/String
    if ((typeof parent[key] !== 'object' || typeof parent[key] !== null) && ['number', 'string'].includes(typeof overrideValue)) {
      return parent[key] = overrideValue;
    }

    return parent[key];
  });
  return result;
}

export const objectsAreDifferent = (obj1: any | Ref<any>, obj2: any | Ref<any>, keys: string[] | null = null): boolean => {

  if (isRef(obj1) && isRef(obj2)) {
    return objectsAreDifferent(obj1.value, obj2.value);
  }

  if (obj1 === obj2) return false;

  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return true;
  }

  const keys1 = Object.keys(obj1).filter(key => obj1[key] !== undefined && (!keys || keys.includes(key)));
  const keys2 = Object.keys(obj2).filter(key => obj2[key] !== undefined && (!keys || keys.includes(key)));

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
        if (objectsAreDifferent(value1[i], value2[i])) {
          return true;
        }
      }
    } else if (objectsAreDifferent(value1, value2)) {
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

export const phpStringSizeToBytes = (sizeString: string) => {
  const size = parseFloat(sizeString);
  const unit = sizeString[sizeString.length - 1].toUpperCase();

  switch (unit) {
    case 'K':
      return size * 1024;
    case 'M':
      return size * 1024 * 1024
    case 'G':
      return size * 1024 * 1024 * 1024;
    case 'T':
      return size * 1024 * 1024 * 1024 * 1024;
    default:
      return size;
  }
}

export const deepToRaw = (obj: any): any => {
  if (isReactive(obj) || isReadonly(obj)) {
    return toRaw(obj);
  }
  return obj; // If it's not reactive or readonly, return the object itself.
}
