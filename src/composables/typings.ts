import type {IField, IInterface} from '@/interfaces';
import {computed, ref, type Ref} from 'vue';
import {useInterface} from '@/composables/interface';
import {loopThroughFields} from '@/utils';
import {useUserData} from '@/composables/user-data';

type JmsInterface = {
  name: string,
  fields: {
    key: string,
    type: string
  }[]
}

const typingFileHandle: {
  typescript: null,
  php: null,
} = ref({
  typescript: null,
  php: null,
});

export function useTypings(interfaceModel: Ref<IInterface>, userData: Ref<any>) {

  const { interfaceParsedData } = useInterface(interfaceModel);
  const { getParsedUserData } = useUserData(interfaceModel, userData);

  const askForSyncTypings = async (language: 'typescript' | 'php') => {
    const [fsa] = await window.showOpenFilePicker();
    typingFileHandle.value[language] = fsa;
  }

  const syncTypings = async () => {
    if (typingFileHandle.value.typescript) {
      const writable = await typingFileHandle.value.typescript.createWritable();
      await writable.write(getTypescriptTypings());
      await writable.close();
    }
    if (typingFileHandle.value.php) {
      const writable = await typingFileHandle.value.php.createWritable();
      await writable.write(getPhpTypings());
      await writable.close();
    }
  }

  const hasSyncEnabled = computed((): boolean => {
    return !!(typingFileHandle.value.typescript)
      || !!(typingFileHandle.value.php);
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
    const keys = {
      string: 'string',
      url: 'string',
      wysiwyg: 'string',
      markdown: 'string',
      number: 'number',
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
      if (field?.multiple) {
        type = `(${type})[]`;
      }
    } else if (field?.items) {
      type = '\'' + Object.keys(field.items).join('\' | \'') + '\'';
      if (field?.multiple) {
        type = `(${type})[]`;
      }
    }

    if (field?.type.includes('i18n')) {
      type = `JmsLocaleSet<${type} | null>`;
    } else {
      type + ' | null';
    }
    return type;
  }

  const getTemplateInterfaces = (): JmsInterface[] => {
    const items: JmsInterface[] = [];

    // Loop through all fields and push to interfaces to the list
    const innerLoop = (fields: IField, key: string, jmsInterface: JmsInterface, parent = '') => {
      const nameKey = parent === '' ? key : (parent + '.' + key);
      loopThroughFields(fields || {}, (field, path) => {
        const lastKey = path.split('.').pop();
        if (field?.type) {
          if (field.type.includes('array')) {
            const name = getInterfaceName(nameKey + '.items');
            const jmsArrInterface = { name, fields: [] };
            innerLoop(field.fields, lastKey, jmsArrInterface, nameKey);
            jmsInterface.fields.push({ key: lastKey, type: `Jms${name}[]` })
          } else {
            jmsInterface.fields.push({ key: lastKey, type: getFieldType(field) })
          }
        }
      }, undefined, false)
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
        { key: 'path', type: 'string' },
        { key: 'meta', type: 'JmsFileMeta' },
      ]
    });

    // Generate base JmsImage
    items.push({
      name: 'Image',
      fields: [
        { key: 'path', type: 'string' },
        { key: 'meta', type: 'JmsImageMeta' },
      ]
    });

    // Generate base JmsVideo
    items.push({
      name: 'Video',
      fields: [
        { key: 'path', type: 'string' },
        { key: 'meta', type: 'JmsFileMeta' },
      ]
    });

    // Generate base JmsMeta
    items.push({
      name: 'FileMeta',
      fields: [
        { key: 'size', type: 'number' },
        { key: 'type', type: 'string' },
      ]
    });

    // Generate base JmsImageMeta
    items.push({
      name: 'ImageMeta',
      fields: [
        { key: 'size', type: 'number' },
        { key: 'type', type: 'string' },
        { key: 'width', type: 'number' },
        { key: 'height', type: 'number' },
      ]
    });

    return items;
  }

  const getTypescriptTypings = (): string => {
    const defaultObject = getParsedUserData();
    const locales = interfaceParsedData.value.locales;
    const typescript: JmsInterface[] = [];
    let result = `export type JmsLocale = '${Object.keys(locales).join('\' | \'')}'`;

    // Add enums if any...
    if (interfaceParsedData.value.enums) {
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
    const jmsObject = { name: 'Object', fields: [] };
    Object.keys(interfaceParsedData.value.sections).forEach((key, index) => {
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

    // Prepare default Jms object
    const defaultObjectStr = 'export const defaultJmsObject: JmsObject = ' + JSON.stringify(defaultObject, null, 2);

    return result + '\n\n' + defaultObjectStr;
  }

  const getPhpTypings = (): string => {
    const defaultObject = getParsedUserData();
    const locales = interfaceParsedData.value.locales;
    const typescript: JmsInterface[] = [];
    let result = `export interface JmsLocale = '${Object.keys(locales).join('\' | \'')}'`;

    // Add enums if any...
    if (interfaceParsedData.value.enums) {
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
    const jmsObject = { name: 'Object', fields: [] };
    Object.keys(interfaceParsedData.value.sections).forEach((key, index) => {
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
