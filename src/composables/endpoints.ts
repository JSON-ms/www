import {useGlobalStore} from '@/stores/global';
import type {IEndpoint} from '@/interfaces';
import {Services} from "@/services";
import {ref} from "vue";

export function useEndpoints() {

  const globalStore = useGlobalStore();
  const saving = ref(false);
  const deleting = ref(false);

  const saveEndpoints = (data: IEndpoint[]): Promise<IEndpoint[]> => {
    saving.value = true;
    return Services.post(import.meta.env.VITE_SERVER_URL + '/endpoint/save', data)
      .catch(globalStore.catchError)
      .finally(() => saving.value = false);
  }

  const deleteEndpoint = (uuid: string): Promise<IEndpoint[]> => {
    deleting.value = true;
    return Services.delete(import.meta.env.VITE_SERVER_URL + '/endpoint/delete/' + uuid)
      .catch(globalStore.catchError)
      .finally(() => deleting.value = false);
  }

  return {
    saveEndpoints,
    deleteEndpoint,
    saving,
    deleting,
  };
}
