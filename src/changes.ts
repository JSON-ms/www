import { objectsAreDifferent } from '@/utils';
import router from '@/router';
import { useGlobalStore } from '@/stores/global';

const globalStore = useGlobalStore();
const changesWillBeLostMsg = 'You have unsaved changes on this page. If you proceed, your changes will be lost.';
const beforeUnloadCallback = (event: any) => {
  if (Changes.hasChanges()) {
    event.returnValue = changesWillBeLostMsg;
    return changesWillBeLostMsg;
  }
};
window.addEventListener('beforeunload', beforeUnloadCallback);
router.beforeResolve((to, from, next) => {
  Changes.doIfNoChanges(() => {
    Changes.clear();
    next();
  });
})

export default class Changes {

  public static list: { [key: string]: any[] } = {}

  static clear() {
    Object.keys(this.list).forEach(key => {
      this.list[key] = [{}, {}];
    })
  }

  static applySet(key: string, obj1: any, obj2: any) {
    this.list[key] = [obj1, obj2];
  }

  static hasSetChanges(key: string): boolean {
    if (!this.list[key]) {
      return false;
    }
    return objectsAreDifferent(this.list[key][0], this.list[key][1]);
  }

  static hasChanges(): boolean {
    if (!globalStore.session.loggedIn) {
      return false;
    }
    const keys = Object.keys(this.list);
    for (const key of keys) {
      if (this.hasSetChanges(key)) {
        return true;
      }
    }
    return false;
  }

  static doIfNoChanges(callback: () => void) {
    if (!Changes.hasChanges()) {
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
}
