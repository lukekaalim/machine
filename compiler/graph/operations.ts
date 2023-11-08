import { CompilerGraphMachineOperationNode } from "./nodes.ts";
import { CompilerGraphState } from "./state.ts";
import { MachineOperation } from "../../hardware/mod.ts";

const operationStackOffset: { [key in MachineOperation["type"]]: number } = {
  push: 1,
  discard: -1,

  div: -1,
  mult: -1,
  pow: -1,
  add: -1,

  load: 0,
  store: -2,

  peek: 0,
  swap: 0,
  "short-jump": -2,
  "long-jump": -2,

  exit: 0,
  super: 0,
  user: 0,
  "set-pages": 0,
  "new-page": 0,
};

export const compileMachineOperationNode = (
  state: CompilerGraphState,
  node: CompilerGraphMachineOperationNode
) => {
  const { operation } = node;
  state.operationsForNode.set(node, [operation]);
  state.operationIndex++;
  state.stackDepth += operationStackOffset[operation.type];
};
