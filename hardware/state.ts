export type HardwareState = {
  stack: Int32Array,
  stackPointer: number,

  memory: Int32Array,

  cpuOperationPointer: number,
  cpuMode: 'user' | 'kernel' | 'error',
  yielded: boolean,
};
