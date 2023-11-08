import { Component, h, useRef, useState } from "https://esm.sh/@lukekaalim/act@2.6.0"
import { render } from "https://esm.sh/@lukekaalim/act-web@2.3.0";
import { RuntimeMemoryVisualizer, readStructFromMemory, MemoryTable } from './memory.ts';
import { StackVisualizer } from './stack.ts';
import { generateCompilation } from '../compiler/mod.ts';
import { createSystem, systemStateStructure } from '../system.ts';
import { decodeOperation, MachineOperation } from '../operations.ts';
import { MachineState } from '../machine.ts';
import { SourceMapVisualizer } from './sourceMap.ts';
import { RuntimeStruct, runtimeStructure } from '../runtime.ts';


const { executable, operations, sourceMap, sourceFile, programGraph } = generateCompilation(`
const a = 5;
const b = 10;
test();
test();
test();
test();
const myAlloc = malloc(8);
test();
`);
const system = createSystem(x => x);
const initialMachineState = system.load(executable);

const states: MachineState[] = [{...initialMachineState, memory: [...initialMachineState.memory]}];
let state = initialMachineState;
while (state.pointer !== 0) {
  try {
    const nextState = system.step()
    states.push({ ...nextState, memory: [...nextState.memory] });
    state = nextState;
  } catch (error) {
    console.error(error);
    state.pointer = 0;
  }
}

export const Viualizer: Component = () => {
  const [stateIndex, setStateIndex] = useState(0);

  const state = states[stateIndex];
  const onInput = (event: Event) => {
    if (event.target instanceof HTMLInputElement)
      setStateIndex(event.target.valueAsNumber)
  }
  const runtime = readStructFromMemory(runtimeStructure, 8, state.memory);
  const system = readStructFromMemory(systemStateStructure, 0, state.memory);
  const programStart = runtime['programOffset'] + 8;
  const instructionPointer = system['instructionPointer'];


  const programPointer = instructionPointer - programStart;


  return h('div', { style: { display: 'flex', flexDirection: 'column' } }, [
    h('input', {
      style: { display: 'flex', flex: 1, position: 'sticky', top: 0 },
      type: 'range', min: 0, max: states.length - 1, step: 1, value: stateIndex, onInput
    }),
    h('div', { style: { display: 'flex' }}, [
      h(StackVisualizer, { stack: state.stack }),
      h(MemoryTable, { memory: state.memory, highlightAddresses: new Set([instructionPointer]) }),
      h(RuntimeMemoryVisualizer, { memory: state.memory, runtimeAddress: 8 }),
    ]),
    h(SourceMapVisualizer, { operations, sourceMap, sourceFile, programGraph, programPointer }),
  ]);
}

const OperationVisualizer: Component<{ state: MachineState }> = ({ state }) => {
  const operation = decodeOperation(state.pointer, state.memory);
  const text = operation.type === 'push' ? `push(${operation.value})` : operation.type;
  return h('pre', { style: { margin: '4px' } }, text);
}

const stackRowStyle = {
  display: 'flex',
  overflow: 'auto',
}

render(h(Viualizer), document.body);