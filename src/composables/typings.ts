import type {IField} from '@/interfaces';
import {isFieldI18n, isFieldType, loopThroughFields} from '@/utils';
import {useGlobalStore} from "@/stores/global";;
import {useStructure} from "@/composables/structure";
import {useUserData} from "@/composables/user-data";

type JmsStructure = {
  name: string,
  fields: {
    key: string,
    type: string
  }[]
}

export function useTypings() {

  const globalStore = useGlobalStore();
  const { structureParsedData } = useStructure();
  const { getParsedUserData } = useUserData();

  const getStructureName = (path: string): string => {
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
      textarea: 'string',
      url: 'string',
      wysiwyg: 'string',
      markdown: 'string',
      number: 'number',
      slider: 'number',
      range: '[number, number]',
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

    let type = keys[field.type || 'string'];
    if (field?.items && typeof field.items === 'string' && field.items.startsWith('enums.')) {
      const name = field.items.split('enums.');
      type = 'JmsEnum' + getStructureName(name[1]);
    } else if (field.items) {
      type = '\'' + Object.keys(field.items).join('\' | \'') + '\'';
    }

    if (isFieldI18n(field)) {
      let i18nType = type;
      if (!field.required && !field.multiple) {
        i18nType += ' | null';
      }
      type = `JmsLocaleSet<${i18nType}>`;
    } else if (!field.required && !field.multiple && type !== '[]') {
      type += ' | null';
    } else if (field.multiple) {
      type = type.includes(' | ') ? `(${type})[]` : `${type}[]`;
    }
    return type;
  }

  const getTemplateStructures = (): JmsStructure[] => {
    const items: JmsStructure[] = [];

    // Loop through all fields and push to structures to the list
    const innerLoop = (fields: { [key: string]: IField }, key: string, jmsStructure: JmsStructure, parent = '') => {
      const nameKey = parent === '' ? key : (parent + '.' + key);
      loopThroughFields(fields || {}, (field, path) => {
        const lastKey = path.split('.').pop();
        if (lastKey) {
          if (isFieldType(field, 'array')) {
            const name = getStructureName(nameKey + '.' + lastKey + '.items');
            const jmsArrStructure = { name, fields: [] };
            const fields = structuredClone(field.fields);
            fields.hash = { type: 'string', required: true, label: '', fields: {} }
            innerLoop(fields, lastKey, jmsArrStructure, nameKey);
            if (isFieldI18n(field)) {
              jmsStructure.fields.push({ key: lastKey, type: `JmsLocaleSet<Jms${name}[]>` })
            } else {
              jmsStructure.fields.push({ key: lastKey, type: `Jms${name}[]` })
            }
          } else if (isFieldType(field, 'node')) {
            const nodeKey = nameKey + '.' + path;
            const name = getStructureName(nodeKey);
            const jmsNodeStructure = { name, fields: [] };
            const fields = structuredClone(field.fields);
            innerLoop(fields, lastKey, jmsNodeStructure, nameKey);
            jmsStructure.fields.push({ key: lastKey, type: `Jms${name}` })
          } else {
            jmsStructure.fields.push({ key: lastKey, type: getFieldType(field) })
          }
        }
      }, undefined, false, false)
      items.push(jmsStructure);
    }
    Object.keys(structureParsedData.value.sections).forEach((key: string) => {
      const jmsStructure = { name: getStructureName(key), fields: [] };
      innerLoop(structureParsedData.value.sections[key]?.fields, key, jmsStructure)
    })
    return items;
  }

  const getFileStructures = (): JmsStructure[] => {
    const items: JmsStructure[] = [];

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
        { key: 'size?', type: 'number | null' },
        { key: 'type?', type: 'string' },
        { key: 'width?', type: 'number | null' },
        { key: 'height?', type: 'number | null' },
        { key: 'timestamp?', type: 'number' },
        { key: 'frameRate?', type: 'number' },
        { key: 'duration?', type: 'number' },
        { key: 'originalFileName?', type: 'string' },
      ]
    });

    return items;
  }

  const getTypescriptDefaultObj = (structuredData = structureParsedData.value): string => {
    const defaultData = getParsedUserData(structuredData);

    // Prepare default Jms object
    if (globalStore.userSettings.data.blueprintsIncludeTypings) {
      const importStr = `import { type JmsData } from './typings'`;
      const defaultDataStr = 'export const defaultData: JmsData = ' + JSON.stringify(defaultData, null, globalStore.userSettings.data.editorTabSize);
      const localesStr = 'export const locales: { [key: string]: string } = ' + JSON.stringify(structuredData.locales, null, globalStore.userSettings.data.editorTabSize);

      return (importStr + '\n\n' + localesStr + '\n\n' + defaultDataStr).trim();
    } else {
      const defaultDataStr = 'export const defaultData = ' + JSON.stringify(defaultData, null, globalStore.userSettings.data.editorTabSize);
      const localesStr = 'export const locales = ' + JSON.stringify(structuredData.locales, null, globalStore.userSettings.data.editorTabSize);

      return (localesStr + '\n\n' + defaultDataStr).trim();
    }
  }

  const getTypescriptTypings = (structuredData = structureParsedData.value): string => {
    const locales = structuredData.locales;
    const typescript: JmsStructure[] = [];
    const tabSize = globalStore.userSettings.data.editorTabSize;
    let result = '';

    result += `export type JmsLocaleKey = '${Object.keys(locales).join('\' | \'')}'`;
    result += '\n\n';
    result += `export type JmsSectionKey = '${Object.keys(structuredData.sections).join('\' | \'')}'`;

    // Add enums if any...
    if (Object.keys(structuredData.enums).length > 0) {
      result += '\n\n';
      Object.keys(structuredData.enums).forEach((enumKey, enumIndex) => {
        if (enumIndex > 0) {
          result += '\n\n';
        }
        const enumItem = structuredData.enums[enumKey];
        result += `export type JmsEnum${getStructureName(enumKey)} = '${Object.keys(enumItem).join('\' | \'')}'`;
      })
    }
    result += '\n\n';
    result += 'export type JmsLocaleSet<T';
    result += `> = {\n${' '.repeat(tabSize)}'${Object.keys(locales).join(`': T\n${' '.repeat(tabSize)}'`)}': T\n}`
    result += '\n\n';

    // Prepare structures
    typescript.push(...getTemplateStructures());
    typescript.reverse();
    typescript.push(...getFileStructures());
    typescript.reverse();

    // Generate base JmsData
    const jmsData: { name: string, fields: { key: string, type: string }[] } = { name: 'Data', fields: [] };
    Object.keys(structuredData.sections).forEach((key) => {
      if (structuredData.sections[key]) {
        jmsData.fields.push({ key, type: 'Jms' + getStructureName(key) })
      }
    })
    typescript.push(jmsData);

    // Generate structures
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
          result += `${' '.repeat(tabSize)}${field.key}: ${field.type}`;
        });
        result += `\n}`;
      }
    })

    return result.trim();
  }

  return {
    getStructureName,
    getFieldType,
    getTemplateStructures,
    getFileStructures,
    getTypescriptDefaultObj,
    getTypescriptTypings,
  }
}
