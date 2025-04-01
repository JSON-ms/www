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
      const { interfaceParsedData } = useInterface();
      const { getParsedUserData } = useUserData();
      const parsedData = getParsedUserData(interfaceParsedData.value, deepToRaw(data));
      this.userData = parsedData;
      this.setOriginalUserData(parsedData);
    },
    setOriginalUserData(data: any) {
      this.originalUserData = structuredClone(deepToRaw(data));
    }
  },
});
