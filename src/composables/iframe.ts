import {deepToRaw} from '@/utils';
import router from '@/router';
import {ref, type Ref} from 'vue';
import type {IInterface} from '@/interfaces';
import {useRoute} from 'vue-router';
import {useInterface} from '@/composables/interface';

export function useIframe(
  interfaceModel: Ref<IInterface>,
  userData: Ref<any>,
) {

  let iframeRouteTimeout: any;

  const siteCompatible = ref(false);
  const currentRoute = useRoute();
  const { serverSettings, interfaceParsedData, getAvailableSection, getAvailableLocale } = useInterface(interfaceModel);

  const getIframe = (): HTMLIFrameElement | null => {
    return document.getElementById('iframe') as HTMLIFrameElement | null;
  }

  const sendMessageToIframe = (type: string, data?: string) => {
    const iframe = getIframe();
    if (iframe?.contentWindow && interfaceModel.value.server_url) {
      iframe.contentWindow.postMessage({
        name: 'jsonms',
        type,
        data,
      }, interfaceParsedData.value.global.preview ?? '*');
    }
  }

  const sendUserDataToIframe = () => {
    sendMessageToIframe('data', JSON.stringify({
      data: deepToRaw(userData.value),
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
          }, 500)
          break;
        case 'route':
          if (interfaceParsedData.value.sections[event.data.data]) {
            clearTimeout(iframeRouteTimeout);
            iframeRouteTimeout = setTimeout(() => {
              router.push('/admin/' + interfaceModel.value.hash + '/' + event.data.data + '/' + getAvailableLocale());
            }, 100);
          }
          break;
        case 'locale':
          clearTimeout(iframeRouteTimeout);
          iframeRouteTimeout = setTimeout(() => {
            router.push('/admin/' + interfaceModel.value.hash + '/' + getAvailableSection() + '/' + event.data.data);
          }, 100);
          break;
      }
    }
  }

  return {
    siteCompatible,
    sendMessageToIframe,
    sendUserDataToIframe,
    listenIframeMessage,
  }
}
