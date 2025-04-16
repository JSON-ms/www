import { defineStore } from 'pinia';
import type {IStructure} from '@/interfaces';
import {deepToRaw, getDefaultStructureContent, getStructure, isNativeObject} from '@/utils';

const defaultStructureContent = getDefaultStructureContent();
const defaultStructure = getStructure(defaultStructureContent);

export const useModelStore = defineStore('model', {
  state: (): {
    structure: IStructure,
    originalStructure: IStructure,
    userData: any,
    originalUserData: any,
  } => ({
    structure: defaultStructure,
    originalStructure: defaultStructure,
    userData: {},
    originalUserData: {},
  }),
  actions: {
    setStructure(model: IStructure, data?: any) {
      this.structure = model;
      this.setOriginalStructure(model);
      if (isNativeObject(data)) {
        this.setUserData(data, true);
      }
    },
    setOriginalStructure(model: IStructure) {
      this.originalStructure = structuredClone(deepToRaw(model));
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
