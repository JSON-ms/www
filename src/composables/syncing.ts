import type {IStructure} from "@/interfaces";
import {useTypings} from "@/composables/typings";
import {useModelStore} from "@/stores/model";
import {useGlobalStore} from "@/stores/global";
import {useStructure} from "@/composables/structure";
import {deepToRaw} from '@/utils';
import {useUserData} from "@/composables/user-data";
import {ref} from "vue";

declare global {
  export interface Window {
    showDirectoryPicker: (options: { id: string, mode: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
  }
}

type Snapshot = Map<string, FileMeta>
type ReadFileResult = {
  path: string
  file: File
}
type FileMeta = {
  lastModified: number
  size: number
}

const syncHandleRef: {[key: string]: FileSystemDirectoryHandle | null} = {}
const localStorageHandleKey = 'jsonms/typings:handle-list';
const localStorageExplanationsKey = 'jsonms/typings:explanations';

let previousSnapshot: Snapshot
let snalshopCheckInterval: any

export const lastStateTimestamp = ref(0);
export const isFolderSynced = (structure: IStructure): boolean => {
  const hash = structure.hash ?? 'unknown';
  const id = `${hash}`;
  return !!(syncHandleRef[id]);
}

export function useSyncing() {

  const modelStore = useModelStore();
  const globalStore = useGlobalStore();
  const { serverSettings, getParsedStructureData } = useStructure();
  const { getParsedUserData } = useUserData();
  const { getTypescriptTypings, getTypescriptDefaultObj } = useTypings();

  const autoAskToSyncFolder = async (structure: IStructure) => {
    const hash = structure.hash ?? 'unknown';
    const id = `${hash}`;
    const keys = JSON.parse(localStorage.getItem(localStorageHandleKey) || '[]');
    keys.forEach((key: string) => {
      if (key === id && !syncHandleRef[id]) {
        globalStore.setPrompt({
          ...globalStore.prompt,
          visible: true,
          title: 'Local Folder Syncing',
          icon: 'mdi-sync',
          body: 'This project was previously synced to your local folder. For security reasons, your browser resets this permission whenever the page loses its session. Would you like to resume syncing?',
          btnText: 'Resume',
          btnColor: 'secondary',
          callback: () => new Promise((resolve, reject) => {
            askToSyncFolder(structure).then(() => {
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

  const askToSyncFolder = async (structure: IStructure) => {
    const explanationCallback = async () => {
      const hash = structure.hash ?? 'unknown';
      const id = `${hash}`;
      syncHandleRef[id] = await window.showDirectoryPicker({
        id,
        mode: 'readwrite',
      });

      if (syncHandleRef[id]) {
        let keys = JSON.parse(localStorage.getItem(localStorageHandleKey) || '[]');
        keys = keys.filter((key: string) => key !== id);
        keys.push(id);
        localStorage.setItem(localStorageHandleKey, JSON.stringify(keys));
        await syncFromFolder(structure);
        if (globalStore.session.loggedIn) {
          await syncToFolder(structure);
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

  const unSyncFolder = async (structure: IStructure, clean = false) => {
    const hash = structure.hash ?? 'unknown';
    const id = `${hash}`;

    if (clean) {
      delete syncHandleRef[id];
      let keys = JSON.parse(localStorage.getItem(localStorageHandleKey) || '{}');
      keys = keys.filter((key: string) => key !== id);
      localStorage.setItem(localStorageHandleKey, JSON.stringify(keys));
    }

    lastStateTimestamp.value = new Date().getTime();
  }

  const syncToFolder = async (structure: IStructure, types: ('structure' | 'typings' | 'default' | 'data' | 'settings' | 'index')[] = ['structure', 'default', 'typings', 'data', 'settings', 'index']) => {
    const id = `${structure.hash ?? 'unknown'}`;
    const oneTab = ' '.repeat(globalStore.userSettings.data.editorTabSize);
    if (syncHandleRef[id]) {
      const structuredData = getParsedStructureData(structure);
      const fileSaveList: {
        writableStream: FileSystemWritableFileStream,
        content: string
      }[] = [];

      // structure.yml
      if (globalStore.userSettings.data.blueprintsWriteToStructure && types.includes('structure')) {
        await (async () => {
          if (syncHandleRef[id]) {
            const fileHandle = await syncHandleRef[id].getFileHandle('structure.yml', { create: true });
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
          if (syncHandleRef[id]) {
            const fileHandle = await syncHandleRef[id].getFileHandle('structure.json', { create: true });
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
          if (syncHandleRef[id]) {
            const fileHandle = await syncHandleRef[id].getFileHandle('typings.ts', {create: true});
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
          if (syncHandleRef[id]) {
            const fileHandle = await syncHandleRef[id].getFileHandle('default.ts', {create: true});
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
          if (syncHandleRef[id]) {
            const fileHandle = await syncHandleRef[id].getFileHandle('settings.json', {create: true});
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
          if (syncHandleRef[id]) {
            const content = JSON.stringify(deepToRaw(modelStore.userData), null, globalStore.userSettings.data.editorTabSize);
            const fileHandle = await syncHandleRef[id].getFileHandle('data.json', {create: true});
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
          if (syncHandleRef[id]) {
            const fileHandle = await syncHandleRef[id].getFileHandle('index.ts', {create: true});
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

  const syncFromFolder = async (structure: IStructure, types: ('data' | 'structure')[] = ['data', 'structure']) => {
    const id = `${structure.hash ?? 'unknown'}`;
    if (syncHandleRef[id]) {

      // data.json
      if (globalStore.userSettings.data.blueprintsReadFromData && types.includes('data')) {
        await (async () => {
          if (syncHandleRef[id]) {
            try {
              const fileHandle = await syncHandleRef[id].getFileHandle('data.json');
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
          if (syncHandleRef[id]) {
            try {
              const fileHandle = await syncHandleRef[id].getFileHandle('structure.yml');
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

  const readAllFiles = async (
    dir: FileSystemDirectoryHandle,
    prefix = ''
  ): Promise<ReadFileResult[]> => {
    const files: ReadFileResult[] = []

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    for await (const [name, handle] of dir.entries()) {
      const path = prefix ? `${prefix}/${name}` : name

      if (handle.kind === 'file') {
        const file = await (handle as FileSystemFileHandle).getFile()
        files.push({ path, file })
      } else if (handle.kind === 'directory') {
        files.push(
          ...(await readAllFiles(handle as FileSystemDirectoryHandle, path))
        )
      }
    }

    return files
  }

  const getFiles = async (structure: IStructure) => {
    const id = `${structure.hash ?? 'unknown'}`;
    if (syncHandleRef[id]) {
      const files = await readAllFiles(syncHandleRef[id]);
    }
  }

  const scanSnapshotDir = async (
    dir: FileSystemDirectoryHandle,
    prefix = ''
  ): Promise<Snapshot> => {
    const snapshot: Snapshot = new Map()

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    for await (const [name, handle] of dir.entries()) {
      const path = `${prefix}/${name}`

      if (handle.kind === 'file') {
        const file = await handle.getFile()
        snapshot.set(path, {
          lastModified: file.lastModified,
          size: file.size,
        })
      } else {
        const sub = await scanSnapshotDir(handle, path)
        sub.forEach((v, k) => snapshot.set(k, v))
      }
    }

    return snapshot
  }

  const snapshotsEqual = (a: Snapshot, b: Snapshot): boolean => {
    if (!a || !b || a.size !== b.size) return false

    for (const [path, meta] of a) {
      const other = b.get(path)
      if (!other) return false
      if (
        meta.lastModified !== other.lastModified ||
        meta.size !== other.size
      ) {
        return false
      }
    }

    return true
  }

  const watchSnapshotDirectory = async (
    intervalMs = 1000
  ): Promise<void> => {
    snalshopCheckInterval = setInterval(async () => {
      for (const id of Object.keys(syncHandleRef)) {
        const root = syncHandleRef[id]
        if (root) {
          const current = await scanSnapshotDir(root)
          if (!snapshotsEqual(previousSnapshot, current)) {
            window.dispatchEvent(new Event('fs-change'))
            previousSnapshot = current
          }
        }
      }
    }, intervalMs)
  }

  const stopWatchSnapshotDirectory = () => {
    clearInterval(snalshopCheckInterval);
  }

  return {
    isFolderSynced,
    autoAskToSyncFolder,
    askToSyncFolder,
    unSyncFolder,
    syncToFolder,
    syncFromFolder,
    readAllFiles,
    getFiles,
    scanSnapshotDir,
    snapshotsEqual,
    watchSnapshotDirectory,
    stopWatchSnapshotDirectory,
    syncHandleRef,
    lastStateTimestamp,
  }
}
