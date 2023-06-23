import { add, push, read } from "../operations.ts";
import { runtimeStructure } from "../runtime.ts";
import { CompilerGraphNode, graphGetVariable, graphOperation, graphSetVariable } from "./graph.ts";
import { graphStructFieldAddress } from "./struct.ts";

export const vars = {
  execAddress: 'EXECUTABLE_MEMORY_ADDRESS',
  
  runtimeAddress: 'RUNTIME_STRUCT_ADDRESS',
  lookupAddress: 'LOOKUP_ADDRESS',
  dataAddress: 'DATA_ADDRESS',
};

export const graphRuntimeInitialisation = (withRuntime: CompilerGraphNode): CompilerGraphNode => {
  return (
    graphSetVariable(vars.runtimeAddress,
      graphGetVariable(vars.execAddress),
      graphSetVariable(vars.lookupAddress,
        computeRuntimeOffset(readRuntimeField('lookupOffset')),
        graphSetVariable(vars.dataAddress,
          computeRuntimeOffset(readRuntimeField('dataOffset')),
          withRuntime,
        ),
      ),
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