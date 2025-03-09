import { objectsAreDifferent } from '@/utils';
import router from '@/router';
import { useGlobalStore } from '@/stores/global';
import type { Ref } from 'vue';

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
  if (!Changes.hasChanges()) {
    next();
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
        next();
        resolve();
      })
    });
  }
})

export default class Changes {

  private static list: { [key: string]: any[] } = {}

  static applySet(key: string, obj1: Ref<any>, obj2: Ref<any>) {
    this.list[key] = [obj1, obj2];
  }

  static hasSetChanges(key: string): boolean {
    if (!this.list[key]) {
      return false;
    }
    console.log(key, this.list[key][0].value, this.list[key][1].value)
    return objectsAreDifferent(this.list[key][0].value, this.list[key][1].value);
  }

  static hasChanges(): boolean {
    const keys = Object.keys(this.list);
    for (let i = 0; i < keys.length; i++) {
      if (this.hasSetChanges(keys[i])) {
        return true;
      }
    }
    return false;
  }
}
