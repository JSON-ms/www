import {deepToRaw, isNativeObject} from '@/utils';
import router from '@/router';
import {ref} from 'vue';
import {useRoute} from 'vue-router';
import {useStructure} from '@/composables/structure';
import {useModelStore} from '@/stores/model';
import {useGlobalStore} from '@/stores/global';

const siteCompatible = ref(false);
const reloading = ref(false);

export function useIframe() {

  let iframeRouteTimeout: any;

  const currentRoute = useRoute();
  const modelStore = useModelStore();
  const globalStore = useGlobalStore();
  const { serverSettings, structureParsedData, getAvailableSection, getAvailableLocale } = useStructure();

  const getIframe = (): HTMLIFrameElement | null => {
    return document.getElementById('iframe') as HTMLIFrameElement | null;
  }

  const sendMessageToIframe = (type: string, data?: string) => {
    const iframe = getIframe();
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        name: 'jsonms',
        type,
        data,
      }, structureParsedData.value.global.preview ?? '*');
    }
  }

  const sendUserDataToIframe = () => {
    const sectionKey = currentRoute.params.section.toString();
    const section = structureParsedData.value.sections[sectionKey];
    sendMessageToIframe('data', JSON.stringify({
      data: deepToRaw(modelStore.userData),
      section: {
        name: sectionKey,
        paths: section && section.path ? Array.isArray(section.path) ? section.path : [section.path] : [],
      },
      settings: deepToRaw(serverSettings.value),
      locale: currentRoute.params.locale.toString(),
    }));
  }

  const getSectionFromRoute = (route: any): string | null => {
    const getSection = (value: string): string | null => {
      for(const sectionKey in structureParsedData.value.sections) {
        const section = structureParsedData.value.sections[sectionKey];
        if (isNativeObject(route) && route.name === sectionKey) {
          return sectionKey;
        }
        if (section.path) {
          const paths = Array.isArray(section.path) ? section.path : [section.path];
          for (let i = 0; i < paths.length; i++) {
            const path = paths[i];

            const simplifiedWildcardRegExp = '^' + path.replace('{{locale}}', '.*') + '$'
              .replace(/\//g, '\\/') // Escape forward slashes
              .replace(/\*/g, '.*'); // Replace wildcards with regex

            if (
              path === value
              || path.replace('{{locale}}', currentRoute.params.locale.toString()) === value
              || new RegExp(simplifiedWildcardRegExp).test(value)
              || new RegExp(path).test(value)
            ) {
              return sectionKey;
            }
          }
        }
      }
      return null;
    }
    try {
      if (typeof route === 'string') {
        return getSection(route);
      } else if (isNativeObject(route) && route.name || route.path) {
        return getSection(route.path) ?? getSection(route.name);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return getSection(route);
    }
    return null;
  }

  const getPathsFromSectionKey = (key: string): string[] => {
    const section = structureParsedData.value.sections[key];
    if (section) {
      if (Array.isArray(section.path)) {
        return section.path;
      } else if (typeof section.path === 'string') {
        return [section.path];
      }
    }
    return [];
  }

  const listenIframeMessage = (event: MessageEvent) => {
    if (event.data.name === 'jsonms') {
      switch (event.data.type) {
        case 'init':
          setTimeout(() => {
            sendUserDataToIframe();
            const sectionKey = (currentRoute.params.section || '').toString();
            const paths = getPathsFromSectionKey(sectionKey);
            sendMessageToIframe('section', JSON.stringify({
              name: sectionKey,
              paths,
            }));
            siteCompatible.value = true;
            reloading.value = false;
          }, 500)
          break;
        case 'route':
          const section = getSectionFromRoute(event.data.data);
          if (section) {
            clearTimeout(iframeRouteTimeout);
            iframeRouteTimeout = setTimeout(() => {
              router.push('/admin/' + modelStore.structure.hash + '/' + section + '/' + getAvailableLocale());
            }, 100);
          }
          break;
        case 'locale':
          clearTimeout(iframeRouteTimeout);
          iframeRouteTimeout = setTimeout(() => {
            router.push('/admin/' + modelStore.structure.hash + '/' + getAvailableSection() + '/' + event.data.data);
          }, 100);
          break;
        case 'commands':
          try {
            const commands = JSON.parse(event.data.data);
            commands.forEach((command: string) => {
              switch (command) {
                case 'openDrawer':
                  globalStore.setAdmin({ drawer: true });
                  break;
                case 'closeDrawer':
                  globalStore.setAdmin({ drawer: true });
                  break;
                case 'openAdvanced':
                  globalStore.setAdmin({ structure: true });
                  break;
                case 'closeAdvanced':
                  globalStore.setAdmin({ structure: false });
                  break;
                case 'showData':
                  globalStore.setAdmin({ tab: 'data' });
                  break;
                case 'showSettings':
                  globalStore.setAdmin({ tab: 'settings' });
                  break;
                case 'showDocs':
                  globalStore.setAdmin({ tab: 'docs' });
                  break;
                case 'setMobile':
                  globalStore.setAdmin({ previewMode: 'mobile' });
                  break;
                case 'setDesktop':
                  globalStore.setAdmin({ previewMode: 'desktop' });
                  break;
                case 'hideDevice':
                  globalStore.setAdmin({ previewMode: null });
                  break;
              }
            })
          } catch (e) {
            console.error(e);
          }
          break;
      }
    }
  }

  return {
    reloading,
    siteCompatible,
    sendMessageToIframe,
    sendUserDataToIframe,
    listenIframeMessage,
    getPathsFromSectionKey,
  }
}
