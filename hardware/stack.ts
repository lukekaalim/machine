import { HardwareState } from './state.ts';

export const stackPeek = (state: HardwareState) => {
  const depth = stackPop(state);

  if (state.stackPointer - depth < 0) {
    state.cpuMode = 'error';
    state.yielded = true;
  }
  const peekedValue = state.stack[state.stackPointer - depth];
  
  stackPush(state, peekedValue);
}

export const stackDiscard = (state: HardwareState) => {
  state.stackPointer--;
};

export const stackPush = (state: HardwareState, value: number) => {
  state.stackPointer++;
  state.stack[state.stackPointer] = value;
}

export const stackPop = (state: HardwareState): number => {
  if (state.stackPointer < 0) {
    state.cpuMode = 'error';
    state.yielded = true;
  }
  const value = state.stack[state.stackPointer];
  state.stackPointer--;
  return value;
}

export const stackSwap = (state: HardwareState) => {
  const top = stackPop(state);
  const bottom = stackPop(state);
  stackPush(state, top);
  stackPush(state, bottom);
}