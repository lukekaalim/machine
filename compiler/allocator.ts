import { add, dup, read, write } from "../operations.ts";
import { runtimeStructure } from "../runtime.ts";
import { CompilerGraphNode, graphGetVariable, graphOperation, graphOrder, graphSetVariable } from "./graph.ts";
import { vars } from "./runtime.ts";
import { graphStructFieldAddress } from "./struct.ts";

export const graphMalloc = (
  loadBytes: CompilerGraphNode,
): CompilerGraphNode => {
  return graphSetVariable('ALLOC_OFFSET',
    graphOperation(
      read(),
      graphStructFieldAddress(runtimeStructure, graphGetVariable(vars.runtimeAddress), 'allocationOffset')
    ),
    graphOrder(
      graphOperation(
        write(),
        graphStructFieldAddress(runtimeStructure, graphGetVariable(vars.runtimeAddress), 'allocationOffset'),
        graphOperation(
          add(),
          loadBytes,
          graphGetVariable('ALLOC_OFFSET'),
        ),
      ),
      graphOperation(dup())
    )
  );
}