import exampleInterface from '@/assets/example-interface.yaml'
import type {IInterface, IField, IFile} from '@/interfaces';
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
export const isFieldI18n = (field: IField): boolean => {
  return field && typeof field.type === 'string' && field.type.startsWith('i18n');
}
export const getFieldType = (field: IField): string => {
  return typeof field?.type === 'string' ? field.type : 'unknown'
}

export const getInterface = (content: string = getDefaultInterfaceContent()): IInterface => {
  return {
    label: 'Untitled',
    hash: 'new',
    content,
    webhook: null,
    permission_interface: [],
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

export const getDefaultInterfaceContent = (): string => {
  return (exampleInterface as string)
    .replace('[INTERFACE_EDITOR_URL]', window.location.origin);
}

export const parseFields = (fields: any = {}, locales = {}) => {
  fields = fields ? fields : {}; // Make sure it's an object

  const multipleTypes = ['array', 'i18n:array'];
  const mayBeMultipleTypes = ['select', 'i18n:select', 'checkbox', 'i18n:checkbox', 'radio', 'i18n:radio', 'file', 'i18n:file'];
  const applyValues = (key: string) => {
    const field = fields[key];
    if (!field) {
      return;
    }
    const type = field.type || '';
    const required = !!(field.required);
    const multiple = !!(field.multiple);
    let value;
    if (multipleTypes.includes(type) || (mayBeMultipleTypes.includes(type) && multiple)) {
      value = [];
    } else if (isFieldType(field, 'file')) {
      value = required ? { path: null, meta: {
        type: '',
        size: 0,
        originalFileName: '',
        width: 0,
        height: 0,
      } } as IFile : null;
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
        result[key] = parseFields(fields[key].fields, locales);
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

export const processObject = (
  obj: any,
  callback: (parent: any, key: string, path: string) => void,
  path = '',
  parent = null,
  parentKey: string | null = null,
  continueCallback: (path: string) => boolean = () => true
) => {
  if (obj !== null && typeof obj === 'object' && !Array.isArray(obj) && continueCallback(path)) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const currentPath = path ? `${path}.${key}` : key;
        processObject(obj[key], callback, currentPath, obj, key, continueCallback);
      }
    }
  } else if (parentKey) {
    callback(parent, parentKey, path);
  }
}

export const getDataByPath = (obj: any, path = '') => {
  const keys = path.split(/\.|\[|\]/).filter(key => key);
  return keys.reduce((accumulator: any, key: string) => {
    if (accumulator !== null && accumulator !== undefined) {
      const index = Number(key);
      return Array.isArray(accumulator) && !isNaN(index) ? accumulator[index] : accumulator[key];
    }
    return undefined;
  }, obj);
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

export async function downloadFilesAsZip(urls: string[], jsonData: object | false, zipFileName: string): Promise<Blob> {
  return new Promise(async (resolve, reject) => {

    const zip = new JSZip();
    const modelStore = useModelStore();

    // Add JSON data as a file
    if (jsonData) {
      zip.file("data.json", JSON.stringify(jsonData, null, 2));
    }

    // Fetch each URL and add it as a blob to the zip
    for (const url of urls) {
      try {
        const params = {
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-Jms-Api-Key': modelStore.interface.server_secret,
          },
        };
        // @ts-expect-error No idea why it complains...
        const response = await fetch(url, params);
        if (!response.ok) {
          console.error(`Failed to fetch ${url}: ${response.statusText}`);
          reject(`Failed to fetch ${url}: ${response.statusText}`)
          continue;
        }
        const blob = await response.blob();
        const fileName = url.split('/').pop() ?? 'file';
        zip.file(fileName, blob);
      } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        reject(`Error fetching ${url}:` + error)
      }
    }

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
  const extension = file.meta.originalFileName.split('.').pop() || '';
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
