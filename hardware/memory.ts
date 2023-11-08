import { HardwareState } from './state.ts';
import { stackPop, stackPush } from './stack.ts';

export const memoryLoad = (state: HardwareState) => {
  const address = stackPop(state);
  stackPush(state, state.memory[address]);
};

export const memoryStore = (state: HardwareState) => {
  const value = stackPop(state);
  const address = stackPop(state);
  state.memory[address] = value;
};