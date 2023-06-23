import { push } from "../operations.ts";
import { add } from "../operations.ts";
import { RuntimeStruct } from "../runtime.ts";
import { CompilerGraphNode, graphOperation } from "./graph.ts";

export const graphStructFieldAddress = (
  struct: RuntimeStruct,
  address: CompilerGraphNode,
  field: string,
): CompilerGraphNode => {
  const structOffset = struct.findIndex(([name]) => name === field);
  if (structOffset === -1)
    throw new Error(`Field "${field}" does not exist in structure: ${struct}`);

  return graphOperation(add(), address, graphOperation(push(structOffset)));
}
