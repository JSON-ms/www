import type {IField} from '@/interfaces';
import {computed, ref} from 'vue';
import {useInterface} from '@/composables/interface';
import {isFieldI18n, loopThroughFields} from '@/utils';
import {useUserData} from '@/composables/user-data';
import {useModelStore} from '@/stores/model';

declare global {
  export interface Window {
    showOpenFilePicker: () => Promise<[FileSystemFileHandle]>;
  }
}

type JmsInterface = {
  name: string,
  fields: {
    key: string,
    type: string
  }[]
}

const typingFileHandle = ref<{[key: string]: {
  typescript?: FileSystemFileHandle | null,
  php?: FileSystemFileHandle | null,
}}>({});

export function useTypings() {

  const modelStore = useModelStore();
  const { interfaceParsedData } = useInterface();
  const { getParsedUserData } = useUserData();

  const askForSyncTypings = async (language: 'typescript' | 'php') => {
    const hash = modelStore.interface.hash;
    if (hash) {
      const [fsa] = await window.showOpenFilePicker();
      const handle = typingFileHandle.value[hash];
      if (!handle) {
        typingFileHandle.value[hash] = {}
      }
      typingFileHandle.value[hash][language] = fsa;
    }
  }

  const syncTypings = async () => {
    const hash = modelStore.interface.hash;
    if (hash) {
      const handle = typingFileHandle.value[hash];
      if (handle) {
        if (handle.typescript) {
          const writable = await handle.typescript.createWritable();
          await writable.write(getTypescriptTypings());
          await writable.close();
        }
        if (handle.php) {
          const writable = await handle.php.createWritable();
          await writable.write(getPhpTypings());
          await writable.close();
        }
      }
    }
  }

  const hasSyncEnabled = computed((): boolean => {
    const hash = modelStore.interface.hash;
    if (hash) {
      const handle = typingFileHandle.value[hash];
      if (handle) {
        return !!(handle.typescript)
          || !!(handle.php);
      }
    }
    return false;
  })

  const getInterfaceName = (path: string): string => {
    const keys = path.split('.');
    let name = ''
    keys.forEach(key => {
      name += key.charAt(0).toUpperCase() + key.slice(1);
    })
    return name;
  }

  const getFieldType = (field: IField): string => {
    const keys: {[key: string]: string} = {
      string: 'string',
      url: 'string',
      wysiwyg: 'string',
      markdown: 'string',
      number: 'number',
      slider: 'number',
      rating: 'number',
      select: field.multiple ? '[]' : 'string',
      checkbox: field.multiple ? '[]' : 'string',
      radio: 'string',
      date: 'Date',
      file: 'JmsFile',
      image: 'JmsImage',
      video: 'JmsVideo',
      array: '[]',
    };
    Object.keys(keys).forEach(key => {
      keys['i18n:' + key] = keys[key];
    })
    keys.i18n = 'string';

    let type = keys[field?.type || 'string'];
    if (field?.items && typeof field.items === 'string' && field.items.startsWith('enums.')) {
      const name = field.items.split('enums.');
      type = 'JmsEnum' + getInterfaceName(name[1]);
    } else if (field?.items) {
      type = '\'' + Object.keys(field.items).join('\' | \'') + '\'';
    }

    if (isFieldI18n(field)) {
      let i18nType = type;
      if (!field.required && !field?.multiple) {
        i18nType += ' | null';
      }
      type = `JmsLocaleSet<${i18nType}>`;
    } else if (!field.required && !field?.multiple) {
      type += ' | null';
    } else if (field?.multiple) {
      type = type.includes(' | ') ? `(${type})[]` : `${type}[]`;
    }
    return type;
  }

  const getTemplateInterfaces = (): JmsInterface[] => {
    const items: JmsInterface[] = [];

    // Loop through all fields and push to interfaces to the list
    const innerLoop = (fields: { [key: string]: IField }, key: string, jmsInterface: JmsInterface, parent = '') => {
      const nameKey = parent === '' ? key : (parent + '.' + key);
      loopThroughFields(fields || {}, (field, path) => {
        const lastKey = path.split('.').pop();
        if (lastKey && field?.type) {
          if (field.type.includes('array')) {
            const name = getInterfaceName(nameKey + '.items');
            const jmsArrInterface = { name, fields: [] };
            const fields = structuredClone(field.fields);
            fields.hash = { type: 'string', required: true, label: '', fields: {} }
            innerLoop(fields, lastKey, jmsArrInterface, nameKey);
            jmsInterface.fields.push({ key: lastKey, type: `Jms${name}[]` })
          } else if (field.type === 'node') {
            const nodeKey = nameKey + '.' + path;
            const name = getInterfaceName(nodeKey);
            const jmsNodeInterface = { name, fields: [] };
            const fields = structuredClone(field.fields);
            innerLoop(fields, lastKey, jmsNodeInterface, nameKey);
            jmsInterface.fields.push({ key: lastKey, type: `Jms${name}` })
          } else {
            jmsInterface.fields.push({ key: lastKey, type: getFieldType(field) })
          }
        }
      }, undefined, false, false)
      items.push(jmsInterface);
    }
    Object.keys(interfaceParsedData.value.sections).forEach((key: string) => {
      const jmsInterface = { name: getInterfaceName(key), fields: [] };
      innerLoop(interfaceParsedData.value.sections[key]?.fields, key, jmsInterface)
    })
    return items;
  }

  const getFileInterfaces = (): JmsInterface[] => {
    const items: JmsInterface[] = [];

    // Generate base JmsFile
    items.push({
      name: 'File',
      fields: [
        { key: 'path', type: 'string | null' },
        { key: 'meta', type: 'JmsFileMeta' },
      ]
    });
    // Generate base JmsMeta
    items.push({
      name: 'FileMeta',
      fields: [
        { key: 'size', type: 'number' },
        { key: 'type', type: 'string' },
        { key: 'width', type: 'number' },
        { key: 'height', type: 'number' },
        { key: 'timestamp', type: 'number' },
        { key: 'originalFileName', type: 'string' },
      ]
    });

    return items;
  }

  const getTypescriptTypings = (defaultObjOnly = false): string => {
    const defaultObject = getParsedUserData();
    const locales = interfaceParsedData.value.locales;
    const typescript: JmsInterface[] = [];
    let result = '';
      if (!defaultObjOnly) {
        result += `export type JmsLocale = '${Object.keys(locales).join('\' | \'')}'`;
        result += '\n\n';
        result += `export type JmsSection = '${Object.keys(interfaceParsedData.value.sections).join('\' | \'')}'`;

      // Add enums if any...
      if (Object.keys(interfaceParsedData.value.enums).length > 0) {
        result += '\n\n';
        Object.keys(interfaceParsedData.value.enums).forEach((enumKey, enumIndex) => {
          if (enumIndex > 0) {
            result += '\n\n';
          }
          const enumItem = interfaceParsedData.value.enums[enumKey];
          result += `export type JmsEnum${getInterfaceName(enumKey)} = '${Object.keys(enumItem).join('\' | \'')}'`;
        })
      }
      result += '\n\n';
      result += `export type JmsLocaleSet<T> = {
  '${Object.keys(locales).join('\': T\n  \'')}': T
}`
      result += '\n\n';

      // Prepare interfaces
      typescript.push(...getTemplateInterfaces());
      typescript.reverse();
      typescript.push(...getFileInterfaces());
      typescript.reverse();

      // Generate base JmsObject
      const jmsObject: { name: string, fields: { key: string, type: string }[] } = { name: 'Object', fields: [] };
      Object.keys(interfaceParsedData.value.sections).forEach((key) => {
        if (interfaceParsedData.value.sections[key]) {
          jmsObject.fields.push({ key, type: 'Jms' + getInterfaceName(key) })
        }
      })
      typescript.push(jmsObject);

      // Generate interfaces
      typescript.forEach((ts, tsIdx) => {
        if (ts.fields.length > 0) {
          if (tsIdx > 0) {
            result += '\n\n';
          }
          result += `export interface Jms${ts.name} {\n`;
          ts.fields.forEach((field, fieldIdx) => {
            if (fieldIdx > 0) {
              result += '\n';
            }
            result += `  ${field.key}: ${field.type}`;
          });
          result += `\n}`;
        }
      })
    }
    // Prepare default Jms object
    const defaultObjectStr = 'const defaultJmsObject: JmsObject = ' + JSON.stringify(defaultObject, null, 2);
    const localesStr = 'const locales: { [key: string]: string } = ' + JSON.stringify(interfaceParsedData.value.locales, null, 2);

    return (result
      + '\n\n' + localesStr
      + '\n\nexport { locales }'
      + '\n\n' + defaultObjectStr
      + '\n\nexport default defaultJmsObject').trim();
  }

  const getPhpTypings = (defaultObjOnly = false): string => {
    const defaultObject = getParsedUserData();
    const locales = interfaceParsedData.value.locales;
    const typescript: JmsInterface[] = [];
    let result = `export type JmsLocale = '${Object.keys(locales).join('\' | \'')}'`;
    result += '\n\n';
    result += `export type JmsSection = '${Object.keys(interfaceParsedData.value.sections).join('\' | \'')}'`;

    // Add enums if any...
    if (Object.keys(interfaceParsedData.value.enums).length > 0) {
      result += '\n\n';
      Object.keys(interfaceParsedData.value.enums).forEach((enumKey, enumIndex) => {
        if (enumIndex > 0) {
          result += '\n\n';
        }
        const enumItem = interfaceParsedData.value.enums[enumKey];
        result += `export interface JmsEnum${getInterfaceName(enumKey)} = '${Object.keys(enumItem).join('\' | \'')}'`;
      })
    }
    result += '\n\n';
    result += `export type JmsLocaleSet<T> = {
  '${Object.keys(locales).join('\': T\n  \'')}': T
}`
    result += '\n\n';

    // Prepare interfaces
    typescript.push(...getTemplateInterfaces());
    typescript.reverse();
    typescript.push(...getFileInterfaces());
    typescript.reverse();

    // Generate base JmsObject
    const jmsObject: { name: string, fields: { key: string, type: string }[] } = { name: 'Object', fields: [] };
    Object.keys(interfaceParsedData.value.sections).forEach((key) => {
      if (interfaceParsedData.value.sections[key]) {
        jmsObject.fields.push({ key, type: 'Jms' + getInterfaceName(key) })
      }
    })
    typescript.push(jmsObject);

    // Generate interfaces
    typescript.forEach((ts, tsIdx) => {
      if (ts.fields.length > 0) {
        if (tsIdx > 0) {
          result += '\n\n';
        }
        result += `export interface Jms${ts.name} {\n`;
        ts.fields.forEach((field, fieldIdx) => {
          if (fieldIdx > 0) {
            result += '\n';
          }
          result += `  public $${field.key}: ${field.type}`;
        });
        result += `\n}`;
      }
    })

    // Prepare default Jms object
    const defaultObjectStr = 'export $defaultJmsObject: JmsObject = ' + JSON.stringify(defaultObject, null, 2);

    return '<?php\n\n' + result + '\n\n' + defaultObjectStr;
  }

  return {
    typingFileHandle,
    askForSyncTypings,
    syncTypings,
    hasSyncEnabled,
    getTypescriptTypings,
    getPhpTypings,
  }
}
