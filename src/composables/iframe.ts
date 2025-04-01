import {deepToRaw} from '@/utils';
import router from '@/router';
import {ref} from 'vue';
import {useRoute} from 'vue-router';
import {useInterface} from '@/composables/interface';
import {useModelStore} from '@/stores/model';

const siteCompatible = ref(false);
const reloading = ref(false);

export function useIframe() {

  let iframeRouteTimeout: any;

  const currentRoute = useRoute();
  const modelStore = useModelStore();
  const { serverSettings, interfaceParsedData, getAvailableSection, getAvailableLocale } = useInterface();

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
      }, interfaceParsedData.value.global.preview ?? '*');
    }
  }

  const sendUserDataToIframe = () => {
    sendMessageToIframe('data', JSON.stringify({
      data: deepToRaw(modelStore.userData),
      settings: deepToRaw(serverSettings.value),
      locale: currentRoute.params.locale.toString(),
    }));
  }

  const listenIframeMessage = (event: MessageEvent) => {
    if (event.data.name === 'jsonms') {
      switch (event.data.type) {
        case 'init':
          setTimeout(() => {
            sendUserDataToIframe();
            sendMessageToIframe('section', (currentRoute.params.section || '').toString());
            siteCompatible.value = true;
            reloading.value = false;
          }, 500)
          break;
        case 'route':
          if (interfaceParsedData.value.sections[event.data.data]) {
            clearTimeout(iframeRouteTimeout);
            iframeRouteTimeout = setTimeout(() => {
              router.push('/admin/' + modelStore.interface.hash + '/' + event.data.data + '/' + getAvailableLocale());
            }, 100);
          }
          break;
        case 'locale':
          clearTimeout(iframeRouteTimeout);
          iframeRouteTimeout = setTimeout(() => {
            router.push('/admin/' + modelStore.interface.hash + '/' + getAvailableSection() + '/' + event.data.data);
          }, 100);
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
  }
}
