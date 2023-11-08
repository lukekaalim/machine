import {
  CompilerGraphGetVariableNode,
  CompilerGraphSetVariableNode,
} from "./nodes.ts";
import {
  CompilerGraphState,
  UndefinedVariableError,
  InvalidStackStateError,
  getOperationForNode,
  compileGraphNode,
} from "./state.ts";

export const compileGetVarNode = (
  state: CompilerGraphState,
  node: CompilerGraphGetVariableNode
) => {
  const varDepth = state.stackDepthForVariable.get(node.varId);
  if (varDepth === undefined) throw new UndefinedVariableError();
  state.operationsForNode.set(node, [
    { type: "push", value: state.stackDepth - varDepth },
    { type: "peek" },
  ]);
  state.spanForNode.set(node, {
    start: state.operationIndex,
    end: state.operationIndex + 2
  });
  state.stackDepth++;
  state.operationIndex += 2;
};

export const compileSetVarNode = (
  state: CompilerGraphState,
  node: CompilerGraphSetVariableNode
) => {
  const operationStartIndex = state.operationIndex;
  const variableDepth = state.stackDepth + 1;
  const prevVariableDepth = state.stackDepthForVariable.get(node.varId);
  compileGraphNode(state, node.loadVar);

  if (state.stackDepth !== variableDepth)
    throw new InvalidStackStateError(
      "Stack was not incremented by one (was more or less??)"
    );

  state.stackDepthForVariable.set(node.varId, state.stackDepth);
  compileGraphNode(state, node.withVar);

  // Once we're done with the variable, clear it
  if (prevVariableDepth === undefined)
    state.stackDepthForVariable.delete(node.varId);
  else state.stackDepthForVariable.set(node.varId, prevVariableDepth);

  const childOperations = [
    ...getOperationForNode(state, node.loadVar),
    ...getOperationForNode(state, node.withVar),
  ]

  // And we should have the "withVar" result at the top of the stack,
  // with our variable second, and we need to clear our variable.
  state.operationsForNode.set(node, [
    ...childOperations,
    { type: "swap" },
    { type: "discard" },
  ]);
  state.spanForNode.set(node, {
    start: operationStartIndex,
    end: state.operationIndex + 2,
  });
  state.operationIndex += 2;
};
