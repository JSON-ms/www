import { defineStore } from 'pinia';
import type {ISession, IPrompt, IError, ISnack, IAdmin, IInterface, IFileManager, IFile} from '@/interfaces';

export const mimeTypes = {
  images: [
    "image/apng",
    "image/avif",
    "image/bmp",
    "image/gif",
    "image/heic",
    "image/heif",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/svg+xml",
    "image/tiff",
    "image/webp",
    "image/x-icon"
  ],
  videos: [
    "video/3gpp",
    "video/3gpp2",
    "video/avi",
    "video/mp4",
    "video/mpeg",
    "video/ogg",
    "video/quicktime",
    "video/webm",
    "video/x-flv",
    "video/x-matroska",
    "video/x-ms-wmv",
    "video/x-msvideo"
  ]
};

export const useGlobalStore = defineStore('global', {
  state: (): {
    theme: 'dark' | 'light',
    admin: IAdmin,
    snack: ISnack,
    error: IError,
    prompt: IPrompt,
    session: ISession,
    fileManager: IFileManager,
  } => ({
    theme: 'light',
    prompt: {
      body: '',
      visible: false,
      callback: () => new Promise(resolve => resolve()),
    },
    error: {
      body: '',
      visible: false,
    },
    snack: {
      title: '',
      body: '',
      visible: false,
    },
    admin: {
      drawer: window.innerWidth >= 1300,
      interface: window.innerWidth >= 1400,
      previewMode: window.innerWidth >= 1400 ? 'desktop' : 'mobile',
      tab: 'data',
    },
    session: {
      loggedIn: false,
      user: {
        id: null,
        googleId: null,
        name: 'Anonymous',
        email: null,
        avatar: null,
        createdAt: null,
      },
      googleOAuthSignInUrl: '',
      interfaces: [],
      webhooks: [],
    },
    fileManager: {
      visible: false,
      selected: [],
      multiple: false,
      canSelect: false,
      callback: () => new Promise(resolve => resolve(true)),
      accept: null,
    }
  }),
  actions: {
    catchError(error: Error) {
      try {
        const json = JSON.parse(error.message);
        this.error = {
          visible: true,
          body: json.body,
          title: json.title,
        };
      } catch {
        const serverError = [
          'Failed to fetch',
        ].includes(error.message);
        this.snack = {
          visible: true,
          icon: 'mdi-server-network-off',
          color: 'error',
          title: serverError ? 'Error Fetching Data' : 'Server Error',
          body: serverError ? 'Please check your webhook URL or check your server settings.' : error.message,
        };
      }
      throw error;
    },
    setAdmin(admin: Partial<IAdmin>) {
      Object.assign(this.admin, admin);
    },
    setPrompt(prompt: IPrompt) {
      this.prompt = prompt;
    },
    setError(error: IError) {
      this.error = error;
    },
    setSnack(snack: ISnack) {
      this.snack = snack;
    },
    setSession(session: ISession) {
      this.session = session;
    },
    showFileManager(
      selected: IFile[] = [],
      canSelect = false,
      multiple = false,
      callback?: (files?: IFile | IFile[]) => Promise<boolean>,
      accept: null | string = null
    ) {
      this.fileManager.visible = true;
      this.fileManager.selected = selected;
      this.fileManager.multiple = multiple;
      this.fileManager.canSelect = canSelect;
      this.fileManager.accept = accept;
      this.fileManager.callback = callback;
    },
    addInterface(item: IInterface) {
      if (!this.session.interfaces.find(inter => inter.uuid === item.uuid)) {
        this.session.interfaces.push(item);
      }
    },
    removeInterface(item: IInterface) {
      const filteredItems = this.session.interfaces.filter(child => child.uuid !== item.uuid);
      this.session.interfaces.length = 0;
      Array.prototype.push.apply(this.session.interfaces, filteredItems);
    },
    updateInterface(item: IInterface) {
      const index = this.session.interfaces.findIndex(child => child.uuid === item.uuid);
      if (index >= 0) {
        this.session.interfaces[index] = item;
      } else {
        this.addInterface(item);
      }
    },
  },
});
