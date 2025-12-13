import type {IField, IStructure} from '@/interfaces';
import {deepToRaw, isFieldI18n, isFieldType, loopThroughFields} from '@/utils';
import {useModelStore} from "@/stores/model";
import {useGlobalStore} from "@/stores/global";
import {ref} from "vue";
import {useStructure} from "@/composables/structure";
import {useUserData} from "@/composables/user-data";

declare global {
  export interface Window {
    showDirectoryPicker: (options: { id: string, mode: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
  }
}

type JmsStructure = {
  name: string,
  fields: {
    key: string,
    type: string
  }[]
}

const handleReference: {[key: string]: FileSystemDirectoryHandle | null} = {}
export const lastStateTimestamp = ref(0);
const localStorageHandleKey = 'jsonms/typings:handle-list';
const localStorageExplanationsKey = 'jsonms/typings:explanations';

export const isFolderSynced = (structure: IStructure, language: 'typescript' | 'php'): boolean => {
  const hash = structure.hash ?? 'unknown';
  const id = `${hash}_${language}`;
  return !!(handleReference[id]);
}

export function useTypings() {

  const modelStore = useModelStore();
  const globalStore = useGlobalStore();
  const { serverSettings, structureParsedData, getParsedStructureData } = useStructure();
  const { getParsedUserData } = useUserData();

  const autoAskToSyncFolder = async (structure: IStructure, language: 'typescript' | 'php') => {
    const hash = structure.hash ?? 'unknown';
    const id = `${hash}_${language}`;
    const keys = JSON.parse(localStorage.getItem(localStorageHandleKey) || '[]');
    keys.forEach((key: string) => {
      if (key === id && !handleReference[id]) {
        globalStore.setPrompt({
          ...globalStore.prompt,
          visible: true,
          title: 'Local Folder Syncing',
          icon: 'mdi-sync',
          body: 'This project was previously synced to your local folder. For security reasons, your browser resets this permission whenever the page loses its session. Would you like to resume syncing?',
          btnText: 'Resume',
          btnColor: 'secondary',
          callback: () => new Promise((resolve, reject) => {
            askToSyncFolder(structure, language).then(() => {
              resolve();
            }).catch(reject);
          }),
          cancelCallback: () => new Promise(resolve => {
            let keys = JSON.parse(localStorage.getItem(localStorageHandleKey) || '[]');
            keys = keys.filter((key: string) => key !== id);
            localStorage.setItem(localStorageHandleKey, JSON.stringify(keys));
            resolve();
          }),
        });
      }
    })
  }

  const askToSyncFolder = async (structure: IStructure, language: 'typescript' | 'php') => {
    const explanationCallback = async () => {
      const hash = structure.hash ?? 'unknown';
      const id = `${hash}_${language}`;
      handleReference[id] = await window.showDirectoryPicker({
        id,
        mode: 'readwrite',
      });

      if (handleReference[id]) {
        let keys = JSON.parse(localStorage.getItem(localStorageHandleKey) || '[]');
        keys = keys.filter((key: string) => key !== id);
        keys.push(id);
        localStorage.setItem(localStorageHandleKey, JSON.stringify(keys));
        await syncFromFolder(structure, language);
        if (globalStore.session.loggedIn) {
          await syncToFolder(structure, language);
        }
      }
    }
    const acknowledgedExplanations = localStorage.getItem(localStorageExplanationsKey);
    if (!acknowledgedExplanations) {
      globalStore.setPrompt({
        ...globalStore.prompt,
        visible: true,
        title: 'Read Carefully',
        icon: 'mdi-alert',
        body: 'You will need to select a folder where the structure, user data, typings, and default object structure in JSON format will be updated in real-time on your local machine. We recommend using a folder named "jms" within your "src" directory. For security reasons, your browser requires session-based permission for local folder synchronization, so you will need to reselect this folder each time you refresh or return to this page.',
        btnText: 'Proceed',
        btnColor: 'warning',
        callback: () => new Promise((resolve, reject) => {
          localStorage.setItem(localStorageExplanationsKey, '1');
          explanationCallback().then(() => {
            resolve();
          }).catch(reject)
        }),
      });
    } else {
      await explanationCallback();
    }
  }

  const unSyncFolder = async (structure: IStructure, language: 'typescript' | 'php', clean = false) => {
    const hash = structure.hash ?? 'unknown';
    const id = `${hash}_${language}`;

    if (clean) {
      delete handleReference[id];
      let keys = JSON.parse(localStorage.getItem(localStorageHandleKey) || '{}');
      keys = keys.filter((key: string) => key !== id);
      localStorage.setItem(localStorageHandleKey, JSON.stringify(keys));
    }

    lastStateTimestamp.value = new Date().getTime();
  }

  const syncToFolder = async (structure: IStructure, language: 'typescript' | 'php', types: ('structure' | 'typings' | 'default' | 'data' | 'settings' | 'index')[] = ['structure', 'default', 'typings', 'data', 'settings', 'index']) => {
    const id = `${structure.hash ?? 'unknown'}_${language}`;
    const oneTab = ' '.repeat(globalStore.userSettings.data.editorTabSize);
    if (handleReference[id]) {
      const structuredData = getParsedStructureData(structure);
      const fileSaveList: {
        writableStream: FileSystemWritableFileStream,
        content: string
      }[] = [];

      // structure.yml
      if (globalStore.userSettings.data.blueprintsWriteToStructure && types.includes('structure')) {
        await (async () => {
          if (handleReference[id]) {
            const fileHandle = await handleReference[id].getFileHandle('structure.yml', { create: true });
            const file = await fileHandle.getFile();
            const existingData = await file.text();
            const content = structure.content;
            if (existingData !== content) {
              const writableStream = await fileHandle.createWritable();
              fileSaveList.push({ writableStream, content });
            }
          }
        })();

        await (async () => {
          if (handleReference[id]) {
            const fileHandle = await handleReference[id].getFileHandle('structure.json', { create: true });
            const file = await fileHandle.getFile();
            const existingData = await file.text();
            const content = JSON.stringify(structuredData, null, globalStore.userSettings.data.editorTabSize);
            if (existingData !== content) {
              const writableStream = await fileHandle.createWritable();
              fileSaveList.push({ writableStream, content });
            }
          }
        })();
      }

      // typings.yml
      if (globalStore.userSettings.data.blueprintsWriteToTypings && types.includes('typings')) {
        await (async () => {
          if (handleReference[id]) {
            const fileHandle = await handleReference[id].getFileHandle('typings.ts', {create: true});
            const file = await fileHandle.getFile();
            const existingData = await file.text();
            const content = getTypescriptTypings(structuredData);
            if (existingData !== content) {
              const writableStream = await fileHandle.createWritable();
              fileSaveList.push({ writableStream, content });
            }
          }
        })();
      }

      // default.ts
      if (globalStore.userSettings.data.blueprintsWriteToDefault && types.includes('default')) {
        await (async () => {
          if (handleReference[id]) {
            const fileHandle = await handleReference[id].getFileHandle('default.ts', {create: true});
            const file = await fileHandle.getFile();
            const existingData = await file.text();
            const content = getTypescriptDefaultObj(structuredData);
            if (existingData !== content) {
              const writableStream = await fileHandle.createWritable();
              fileSaveList.push({ writableStream, content });
            }
          }
        })();
      }

      // settings.ts
      if (globalStore.userSettings.data.blueprintsWriteToSettings && types.includes('settings')) {
        await (async () => {
          if (handleReference[id]) {
            const fileHandle = await handleReference[id].getFileHandle('settings.json', {create: true});
            const file = await fileHandle.getFile();
            const existingData = await file.text();
            const content = JSON.stringify(serverSettings.value, null, globalStore.userSettings.data.editorTabSize);
            if (existingData !== content) {
              const writableStream = await fileHandle.createWritable();
              fileSaveList.push({ writableStream, content });
            }
          }
        })();
      }

      // data.json
      if (globalStore.userSettings.data.blueprintsWriteToData && types.includes('data')) {
        await (async () => {
          if (handleReference[id]) {
            const content = JSON.stringify(deepToRaw(modelStore.userData), null, globalStore.userSettings.data.editorTabSize);
            const fileHandle = await handleReference[id].getFileHandle('data.json', {create: true});
            const file = await fileHandle.getFile();
            const existingData = await file.text();
            if (existingData !== content) {
              const writableStream = await fileHandle.createWritable();
              fileSaveList.push({ writableStream, content });
            }
          }
        })();
      }

      // index.ts
      if (globalStore.userSettings.data.blueprintsWriteToIndex && types.includes('index')) {
        await (async () => {
          if (handleReference[id]) {
            const fileHandle = await handleReference[id].getFileHandle('index.ts', {create: true});
            const file = await fileHandle.getFile();
            const existingData = await file.text();
            let content = ''

            if (globalStore.userSettings.data.blueprintsWriteToTypings) {
              content += `import { type JmsSectionKey, type JmsLocaleKey, type JmsData } from './typings';\n`;
            }
            if (globalStore.userSettings.data.blueprintsWriteToDefault) {
              content += `import { defaultData, locales } from './default';\n`
            }
            if (globalStore.userSettings.data.blueprintsWriteToData) {
              content += `import data from './data.json';\n`
            }
            if (globalStore.userSettings.data.blueprintsWriteToStructure) {
              content += `import structure from './structure.json';\n`
            }
            if (globalStore.userSettings.data.blueprintsWriteToSettings) {
              content += `import settings from './settings.json';\n`
            }

            content += `\nexport {\n`;
            if (globalStore.userSettings.data.blueprintsWriteToTypings) {
              content += `${oneTab}type JmsSectionKey,\n`;
              content += `${oneTab}type JmsLocaleKey,\n`;
              content += `${oneTab}type JmsData,\n`;
            }
            if (globalStore.userSettings.data.blueprintsWriteToDefault) {
              content += `${oneTab}locales,\n`;
              content += `${oneTab}defaultData,\n`;
            }
            if (globalStore.userSettings.data.blueprintsWriteToData) {
              content += `${oneTab}data,\n`;
            }
            if (globalStore.userSettings.data.blueprintsWriteToStructure) {
              content += `${oneTab}structure,\n`;
            }
            if (globalStore.userSettings.data.blueprintsWriteToSettings) {
              content += `${oneTab}settings,\n`;
            }
            content += `}\n`;

            content = content.trim();
            if (existingData !== content) {
              const writableStream = await fileHandle.createWritable();
              fileSaveList.push({ writableStream, content });
            }
          }
        })();
      }

      if (fileSaveList.length > 0) {
        const promises = fileSaveList.map(async fileHandle => {
          await fileHandle.writableStream.write(fileHandle.content);
          await fileHandle.writableStream.close();
        });

        // Wait for all write operations to complete
        await Promise.all(promises);
      }
    }

    lastStateTimestamp.value = new Date().getTime();
  }

  const syncFromFolder = async (structure: IStructure, language: 'typescript' | 'php', types: ('data' | 'structure')[] = ['data', 'structure']) => {
    const id = `${structure.hash ?? 'unknown'}_${language}`;
    if (handleReference[id]) {

      // data.json
      if (globalStore.userSettings.data.blueprintsReadFromData && types.includes('data')) {
        await (async () => {
          if (handleReference[id]) {
            try {
              const fileHandle = await handleReference[id].getFileHandle('data.json');
              const file = await fileHandle.getFile();
              const content = await file.text();
              const json = JSON.parse(content);
              const parsedStructure = getParsedStructureData(structure);
              const parsedData = getParsedUserData(parsedStructure, json);
              modelStore.setUserData(parsedData, true);
            } catch (e) {
              console.error(e);
            }
          }
        })();
      }

      // structure.yml
      if ((globalStore.userSettings.data.blueprintsReadFromStructure || !globalStore.session.loggedIn) && types.includes('structure')) {
        await (async () => {
          if (handleReference[id]) {
            try {
              const fileHandle = await handleReference[id].getFileHandle('structure.yml');
              const file = await fileHandle.getFile();
              modelStore.structure.content = await file.text();
            } catch (e) {
              console.error(e);
            }
          }
        })();
      }
    }

    lastStateTimestamp.value = new Date().getTime();
  }

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
    autoAskToSyncFolder,
    askToSyncFolder,
    unSyncFolder,
    syncToFolder,
    syncFromFolder,
    isFolderSynced,
    getTypescriptTypings,
    getTypescriptDefaultObj,
    lastStateTimestamp,
  }
}
