import { add, push, read, write } from "../operations.ts";
import { runtimeStructure } from "../runtime.ts";
import { CompilerGraphNode, graphGetVariable, graphOperation, graphSetVariable, graph } from "./graph.ts";
import { graphStructFieldAddress } from "./struct.ts";

import { nanoid } from 'https://deno.land/x/nanoid@v3.0.0/mod.ts';

export const vars = {
  execAddress: 'EXECUTABLE_MEMORY_ADDRESS',
  
  runtimeAddress: 'RUNTIME_STRUCT_ADDRESS',
  lookupAddress: 'LOOKUP_ADDRESS',
  dataAddress: 'DATA_ADDRESS',
};

export const graphRuntimeInitialisation = (withRuntime: CompilerGraphNode): CompilerGraphNode => {
  const runtimeInitId = nanoid();
  return (
    graph.labelStart(
      graphSetVariable(vars.runtimeAddress,
        graphGetVariable(vars.execAddress),
        graphSetVariable(vars.lookupAddress,
          computeRuntimeOffset(readRuntimeField('lookupOffset')),
          graphSetVariable(vars.dataAddress,
            computeRuntimeOffset(readRuntimeField('dataOffset')),
            graph.labelEnd(withRuntime, runtimeInitId),
          ),
        ),
      ),
      { type: 'special', description: 'runtime initialization' },
      runtimeInitId,
    )
  );
};

export const computeRuntimeOffset = (offset: CompilerGraphNode): CompilerGraphNode => {
  return graphOperation(
    add(),
    offset,
    graphGetVariable(vars.runtimeAddress),
  );
}

const readRuntimeField = (field: (typeof runtimeStructure)[number][0]) => {
  return graphOperation(
    read(),
    graphStructFieldAddress(runtimeStructure, graphGetVariable(vars.runtimeAddress), field),
  );
}
const writeRuntimeField = (
  field: (typeof runtimeStructure)[number][0],
  value: CompilerGraphNode,
) => {
  return graphOperation(
    write(),
    graphStructFieldAddress(runtimeStructure, graphGetVariable(vars.runtimeAddress), field),
    value,
  );
}

export const graphAllocateRuntimeMemory = (
  sizeGraph: CompilerGraphNode,
) => {
  return graph.set('allocated_address',
    readRuntimeField('allocationOffset'),
    graph.order(
      writeRuntimeField('allocationOffset', graph.op(add(), graph.get('allocated_address'), sizeGraph)),
      graph.get('allocated_address'),
    )
  )
};
