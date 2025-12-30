import {ref} from 'vue';
import useHotkey, {type HotKey, type RemoveHandler} from 'vue3-hotkey';
import {useGlobalStore} from '@/stores/global';

const isInput = () => {
  return document.activeElement?.tagName === 'INPUT'
      || document.activeElement?.tagName === 'TEXTAREA'
      || document.activeElement?.tagName === 'SELECT'

}

export function useShortcut(options: {
  onCreate: () => void,
  onSave: () => void,
  onSiteRefresh: () => void,
} = {
  onCreate: () => {},
  onSave: () => {},
  onSiteRefresh: () => {},
}) {

  const globalStore = useGlobalStore();
  const hotkeys = ref<HotKey[]>([{
    keys: ['ctrl', 'a'],
    handler(shortcut, event) {
      if (isInput()) {
        return;
      }

      event.preventDefault();
      globalStore.setAdmin({
        structure: !globalStore.admin.structure,
      })
    }
  }, {
    keys: ['ctrl', 'm'],
    preventDefault: true,
    handler() {
      globalStore.setAdmin({
        previewMode: globalStore.admin.previewMode === 'mobile' ? null : 'mobile',
      })
    }
  }, {
    keys: ['ctrl', 'd'],
    preventDefault: true,
    handler() {
      globalStore.setAdmin({
        previewMode: globalStore.admin.previewMode === 'desktop' ? null : 'desktop',
      })
    }
  }, {
    keys: ['alt', 'r'],
    handler(shortcut, event) {
      if (globalStore.admin.previewMode !== null) {
        event.preventDefault();
        options.onSiteRefresh();
      }
    }
  }, {
    keys: ['alt', 'q'],
    preventDefault: true,
    handler() {
      globalStore.setAdmin({
        drawer: !globalStore.admin.drawer,
      })
    }
  }, {
    keys: ['alt', 'n'],
    preventDefault: true,
    handler() {
      options.onCreate();
      return false;
    }
  }, {
    keys: ['ctrl', 's'],
    preventDefault: true,
    handler() {
      options.onSave();
    }
  }])

  const listen = () => {
    return useHotkey(hotkeys.value)
  }

  const unbind = (keys: RemoveHandler[]) => {
    keys.forEach(item => item());
  }

  return {
    listen,
    unbind,
  }
}
