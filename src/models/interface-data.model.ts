import type {IInterfaceData} from '@/interfaces';
import {getParsedInterface} from '@/utils';
import {Services} from '@/services';
import {useGlobalStore} from '@/stores/global';
import BaseModel from '@/models/base.model';
import type InterfaceModel from '@/models/interface.model';
import {computed, type ComputedRef} from 'vue';

export default class InterfaceDataModel extends BaseModel<any, InterfaceDataModel> {

  private interfaceModel: InterfaceModel | null = null

  constructor(
    data: IInterfaceData = getParsedInterface(),
    interfaceModel: InterfaceModel | null,
  ) {
    super(data);
    this.interfaceModel = interfaceModel;
  }

  public save(): Promise<InterfaceDataModel> {
    return new Promise((resolve, reject) => {
      if (!this.canSave()) {
        resolve(this);
      }

      const url = this.interfaceModel?.value.server_url || '';
      const globalStore = useGlobalStore();
      this.states.saving = true;
      Services.post(url, this.value)
        .then((response: any) => {
          this.setOriginalData(response);
          this.setData(response);
          resolve(this);
        })
        .catch(error => {
          globalStore.catchError(error);
          reject(error);
          return error;
        })
        .finally(() => this.states.saving = false);
    })
  }
}
