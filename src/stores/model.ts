import { defineStore } from 'pinia';
import type {IInterface} from '@/interfaces';
import {deepToRaw, getDefaultInterfaceContent, getInterface, isNativeObject} from '@/utils';
import {useInterface} from '@/composables/interface';
import {useUserData} from '@/composables/user-data';

const defaultInterfaceContent = getDefaultInterfaceContent();
const defaultInterface = getInterface(defaultInterfaceContent);

export const useModelStore = defineStore('model', {
  state: (): {
    interface: IInterface,
    originalInterface: IInterface,
    userData: any,
    originalUserData: any,
  } => ({
    interface: defaultInterface,
    originalInterface: defaultInterface,
    userData: {},
    originalUserData: {},
  }),
  actions: {
    setInterface(model: IInterface, data?: any) {
      this.interface = model;
      this.setOriginalInterface(model);
      if (isNativeObject(data)) {
        this.setUserData(data);
      }
    },
    setOriginalInterface(model: IInterface) {
      this.originalInterface = structuredClone(deepToRaw(model));
    },
    setUserData(data: any) {
      this.userData = data;
      this.setOriginalUserData(data);
    },
    setOriginalUserData(data: any) {
      this.originalUserData = structuredClone(deepToRaw(data));
    }
  },
});
