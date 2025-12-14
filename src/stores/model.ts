import { defineStore } from 'pinia';
import type {IStructure} from '@/interfaces';
import {deepToRaw, getDefaultStructureContent, getStructure, isNativeObject} from '@/utils';

const defaultStructureContent = getDefaultStructureContent();
const defaultStructure = getStructure(defaultStructureContent);

export const useModelStore = defineStore('model', {
  state: (): {
    structure: IStructure,
    originalStructure: IStructure,
    temporaryContent: string,
    userData: any,
    originalUserData: any,
  } => ({
    structure: structuredClone(deepToRaw(defaultStructure)),
    originalStructure: structuredClone(deepToRaw(defaultStructure)),
    temporaryContent: '',
    userData: {},
    originalUserData: {},
  }),
  actions: {
    setStructure(model: IStructure = structuredClone(deepToRaw(defaultStructure)), data?: any) {
      this.structure = model;
      this.temporaryContent = model.content;
      this.setOriginalStructure(model);
      if (isNativeObject(data)) {
        this.setUserData(data, true);
      }
    },
    setOriginalStructure(model: IStructure) {
      this.originalStructure = structuredClone(deepToRaw(model));
    },
    // Using this to compare with isPristine in composables/structure since StructureEditor
    // does not update model.content right away when live update is not enabled.
    setTemporaryContent(content: string) {
      this.temporaryContent = content;
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
