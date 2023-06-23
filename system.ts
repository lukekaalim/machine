import { decode, encode } from "https://deno.land/std@0.50.0/encoding/utf8.ts";
import { readline } from "https://deno.land/x/readline@v1.1.0/mod.ts";
import { MachineOperation, decodeOperation, encodeOperation } from "./operations.ts";
import { MachineState, runMachine } from "./machine.ts";
import { RuntimeStruct, getStructBytes } from "./runtime.ts";
import { MachineProgramCompilation, generateRuntimeStructureBytes } from "./compiler.ts";
import { dump } from "./memory.ts";
import { handleSystemCall } from "./system/systemCalls.ts";

export const systemStateStructure: RuntimeStruct = [
  ['nullPointerValue'],
  ['systemCallArgumentAddress'],
  ['memorySize'],
  ['randomAddress']
] as const;

export type SystemState = {
  nullPointerValue: number,
  systemCallArgumentAddress: number,
  memorySize: number,
  randomAddress: number,
};

export type SystemOperation =
  | { type: 'writefile', nameAddress: number, bytesAddress: number, bytesLength: number, callbackAddress: number }
  | { type: 'readfile', nameAddress: number, bytesAddress: number, bytesLength: number, callbackAddress: number }
  | { type: 'resize', bytes: number }
  | { type: 'beep' }

export const fsSyscallStructure = [
  ['type'],
  ['nameAddress'],
  ['bytesAddress'],
  ['bytesLength'],
  ['callbackAddress']
] as const;

export const decodeSystemOperation = (address: number, memory: number[]): SystemOperation => {
  const type = memory[address];
  switch (type) {
    case 0:
    default:
      // invalid system values
      throw new Error();
    case 1:
      return {
        type: 'writefile',
        nameAddress:      memory[address + 1],
        bytesAddress:     memory[address + 2],
        bytesLength:      memory[address + 3],
        callbackAddress:  memory[address + 4],
      };
    case 2:
      return {
        type: 'readfile',
        nameAddress:      memory[address + 1],
        bytesAddress:     memory[address + 2],
        bytesLength:      memory[address + 3],
        callbackAddress:  memory[address + 4],
      };
    case 3:
      return {
        type: 'resize',
        bytes: memory[address + 1],
      }
    case 4:
      return { type: 'beep' };
  }
};
export const encodeSystemOperation = (operation: SystemOperation): number[] => {
  switch (operation.type) {
    case 'readfile':
      return [2, operation.nameAddress, operation.bytesAddress, operation.bytesLength, operation.callbackAddress];
    case 'writefile':
      return [1, operation.nameAddress, operation.bytesAddress, operation.bytesLength, operation.callbackAddress];
    case 'resize':
      return [3, operation.bytes];
    case 'beep':
      return [4];
    default:
      throw new Error();
  }
};

const readString = (address: number, memory: number[]): string => {
  const length = memory[address];
  const bytes = memory.slice(address + 1, address + 1 + length);
  const value = decode(Uint8Array.from(bytes));
  console.log(`String "${value}" of ${length} length`);
  return value
}
const readBytes = (address: number, length: number, memory: number[]): number[] => {
  return memory.slice(address, address + length);
}
const writeBytes = (address: number, length: number, memory: number[], bytes: number[]) => {
  for (let i = 0; i < length; i++)
    memory[address + i] = bytes[i]
}

export type MachineExecutable = {
  memory: number[],
  entry: null | number,
};

export type MachineSystem = {
  load: (executable: MachineExecutable) => void,
  run: () => void,

  dump: () => void,
};

export const createSystem = (
  handleSupervisorCall: (state: MachineState) => MachineState,
): MachineSystem => {
  let state: MachineState = {
    stack: [],
    memory: [
      getStructBytes(systemStateStructure, {
        nullPointerValue: 0,
        systemCallArgumentAddress: 0,
        memorySize: systemStateStructure.length,
        randomAddress: 0,
      })
    ].flat(1),
    pointer: 0
  };

  const load = (executable: MachineExecutable) => {
    const offset = state.memory.length;
    state.memory = [state.memory, executable.memory].flat(1);
    state.stack = [offset];
    if (executable.entry !== null)
      state.pointer = offset + executable.entry;
  }
  const cycles: any[] = [];

  const run = () => {
    try {
      while (state.pointer !== 0) {
        const op = decodeOperation(state.pointer, state.memory);
        cycles.push([state.pointer, opToString(op), state.stack]);
        if (op.type === 'exit')
          break;
        if (op.type === 'super')
          state = handleSupervisorCall(state)
  
        state = runMachine(state);
      }
    } catch (error) {
      console.error(error);
    }
  }

  const opToString = (op: MachineOperation) => {
    if (op.type === 'push')
      return `${op.type}(${op.value})`;
    return `${op.type}`;
  }

  const systemDump = () => {
    console.log('SYSTEM MEMORY')
    dump(state.memory);
    console.log('CYCLES')
    console.table(cycles);
  }

  return {
    load,
    run,
    dump: systemDump,
  }
};

export const runProgram = (
  compilation: MachineProgramCompilation
): MachineState => {
  const programCode = compilation.operations.map(encodeOperation).flat(1);
  const systemState = [
    0, // null pointer
    
    0,  // system call entry point. Writing an value
        // to this adress causes it to be read as a
        // system call argument.

    0,  // current memory size
    0,  // random memory start
  ];
  const runtimeStructure = generateRuntimeStructureBytes(compilation);

  const memory: number[] = [
    systemState,
    programCode,
    runtimeStructure,
    // add 512 bytes for stuff
    Array.from({ length: 1024 * 1024 }).map(() => 0),
  ].flat(1);
  const stack: number[] = [];

  let state: MachineState = {
    memory,
    stack,
    pointer: systemState.length,
  };
  state.memory[2] = memory.length;
  state.memory[3] = memory.length - (1024 * 1024);
  console.log(state.memory.slice(0, state.memory[3]));
  console.log(`Allocating ${state.memory.length} bytes`);
  
  let running = true;

  const handleSystemOperation = (operation: SystemOperation) => {
    switch (operation.type) {
      case 'readfile': {
        const name = readString(operation.nameAddress, state.memory);
        switch (name) {
          case 'std://in':
            return setTimeout(() => {
              const response = prompt("Input:");
              const data = encode(response || '');
              const memory = state.memory;
              writeBytes(operation.bytesAddress, operation.bytesLength, memory, [...data]);
              state = { ...state, memory };
              execute(operation.callbackAddress);
            }, 0);
          default:
            return Deno.readFile(name).then(data => {
              state = {
                ...state,
                stack: [...state.stack, ...data, data.byteLength]
              }
              execute(operation.callbackAddress);
            });
        }
      }
      case 'writefile': {
        const name = readString(operation.nameAddress, state.memory);
        const bytes = readBytes(operation.bytesAddress, operation.bytesLength, state.memory);
        console.log(name, bytes, decode(Uint8Array.from(bytes)));
        switch (name) {
          default:
            return Deno.writeFile(name, Uint8Array.from(bytes), {  })
              .then(() => {
                if (operation.callbackAddress !== 0)
                  execute(operation.callbackAddress);
              });
          case 'std://out':
            return setTimeout(() => {
              console.log('STDOUT:', decode(Uint8Array.from(bytes)), bytes);
              if (operation.callbackAddress !== 0)
                execute(operation.callbackAddress);
            }, 0);
        }
      }
      case 'resize': {
        const newSize = state.memory.length + operation.bytes;
        const memory = [
          ...state.memory,
          ...Array.from({ length: operation.bytes }).map(_ => 0)
        ].slice(0, newSize);
        memory[2] = memory.length;
        state = { ...state, memory }
        return;
      }
    }
  }


  const execute = (entrypoint: number = state.pointer) => {
    state = { ...state, pointer: entrypoint };
    const prevStates: MachineState[] = []
    console.time('execute')
    try {
      while (running) {
        prevStates.push(state);
        const nextState = runMachine(state);
        running = nextState !== state;
        state = nextState;
        if (state.memory[1] !== 0) {
          const systemOperation = decodeSystemOperation(state.memory[1], state.memory);
          console.log('SYSCALL', state.memory[1], systemOperation);
          handleSystemOperation(systemOperation);
          state.memory[1] = 0;
        }
      }
    } catch(error) {
      console.error(error);
    } finally {
      const tryGetOperation = (state: MachineState) => {
        try {
          return decodeOperation(state.pointer, state.memory);
        } catch (_) {
          return null;
        }
      }
      console.timeEnd('execute');
      console.log(`${prevStates.length} operations`);
      console.table(prevStates.map((state, index) => {
        const operation = tryGetOperation(state);
        return {
          start: state.stack || [],
          address: state.pointer,
          operation: ((operation?.type === 'noop' && `===== [LABEL ${operation.label}] =====`) || operation) || [state.memory[state.pointer]],
          end: prevStates[index + 1]?.stack || null,
        }
      }).filter(Boolean), ['start', 'address', 'operation', 'end']);
    }
  }
  
  execute();
  return state;
}

export const writeProgramToString = (program: MachineOperation[]): string => {
  return program.map(value => {
    if (value.type === 'push')
      return `${value.type} ${value.value}`;
    return `${value.type}`
  }).join('\n')
}