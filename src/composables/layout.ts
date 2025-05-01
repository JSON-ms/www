import {computed, onMounted, onUnmounted, ref, watch} from 'vue';
import {useGlobalStore} from '@/stores/global';

let initialized = false
export function useLayout() {

  const globalStore = useGlobalStore();
  const layoutPx = (pixels: number): number => {
    return pixels;
    // const screenWidth = window.innerWidth;
    // if (screenWidth >= 1800) {
    //   const ratio = screenWidth / 1800;
    //   return pixels * ratio;
    // }
    // return pixels;
  }

  const pxToRem = (pixels: number): string => {
    return (pixels / 16) + 'rem';
  }

  const mobileDivisionRatio = 1.777;
  const windowWidth = ref(window.innerWidth);
  const windowHeight = ref(window.innerHeight);
  const mobileFrameHeight = computed((): number => windowHeight.value - layoutPx(64));
  const mobileFrameWidth = computed((): number => mobileFrameHeight.value / mobileDivisionRatio);

  // Drawer
  const drawer = {
    temporary: false,
    width: layoutPx(261),
    memory: globalStore.admin.drawer,
  };

  // Editor
  const editor = {
    temporary: false,
    width: mobileFrameWidth.value,
    memory: globalStore.admin.structure,
  };

  // Preview
  const preview = {
    width: mobileFrameWidth.value,
    height: mobileFrameHeight.value,
    zoom: 0,
    active: globalStore.admin.previewMode !== null,
    memory: globalStore.admin.previewMode,
  }

  const layoutSize = computed((): {
    drawer: { temporary: boolean, width: number, memory: boolean },
    editor: { temporary: boolean, width: number, memory: boolean },
    preview: { width: number, height: number, zoom: number, active: boolean, memory: null | 'mobile' | 'desktop' },
    data: number,
  } => {

    // If preview mode is desktop, let some space for the editor if opened
    let _mobileFrameWidth = mobileFrameWidth.value;
    let _mobileFrameHeight = mobileFrameHeight.value;
    if (globalStore.admin.previewMode === 'desktop' && globalStore.admin.structure) {
      const division = globalStore.userSettings.data.layoutSitePreviewKeepRatio ? 3.5 : 2
      _mobileFrameHeight -= (_mobileFrameHeight) / division;
      if (globalStore.userSettings.data.layoutSitePreviewKeepRatio) {
        _mobileFrameWidth = _mobileFrameHeight / mobileDivisionRatio;
      }
    }

    // Reset
    preview.width = _mobileFrameWidth;
    preview.height = _mobileFrameHeight;
    drawer.temporary = false;
    editor.temporary = false;
    drawer.width = layoutPx(261);
    editor.width = _mobileFrameWidth;
    preview.active = globalStore.admin.previewMode !== null;

    const getDataWidth = () => {
      // Total
      const drawerWidth = (!drawer.temporary && globalStore.admin.drawer ? drawer.width : 0);
      const editorWidth = (!editor.temporary && globalStore.admin.structure ? editor.width : 0);
      let total = drawerWidth + editorWidth;

      // Preview: Width
      if (globalStore.admin.previewMode === 'desktop') {
        editor.width = 0;
        total -= editorWidth;
        const remainingWidth = windowWidth.value - total;
        const maxWidth = remainingWidth - windowHeight.value / mobileDivisionRatio;
        if (windowHeight.value * mobileDivisionRatio > maxWidth) {
          preview.width = maxWidth > layoutPx(600) ? maxWidth : layoutPx(600);
        } else {
          preview.width = windowHeight.value * mobileDivisionRatio;
        }
      }

      // Increment total with newly calculated preview width
      total += (globalStore.admin.previewMode !== null ? preview.width : 0);

      // Close or make stuff temporary if not enough space
      let width = windowWidth.value - total;
      if (width < _mobileFrameWidth) {
        width = _mobileFrameWidth;
        if (!drawer.temporary) {
          drawer.temporary = true;
          drawer.memory = globalStore.admin.drawer;
          return getDataWidth();
        } else if (!editor.temporary) {
          editor.temporary = true;
          editor.memory = globalStore.admin.structure;
          return getDataWidth();
        } else if (preview.active) {
          preview.active = false;
          preview.memory = globalStore.admin.previewMode;
          return getDataWidth();
        }
      }
      return width;
    }

    // Get data width
    const data = getDataWidth();

    // Preview: Height
    if (globalStore.admin.previewMode === 'desktop') {
      preview.height = preview.width / mobileDivisionRatio;
    } else {
      preview.height = windowHeight.value - layoutPx(globalStore.userSettings.data.layoutSitePreviewPadding ? 96 : 64);
    }
    const maxHeight = _mobileFrameHeight - layoutPx(globalStore.userSettings.data.layoutSitePreviewPadding ? 32 : 0);
    if (preview.height > maxHeight) {
      const ratio = preview.height / maxHeight;
      preview.height = maxHeight;
      if (globalStore.userSettings.data.layoutSitePreviewKeepRatio) {
        preview.width = preview.width / ratio;
      }
    }

    // Preview: Zoom
    if (globalStore.userSettings.data.layoutSitePreviewKeepRatio || globalStore.admin.previewMode === 'mobile') {
      preview.zoom = globalStore.admin.previewMode === 'desktop'
        ? (preview.width / layoutPx(1500))
        : (_mobileFrameWidth / layoutPx(420))
    } else {
      preview.zoom = 1;
    }

    return {
      drawer,
      editor,
      preview,
      data,
    }
  })

  const updateWindowSize = () => {
    windowWidth.value = window.innerWidth;
    windowHeight.value = window.innerHeight;
  };

  onMounted(() => {
    window.addEventListener('resize', updateWindowSize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateWindowSize);
  });

  const init = () => {
    if (initialized) {
      return
    }
    initialized = true;

    updateWindowSize();

    const globalStore = useGlobalStore();
    try {
      const globalAdmin = JSON.parse(localStorage.getItem('jsonms/global:admin') ?? '{}');
      globalStore.setAdmin(globalAdmin);
    } catch (e) {
      console.error(e);
    }
    watch(() => globalStore.admin, () => {
      globalStore.setAdmin(globalStore.admin);
      localStorage.setItem('jsonms/global:admin', JSON.stringify(globalStore.admin));
    }, { deep: true })
  }

  return {
    init,
    layoutPx,
    pxToRem,
    layoutSize,
    windowWidth,
    windowHeight,
    mobileFrameWidth,
    mobileFrameHeight,
  }
}
