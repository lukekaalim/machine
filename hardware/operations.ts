// User Operations

type OperationIndexMap = Record<number, UserOperation["type"]>;

export type StackOperation =
  | { type: 's.point', value: number }
  | { type: 's.push', value: number }
  | { type: 's.set' }
  | { type: 's.get' }
const sMap: OperationIndexMap = {
  0: 's.point',
  1: 's.push',
  2: 's.get',
  3: 's.set',
}

export type ArithmeticOperation =
  | { type: 'a.add' }
  | { type: 'a.mult' }
const aMap: OperationIndexMap = {
  4: 'a.add',
  5: 'a.mult'
};

export type BranchOperation =
  | { type: 'c.jump' }
const cMap: OperationIndexMap = {
  6: 'c.jump'
}

export type MemoryOperation =
  | { type: 'm.store' }
  | { type: 'm.load' }
const mMap: OperationIndexMap = {
  7: 'm.store',
  8: 'm.load'
}

export type SupervisorOperation =
  | { type: 'x.exit' } // yield and stop program
  | { type: 'x.super' } // yield, but expect continuation later

const xMap: OperationIndexMap = {
  9: 'x.exit',
  10: 'x.super'
}

export const userOperationIndexMap: OperationIndexMap = {
  ...sMap,
  ...aMap,
  ...cMap,
  ...mMap,
  ...xMap,
} as const;

export type UserOperation =
  | StackOperation
  | ArithmeticOperation
  | BranchOperation
  | MemoryOperation
  | SupervisorOperation

// Kernel Operations

export type MemoryManagerOperation =
  | { type: 'new-page' }
  | { type: 'set-pages' }

export type SecurityOperation =
  | { type: 'user' }

export type KernelOperation =
  | MemoryManagerOperation
  | SecurityOperation

export const kernelOperationTypes: readonly KernelOperation["type"][] = [
  'new-page',
  'set-pages',
  'user'
] as const;

// Top level

export type MachineOperation =
  | UserOperation
  | KernelOperation

const indexByType = Object.fromEntries(
  Object.entries(userOperationIndexMap)
    .map(entry => [entry[1], Number.parseInt(entry[0])])
)

export const operationSerializer = {
  encode(op: UserOperation) {
    indexByType[op.type]
  },
  decode() {

  },
}

//export const operationTypes: readonly MachineOperation["type"][] = [
//  ...userOperationTypes,
//  ...kernelOperationTypes,/
//]
/**
 * Return the operation present at an address
 * in memory
 */
export const decodeOperation = (
  address: number,
  memory: Int32Array,
): MachineOperation => {
  const type = operationTypes[memory[address]];
  switch (type) {
    case 's.push': {
      const value = memory[address + 1];
      return { type, value };
    }
    default:
      return { type };
  }
};
/**
 * Write an operation into address in a block of memory.
 * Return the (exclusive) end of the instruction's address
 */
export const encodeOperation = (
  address: number,
  memory: Int32Array,
  operation: MachineOperation,
): number => {
  const typeIndex = operationTypes.indexOf(operation.type);
  switch (operation.type) {
    case 'push': {
      memory[address] = typeIndex;
      memory[address + 1] = operation.value;
      return address + 2;
    }
    default: {
      memory[address] = typeIndex;
      return address + 1;
    }
  }
}