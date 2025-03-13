import { defineStore } from 'pinia';
import type {ISession, IPrompt, IError} from '@/interfaces';
import InterfaceModel from '@/models/interface.model';

export const useGlobalStore = defineStore('example', {
  state: (): {
    theme: 'dark' | 'light',
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
        const body = serverError
          ? 'Your server script is not configured correctly. Please review and adjust your script to ensure it processes requests properly. For debugging, check the Network tab in your browser\'s console to see the request and response details. If you need further assistance, refer to the documentation.'
          : error.message;
        this.error = {
          visible: true,
          body,
        };
      }
    },
    setPrompt(prompt: IPrompt) {
      this.prompt = prompt;
    },
    setError(error: IError) {
      this.error = error;
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
