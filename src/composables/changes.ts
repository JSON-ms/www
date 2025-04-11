import { objectsAreDifferent } from '@/utils';
import { useGlobalStore } from '@/stores/global';
import type { RouteLocationNormalizedGeneric } from 'vue-router';
import Router from '@/router';

let initialized = false;

export function useChanges(router: typeof Router) {

  const globalStore = useGlobalStore();
  const changesWillBeLostMsg = 'You have unsaved changes on this page. If you proceed, your changes will be lost.';
  if (!initialized) {
    initialized = true;
    const beforeUnloadCallback = (event: any) => {
      if (hasChanges()) {
        event.returnValue = changesWillBeLostMsg;
        return changesWillBeLostMsg;
      }
    };
    window.addEventListener('beforeunload', beforeUnloadCallback);

    router.beforeResolve((to, from, next) => {
      if (!from.name) {
        return next();
      }
      if (nothingChangedButLocale(to, from)) {
        return next();
      }
      doIfNoChanges(() => {
        clear();
        next();
      });
    })
  }

  const nothingChangedButLocale = (to: RouteLocationNormalizedGeneric, from: RouteLocationNormalizedGeneric) => {
    if (to.name === from.name) {
      const keys = Object.keys(to.params);
      for (const key of keys) {
        if (key === 'locale') {
          continue;
        }
        if (to.params[key] !== from.params[key]) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  const list: { [key: string]: any[] } = {}

  const clear = () => {
    Object.keys(list).forEach(key => {
      list[key] = [{}, {}];
    })
  }

  const applySet = (key: string, obj1: any, obj2: any) => {
    list[key] = [obj1, obj2];
  }

  const hasSetChanges = (key: string): boolean => {
    if (!list[key]) {
      return false;
    }
    return objectsAreDifferent(list[key][0], list[key][1]);
  }

  const hasChanges = (): boolean => {
    if (!globalStore.session.loggedIn) {
      return false;
    }
    const keys = Object.keys(list);
    for (const key of keys) {
      if (hasSetChanges(key)) {
        return true;
      }
    }
    return false;
  }

  const doIfNoChanges = (callback: () => void) => {
    if (!hasChanges()) {
      callback();
    } else {
      globalStore.setPrompt({
        ...globalStore.prompt,
        visible: true,
        title: 'Changes detected',
        body: changesWillBeLostMsg,
        btnText: 'Proceed',
        btnIcon: 'mdi-arrow-right-bold-box',
        btnColor: 'warning',
        callback: () => new Promise(resolve => {
          callback();
          resolve();
        })
      });
    }
  }

  return {
    nothingChangedButLocale,
    applySet,
    hasSetChanges,
    hasChanges,
    doIfNoChanges,
  }
}
