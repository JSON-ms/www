import {useGlobalStore} from '@/stores/global';
import type {IWebhook} from '@/interfaces';
import {Services} from "@/services";
import {ref} from "vue";

export function useWebhooks() {

  const globalStore = useGlobalStore();
  const saving = ref(false);
  const deleting = ref(false);

  const saveWebhooks = (data: IWebhook[]): Promise<IWebhook[]> => {
    saving.value = true;
    return Services.post(import.meta.env.VITE_SERVER_URL + '/webhook/save', data)
      .catch(globalStore.catchError)
      .finally(() => saving.value = false);
  }

  const deleteWebhook = (uuid: string): Promise<IWebhook[]> => {
    deleting.value = true;
    return Services.delete(import.meta.env.VITE_SERVER_URL + '/webhook/delete/' + uuid)
      .catch(globalStore.catchError)
      .finally(() => deleting.value = false);
  }

  return {
    saveWebhooks,
    deleteWebhook,
    saving,
    deleting,
  };
}
