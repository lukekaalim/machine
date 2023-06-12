export type MachineOperation =
  | { type: 'push', value: number } // push value
  | { type: 'dup' } // pop a, push a, push a
  | { type: 'swap' } // pop a, pop b, push a, push b
  | { type: 'peek' } // pop offset, push stack[offset]

  | { type: 'read' } // pop address, push read memory at address 
  | { type: 'write' } // pop address, pop value, write memory value at adress if address > 0
  | { type: 'load_instruction_pointer' } // push instruction pointer

  | { type: 'jump' } // pop condition, pop address, if condition === 1 set pointer to address
  | { type: 'add' } // pop a, pop b, push a + b
  | { type: 'mult' } // pop a, pop b, push a + b

  | { type: 'exit' } // return previous state
  | { type: 'noop', label: number }


export const decodeOperation = (index: number, memory: number[]): MachineOperation => {
  const type = memory[index];
  switch (type) {
    case 0:
      return { type: 'push', value: memory[index + 1] };
    case 1:
      return { type: 'read' };
    case 2:
      return { type: 'write' };
    case 3:
      return { type: 'exit' };
    case 4:
      return { type: 'jump' };
    case 5:
      return { type: 'add' };
    case 6:
      return { type: 'dup' };
    case 7:
      return { type: 'swap' };
    case 8:
      return { type: 'noop', label: memory[index + 1] };
    case 9:
      return { type: 'peek' };
    case 10:
      return { type: 'mult'}; 
    default:
      throw new Error(`Unknown OPCODE ${type}`);
  }
};

export const encodeOperation = (operation: MachineOperation): number[] => {
  switch (operation.type) {
    case 'push':
      return [0, operation.value];
    case 'read':
      return [1];
    case 'write':
      return [2];
    case 'exit':
      return [3];
    case 'jump':
      return [4];
    case 'add':
      return [5];
    case 'dup':
      return [6];
    case 'swap':
      return [7];
    case 'noop':
      return [8, operation.label];
    case 'peek':
      return [9];
    case 'mult':
      return [10];
    default:
      throw new Error();
  }
}

export const push = (value: number): MachineOperation => ({
  type: 'push',
  value
});
export const noop = (label: number): MachineOperation => ({
  type: 'noop',
  label
});
export const read =   (): MachineOperation => ({ type: 'read' });
export const write =  (): MachineOperation => ({ type: 'write' });
export const exit =   (): MachineOperation => ({ type: 'exit' });
export const jump =   (): MachineOperation => ({ type: 'jump' });
export const add =    (): MachineOperation => ({ type: 'add' });
export const dup =    (): MachineOperation => ({ type: 'dup' });
export const swap =   (): MachineOperation => ({ type: 'swap' });
export const peek =   (): MachineOperation => ({ type: 'peek' });
export const mult =   (): MachineOperation => ({ type: 'mult' });


export const nullary = (type: 'read' | 'write' | 'exit' | 'jump' | 'add' | 'dup' | 'swap' | 'peek' | 'mult'): MachineOperation => ({
  type
});