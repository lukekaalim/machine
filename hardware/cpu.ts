import { HardwareState } from './state.ts';
import { decodeOperation } from './operations.ts';
import * as stack from './stack.ts';
import * as alu from './alu.ts';
import * as memory from './memory.ts';

export const runCPUCycle = (state: HardwareState) => {
  if (state.yielded)
    return;
  
  const operation = decodeOperation(state.cpuOperationPointer, state.memory);
  state.cpuOperationPointer++;

  switch (operation.type) {
    // Stack
    case 'push':
      state.cpuOperationPointer++;
      return stack.stackPush(state, operation.value);
    case 'peek':
      return stack.stackPeek(state);
    case 'discard':
      return stack.stackDiscard(state);
    case 'swap':
      return stack.stackSwap(state);
    
    // ALU
    case 'add':
      return alu.aluAdd(state);
    case 'div':
      return alu.aluDiv(state);
    case 'mult':
      return alu.aluMult(state);
    case 'pow':
      return alu.aluPow(state);

    // Memory
    case 'store':
      return memory.memoryStore(state);
    case 'load':
      return memory.memoryLoad(state);
    
    // CPU stuff
    case 'long-jump': {
      const condition = stack.stackPop(state);
      if (condition === 0)
        return;
      state.cpuOperationPointer = stack.stackPop(state);
      return;
    }
    case 'short-jump': {
      const condition = stack.stackPop(state);
      if (condition === 0)
        return;
      state.cpuOperationPointer += stack.stackPop(state);
      return;
    }
    case 'exit':
      state.yielded = true;
      return;
    case 'super':
      state.cpuMode = 'kernel';
      state.yielded = true;
      return;

    default:
      throw new UnsupportedOperationError(operation.type)
  }
};

export class UnsupportedOperationError extends Error {}