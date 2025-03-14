import { defineStore } from 'pinia';
import type { ISession, IPrompt, IError, ISnack } from '@/interfaces';
import InterfaceModel from '@/models/interface.model';

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

export const useGlobalStore = defineStore('example', {
  state: (): {
    theme: 'dark' | 'light',
    snack: ISnack,
    error: IError,
    prompt: IPrompt,
    session: ISession,
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
    },
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
      if (!this.session.interfaces) {
        this.session.interfaces = session.interfaces;
      }
    },
    addInterface(item: InterfaceModel) {
      this.session.interfaces.push(item.data);
    },
    removeInterface(item: InterfaceModel) {
      const filteredItems = this.session.interfaces.filter(child => child.uuid !== item.data.uuid);
      this.session.interfaces.length = 0;
      Array.prototype.push.apply(this.session.interfaces, filteredItems);
    },
  },
});
