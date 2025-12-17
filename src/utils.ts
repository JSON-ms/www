import exampleStructure from '@/assets/example-structure.yaml'
import type {IStructure, IField, IFile, TSchema, TRule} from '@/interfaces';
import type {Ref} from 'vue';
import {isRef, toRaw} from 'vue';
import JSZip from 'jszip';
import {useModelStore} from '@/stores/model';

export const allNonI18nFields: string[] = [
  'string',
  'textarea',
  'password',
  'url',
  'markdown',
  'wysiwyg',
  'number',
  'slider',
  'range',
  'color',
  'rating',
  'select',
  'checkbox',
  'radio',
  'date',
  'switch',
  'array',
  'file',
];
export const allFields: string[] = [
  ...allNonI18nFields,
  ...allNonI18nFields.map(item => 'i18n:' + item),
  'i18n',
]
export const isValidField = (field: IField): boolean => {
  return field && !!(allFields.find(item => item === field.type));
}
export const isFieldType = (field: IField, types: string | string[]): boolean => {
  if (!field) {
    return false;
  }
  types = Array.isArray(types) ? types : [types];
  for (let i = 0; i < types.length; i++) {
    const type = types[i];
    if (
      field.type === type
      || (
        allNonI18nFields.find(item => item === type)
        && field.type === ('i18n:' + type)
      )
    ) {
      return true;
    }
  }
  return false;
}
export const fieldHasChildren = (field: IField): boolean => {
  return isFieldType(field, 'node')
    || isFieldType(field, 'array');
}
export const isFieldArrayType = (field: IField): boolean => {
  return isFieldType(field, 'array')
    || isFieldType(field, 'range');
}
export const isFieldI18n = (field: IField): boolean => {
  return field && typeof field.type === 'string' && field.type.startsWith('i18n');
}
export const getFieldSchemaKey = (field: IField): string | null => {
  if (field && field.type && field.type.startsWith('schemas.')) {
    return field.type.split('schemas.')[1];
  }
  return null;
}
export const getFieldRules = (field: IField): TRule[] => {
  if (field && field.rules && Array.isArray(field.rules)) {
    return field.rules;
  }
  return [];
}
export const getFieldType = (field: IField): string => {
  return typeof field?.type === 'string' ? field.type : 'unknown'
}

export const getStructure = (content: string = getDefaultStructureContent()): IStructure => {
  return {
    label: 'Untitled',
    hash: 'new',
    content,
    endpoint: null,
    permission_structure: [],
    permission_admin: [],
    type: 'owner',
  }
}

export const isNativeObject = (obj: any) => {
  return obj && !Array.isArray(obj) && typeof obj === 'object';
}

export const valueToString = (value: any) => {
  if (value === null) {
    return "null";
  } else if (value === undefined) {
    return "undefined";
  } else {
    return String(value);
  }
}

export const getDefaultStructureContent = (): string => {
  return (exampleStructure as string)
    .replace('[STRUCTURE_EDITOR_URL]', window.location.origin)
    .replace('[BUILD_URL]', window.location.origin);
}

export const parseFields = (fields: any = {}, locales = {}, schemas: TSchema = {}) => {
  fields = fields ? fields : {}; // Make sure it's an object

  const multipleTypes = ['array', 'i18n:array', 'range', 'i18n:range'];
  const mayBeMultipleTypes = ['select', 'i18n:select', 'checkbox', 'i18n:checkbox', 'radio', 'i18n:radio', 'file', 'i18n:file'];
  const applyValues = (key: string) => {
    const field = fields[key];
    if (!field) {
      return;
    }
    const type = field.type || '';
    const required = !!(field.required);
    const multiple = !!(field.multiple);
    const schemaKey = getFieldSchemaKey(field);
    let value: any;
    if (isFieldType(field, 'range')) {
      value = required ? [field.min ?? 0, field.max ?? 100] : null;
    } else if (isFieldI18n(field) && isFieldType(field, 'array')) {
      value = [];
    } else if ((multipleTypes.includes(type) || (mayBeMultipleTypes.includes(type) && multiple)) && !isFieldI18n(field)) {
      value = [];
    } else if (isFieldType(field, 'file')) {
      value = required ? { path: null, meta: {
        type: '',
        size: 0,
        originalFileName: '',
        width: 0,
        height: 0,
        frameRate: 0,
        duration: 0,
        timestamp: new Date().getTime() / 1000,
      } } as IFile : null;
    } else if (schemaKey) {
      value = parseFields(schemas[schemaKey], locales, schemas);
    } else {
      value = required
        ? isFieldType(field, ['number', 'slider', 'rating'])
          ? 0
          : ''
        : null;
    }

    return value;
  }

  const result: any = {};
  Object.entries(fields).forEach(([key, field]: any) => {
    result[key] = {};
    if (isFieldType(field, 'node')) {
      if (isNativeObject(fields[key].fields)) {
        result[key] = parseFields(fields[key].fields, locales, schemas);
      }
    }
    else if (isFieldI18n(field)) {
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

export const getFieldDefaultValue = (field: IField, locales: {[key: string]: string}) => {
  if (isFieldType(field, 'file')) {
    if (field.multiple) {
      return [];
    }
    const defaultFileValue: IFile = {
      path: null,
      meta: {
        type: 'unknown',
        size: null,
        height: null,
        width: null,
      }
    };
    if (typeof field.default === 'string') {
      defaultFileValue.path = field.default;
    }
    if (isNativeObject(field.default)) {
      if (typeof field.default.path === 'string') {
        defaultFileValue.path = field.default.path;
      }
      if (isNativeObject(field.default.meta)) {
        Object.assign(defaultFileValue.meta, field.default.meta);
      }
    }

    ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tif', '.tiff', '.svg'].forEach(extension => {
      if (defaultFileValue.path?.endsWith(extension)) {
        defaultFileValue.meta.type = 'image/' + extension.substring(1);
      }
    });
    ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'].forEach(extension => {
      if (defaultFileValue.path?.endsWith(extension)) {
        defaultFileValue.meta.type = 'video/' + extension.substring(1);
      }
    })

    return defaultFileValue;
  }
  else if (isFieldI18n(field)) {
    const defaultValue: {[key: string]: string | null | []} = {};
    Object.entries(locales).forEach(([locale]) => {
      defaultValue[locale] = isFieldType(field, 'array')
        ? []
        : field.required ? '' : null;
      if (isNativeObject(field.default)) {
        defaultValue[locale] = field.default[locale];
      } else if (field.default) {
        defaultValue[locale] = field.default;
      }
    });
    return defaultValue;
  }
  else if (isFieldType(field, 'array')) {
    if (!Array.isArray(field.default)) {
      return [];
    }
    const items = structuredClone(field.default);
    const finalItems = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const hash = generateHash(8);
      if (isNativeObject(item)) {
        Object.keys(field.fields).forEach(key => {
          const arrField = field.fields[key];
          if (isFieldI18n(arrField)) {
            item[key] = {};
            Object.entries(locales).forEach(([locale]) => {
              if (isNativeObject(field.default[i][key])) {
                item[key][locale] = field.default[i][key][locale];
              } else {
                item[key][locale] = field.default[i][key] ?? '';
              }
            })
          } else {
            item[key] = getFieldDefaultValue(arrField, locales);
          }
        })

        item.hash = hash;
        finalItems.push(item);
      }
    }
    return finalItems;
  }
  return field.default ?? null;
}

export const processObject = (
  obj: any,
  callback: (parent: any, key: string, path: string, obj: any) => void,
  path = '',
  parent = null,
  parentKey: string | null = null,
  continueCallback: (path: string, obj: any) => boolean = () => true
) => {
  if (obj !== null && typeof obj === 'object' && !Array.isArray(obj) && continueCallback(path, obj)) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const currentPath = path ? `${path}.${key}` : key;
        processObject(obj[key], callback, currentPath, obj, key, continueCallback);
      }
    }
  } else if (parentKey) {
    callback(parent, parentKey, path, obj);
  }
}

export function updateObjectByPath(obj: any, path: string, value: any) {
  const keys = path.split(/\.|\[|\]/).filter(Boolean) as any[];
  let current: any = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key]) {
      current[key] = isNaN(Number(keys[i + 1])) ? {} : [];
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
}

export const valuesAreSameType = (a: any, b: any, deep = true): boolean => {
  // Check for null values
  if (a === null || b === null) {
    return a === b; // both must be null to be the same type
  }

  // Check for primitive types
  const typeA = typeof a;
  const typeB = typeof b;

  if (typeA !== typeB) {
    return false; // different types
  }

  if (!deep && Array.isArray(a) && Array.isArray(b)) {
    return true;
  }

  if (!deep && isNativeObject(a) && isNativeObject(b)) {
    return true;
  }

  // Handle specific types
  if (Array.isArray(a) && Array.isArray(b)) {
    // If both are arrays, check their lengths and types of elements
    if (a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => valuesAreSameType(item, b[index]));
  }

  if (typeA === 'object') {
    // If both are objects, check their keys and values
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) {
      return false; // different number of keys
    }

    return keysA.every(key => {
      return keysB.includes(key) && valuesAreSameType(a[key], b[key]);
    });
  }

  // For primitive types (number, string, boolean, symbol, undefined)
  return true; // they are the same type
}

export const dataToFieldPath = (field: IField, path: string): string => {
  return 'sections.' + path.split('.').join('.fields.') + '.default';
}

export const getDataByPath = (obj: any, path = '', defaultValue?: any) => {
  const keys = path.split(/\.|\[|\]/).filter(key => key);
  const data = keys.reduce((accumulator: any, key: string) => {
    if (accumulator !== null && accumulator !== undefined) {
      const index = Number(key);
      const value = Array.isArray(accumulator) && !isNaN(index)
        ? accumulator[index]
        : accumulator[key];
      if (key !== keys[keys.length - 1] && typeof value !== 'undefined') {
        return value;
      }
      if (defaultValue && !valuesAreSameType(defaultValue, value, false)) {
        return defaultValue;
      }
      return value;
    }
    return undefined;
  }, obj);
  if (defaultValue && data === undefined) {
    return defaultValue;
  }
  return data;
}

export const getFieldByPath = (obj: any, path: string): any => {
  const keys = path.split(/\.|\[|\]/).filter(key => key); // Split by dot or brackets and filter out empty strings
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
  const raw = toRaw(obj);
  if (Array.isArray(raw)) {
    return raw.map(item => deepToRaw(item));
  } else if (typeof raw === 'object' && raw !== null) {
    const result: any = {};
    for (const key in raw) {
      if (raw.hasOwnProperty(key)) {
        result[key] = deepToRaw(raw[key]);
      }
    }
    return result;
  }
  return raw;
}

type TBlobItem = { filename: string, blob: Blob }
export async function urlsToBlobArray(
  urls: string[],
  secret?: string,
  onItemDownload?: (item: TBlobItem, index: number) => void,
  onItemBeforeDownload?: (url: string, index: number) => void,
): Promise<TBlobItem[]> {
  return new Promise(async (resolve, reject) => {
    const items: TBlobItem[] = [];
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        const params: any = {
          headers: {
            'Content-Type': 'application/octet-stream',
          },
        };
        if (secret) {
          params.headers['X-Jms-Api-Key'] = secret;
        }

        if (onItemBeforeDownload instanceof Function) {
          onItemBeforeDownload(url, i);
        }
        const response = await fetch(url, params);
        if (!response.ok) {
          console.error(`Failed to fetch ${url}: ${response.statusText}`);
          reject(`Failed to fetch ${url}: ${response.statusText}`)
          continue;
        }
        const blob = await response.blob();
        const filename = url.split('/').pop() ?? 'file';
        const item = { filename, blob };
        items.push(item);
        if (onItemDownload instanceof Function) {
          onItemDownload(item, i);
        }
      } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        reject(`Error fetching ${url}:` + error)
      }
    }
    resolve(items);
  })
}

export async function downloadFilesAsZip(urls: string[], jsonData: object | false, zipFileName: string, tabSize = 2): Promise<Blob> {
  return new Promise(async (resolve, reject) => {

    const zip = new JSZip();
    const modelStore = useModelStore();

    // Add JSON data as a file
    if (jsonData) {
      zip.file("data.json", JSON.stringify(jsonData, null, tabSize));
    }

    // Fetch each URL and add it as a blob to the zip
    const files = await urlsToBlobArray(urls, modelStore.structure.server_secret);
    files.forEach(file => {
      zip.file(file.filename, file.blob);
    })

    // Generate the zip file
    try {
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = zipFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      resolve(content);
    } catch (error) {
      reject(error);
    }
  })
}

export function loopThroughFields(
  fields: { [key: string]: IField },
  callback: (field: IField, path: string, data: any) => void,
  parsedUserData?: any,
  enterArrays = true,
  enterNodes = true,
): void {
  const loop = (items: { [key: string]: IField }, path = '') => {
    Object.keys(items).forEach(key => {
      const newPath = path === '' ? key : `${path}.${key}`;
      const field = getFieldByPath(fields, newPath.replace(/\[\d+\]/gm, ''));
      const data = parsedUserData && getDataByPath(parsedUserData, newPath);

      // Check if field and data are defined before calling the callback
      if (field) {
        callback(field, newPath, data);
      }

      if (field?.fields) {
        if (!enterArrays && isFieldType(field, 'array')) {
          return;
        }
        if (isFieldType(field, 'array') && Array.isArray(data)) {
          data.forEach((item, index) => {
            loop(field.fields, `${newPath}[${index}]`);
          });
        } else if (!isFieldType(field, 'node') || enterNodes) {
          loop(field.fields, newPath);
        }
      }
    });
  };

  loop(fields);
}

export function getFileIcon(file: IFile): string {
  const iconMapping: {[key: string]: string} = {
    pdf: 'mdi-file-pdf-box',
    doc: 'mdi-file-word',
    docx: 'mdi-file-word',
    xls: 'mdi-file-excel',
    xlsx: 'mdi-file-excel',
    ppt: 'mdi-file-powerpoint',
    pptx: 'mdi-file-powerpoint',
    txt: 'mdi-file-document-outline',
    rtf: 'mdi-file-document-outline',
    jpg: 'mdi-file-image',
    jpeg: 'mdi-file-image',
    png: 'mdi-file-image',
    gif: 'mdi-file-image',
    svg: 'mdi-file-image',
    zip: 'mdi-folder-zip',
    rar: 'mdi-folder-zip',
    mp3: 'mdi-music',
    wav: 'mdi-music',
    mp4: 'mdi-file-video',
    avi: 'mdi-file-video',
    mov: 'mdi-file-video',
    html: 'mdi-file-code',
    css: 'mdi-file-code',
    js: 'mdi-file-code',
    json: 'mdi-file-code',
    xml: 'mdi-file-code'
  };
  const extension = (file.meta.originalFileName || '').split('.').pop() || '';
  if (iconMapping[extension]) {
    return iconMapping[extension];
  }
  return 'mdi-file';
}

export function parseStringValue(value: string) {
  value = value.trim();
  if (value === "null") { return null; }
  if (value === "true") { return true; }
  if (value === "false") { return false; }

  const numValue = Number(value);
  if (!isNaN(numValue) && value.trim() !== "") {
    return numValue;
  }
  return value;
}

export function formatDate(date: Date, format = 'YYYY-MM-DD HH:mm:ss') {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  // Replace format tokens with actual values
  return format
    .replace('YYYY', year.toString())
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

export function cleanProperties(data: any, defaultValue: any): any {
  const result: any = Array.isArray(defaultValue) ? [] : {}

  for (const key in defaultValue) {
    const defVal = defaultValue[key]
    const dataVal = data?.[key]

    if (
      defVal !== null &&
      typeof defVal === 'object' &&
      !Array.isArray(defVal)
    ) {
      result[key] =
        dataVal !== null &&
        typeof dataVal === 'object' &&
        !Array.isArray(dataVal)
          ? cleanProperties(dataVal, defVal)
          : defVal
    } else if (Array.isArray(defVal)) {
      result[key] = Array.isArray(dataVal) ? dataVal : defVal
    } else {
      if (dataVal === null || defVal === null) {
        result[key] = dataVal !== undefined ? dataVal : defVal
      } else {
        result[key] =
          typeof dataVal === typeof defVal ? dataVal : defVal
      }
    }
  }

  return result
}
