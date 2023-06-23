import { sys } from "https://esm.sh/typescript@5.1.3";
import { generateRuntimeStructureBytes } from "../compiler.ts";
import { generateCompilation } from "../compiler/compilation.ts";
import { compileGraph, graphOperation } from "../compiler/graph.ts";
import { graphRuntimeInitialisation, vars } from "../compiler/runtime.ts";
import { buildGraph } from "../compiler/syntaxTree.ts";
import { encodeOperation, exit } from "../operations.ts";
import { getStructBytes, link, runtimeStructure } from "../runtime.ts";
import { MachineExecutable, createSystem, runProgram } from "../system.ts";
import { MachineState } from "../machine.ts";
import { decode } from "https://deno.land/std@0.50.0/encoding/utf8.ts";

const { executable, data, programGraph, runtimeValues } = generateCompilation(`
malloc(10);
`);

console.table(runtimeValues)
console.log(data);
console.table(executable.memory.slice(0, runtimeValues.allocationOffset))
Deno.writeTextFileSync('graph.json', JSON.stringify(programGraph, null, 2));

const handleSupervisorCall = (state: MachineState) => {
  state.pointer +=1;
  const contentAddress = state.stack.pop();
  const destinationAddress = state.stack.pop();
  if (!contentAddress || !destinationAddress)
    throw new Error();
  const contentLength = state.memory[contentAddress];
  const destinationLength = state.memory[destinationAddress];

  const contentBytes = state.memory.slice(contentAddress + 1, contentAddress + contentLength + 1);
  const destinationBytes = state.memory.slice(destinationAddress + 1, destinationAddress + destinationLength + 1);

  const contentString = decode(Uint8Array.from(contentBytes));
  const destinationString = decode(Uint8Array.from(destinationBytes));

  if (destinationString === 'std://out') {
    console.log(contentString);
  } else {
    console.log(`Writing "${contentString}" to "${destinationString}"`)
    Deno.writeTextFileSync(destinationString, contentString);
  }

  return state;
}

const system = createSystem(handleSupervisorCall);
system.load(executable);
system.run();
system.dump();