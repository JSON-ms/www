import {type Ref, ref, toRaw} from 'vue';
import {generateHash, objectsAreDifferent} from '@/utils';
import type {IModel} from '@/interfaces';

export interface IState {
  saving: boolean,
  saved: boolean,
  deleting: boolean,
  deleted: boolean,
  [key: string]: boolean;
}

export default class BaseModel<T extends IModel, M> {

  private readonly _data: Ref<T>;
  private readonly _originalData: Ref<T>;
  public readonly identifier: string;

  protected readonly currentStates: Ref<IState> = ref({
    saving: false,
    saved: false,
    deleting: false,
    deleted: false,
  })

  constructor(value: T) {
    this._data = ref(structuredClone(value)) as Ref<T>;
    this._originalData = ref(structuredClone(value)) as Ref<T>;
    this.identifier = generateHash(4);
  }

  public get states(): Ref<IState> {
    return this.currentStates;
  }

  public set states(states: IState) {
    this.currentStates.value = states;
  }

  public get data(): T {
    return this._data.value;
  }

  public set data(value: T) {
    this._data.value = value;
  }

  public get originalData(): T {
    return this._originalData.value;
  }

  public set originalData(value: T) {
    this._originalData.value = value;
  }

  public setData(value: T): void {
    for (const key in this.data) {
      if (this.data.hasOwnProperty(key)) {
        delete this.data[key];
      }
    }
    Object.assign(this.data, structuredClone(toRaw(value)));
  }

  public setOriginalData(value: T): void {
    for (const key in this.originalData) {
      if (this.originalData.hasOwnProperty(key)) {
        delete this.originalData[key];
      }
    }
    Object.assign(this.originalData, structuredClone(toRaw(value)));
  }

  public copyDataToOriginalData(): void {
    this.setOriginalData(this.data);
  }

  public hasError(keys: string | string[] = Object.keys(this.data)): boolean {
    return this.getErrors(keys).length > 0;
  }

  public isPristine(): boolean {
    return !objectsAreDifferent(
      toRaw(this.data),
      toRaw(this.originalData)
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getErrors(keys: string | string[] = Object.keys(this.data)): { key: string, value: string }[] {
    return []
  }

  public getRules(): ((value: string) => (string | boolean))[] {
    return [];
  }

  public canCreate(): boolean {
    return this.canSave();
  }

  public canSave() {
    return this.originalData && !this.isPristine();
  }

  public canDelete(): boolean {
    return !!(this.data.uuid);
  }

  public create(): Promise<M | false> {
    return Promise.resolve(false);
  }

  public save(): Promise<M | false> {
    return Promise.resolve(false);
  }

  public delete(): Promise<boolean> {
    return Promise.resolve(false);
  }

}
