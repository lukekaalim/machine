import { MachineOperation, decodeOperation } from "./operations.ts";

export type MachineState = {
  pointer: number,
  stack: number[],
  memory: number[],
};

export const performOperation = (operation: MachineOperation, state: MachineState): MachineState => {
  const stack = [...state.stack];
  let pointer = state.pointer + 1;

  switch (operation.type) {
    case 'push': {
      stack.push(operation.value);
      pointer++;
      return { ...state, stack, pointer };
    }
    case 'dup': {
      const value = stack.at(-1);
      if (value === undefined)
        throw new Error();
      stack.push(value);
      return { ...state, stack, pointer };
    }
    case 'swap': {
      const a = stack.pop();
      const b = stack.pop();
      if (a === undefined || b === undefined)
        throw new Error();
      stack.push(a);
      stack.push(b);
      return { ...state, stack, pointer };
    }
    case 'peek': {
      const offset = stack.pop();
      if (offset === undefined)
        throw new Error();
      const value = stack[stack.length - 1 - offset];
      if (value === undefined)
        throw new Error();
      stack.push(value);
      return { ...state, stack, pointer };
    }
    case 'read': {
      const address = stack.pop();
      if (address === undefined)
        throw new Error();
      const value = state.memory[address];
      stack.push(value);
      return { ...state, stack, pointer };
    }
    case 'write': {
      const value = stack.pop();
      const address = stack.pop();
      if (address === undefined || value === undefined)
        throw new Error();
      if (address === 0)
        return { ...state, stack, pointer };

      state.memory[address] = value;
      return { ...state, stack, pointer };
    }
    case "jump": {
      const address = stack.pop();
      const condition = stack.pop();
      if (address === undefined || condition === undefined)
        throw new Error();
      if (condition === 1)
        return { ...state, stack, pointer: address };
      return { ...state, stack, pointer };
    }
    case 'add': {
      const a = stack.pop();
      const b = stack.pop();
      if (a === undefined || b === undefined)
        throw new Error();
      stack.push(a + b);
      return { ...state, stack, pointer };
    }
    case 'mult': {
      const a = stack.pop();
      const b = stack.pop();
      if (a === undefined || b === undefined)
        throw new Error();
      stack.push(a * b);
      return { ...state, stack, pointer };
    }
    case 'exit':
      return state;
    case 'noop':
      pointer++;
      return { ...state, pointer };
    default:
      throw new Error();
  }
};


export const runMachine = (state: MachineState): MachineState => {
  const operation = decodeOperation(state.pointer, state.memory);
  return performOperation(operation, state);
}
