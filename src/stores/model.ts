import { defineStore } from 'pinia';
import type {IInterface} from '@/interfaces';
import {deepToRaw, getDefaultInterfaceContent, getInterface, isNativeObject} from '@/utils';

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
        this.setUserData(data, true);
      }
    },
    setOriginalInterface(model: IInterface) {
      this.originalInterface = structuredClone(deepToRaw(model));
    },
    setUserData(data: any, setOriginal = false) {
      this.userData = data;
      if (setOriginal) {
        this.setOriginalUserData(data);
      }
    },
    setOriginalUserData(data: any) {
      this.originalUserData = structuredClone(deepToRaw(data));
    }
  },
});
