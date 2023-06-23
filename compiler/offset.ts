import { add } from "../operations.ts";
import { CompilerGraphNode, graphGetVariable, graphOperation } from "./graph.ts";
import { vars } from "./runtime.ts";

export const loadRuntimeOffsetAddress = (
  loadRuntimeOffset: CompilerGraphNode
): CompilerGraphNode => {
  return graphOperation(
    add(),
    graphGetVariable(vars.runtimeAddress),
    loadRuntimeOffset,
  );
}