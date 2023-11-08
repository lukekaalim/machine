import {
  CompilerGraphNode,
  CompilerGraphVariableID,
} from "./nodes.ts";
import { MachineOperation } from "../../hardware/mod.ts";
import * as variables from './variables.ts';
import * as operations from './operations.ts';
import * as labels from './labels.ts';

type Span = { start: number, end: number };

/**
 * Mutable compiler state object - as each compiler function recieves this,
 * they update properties and pass the object to their children.
 */
export type CompilerGraphState = {
  stackDepth: number;
  stackDepthForVariable: Map<CompilerGraphVariableID, number>;

  operationsForNode: Map<CompilerGraphNode, MachineOperation[]>;
  spanForNode: Map<CompilerGraphNode, Span>;
  operationIndex: number,
};
export const cloneState = (state: CompilerGraphState) => ({
  ...state,
  stackDepthForVariable: new Map(state.stackDepthForVariable),
  operationsForNode: new Map(state.operationsForNode),
  spanForNode: new Map(state.spanForNode),
})

export const getOperationForNode = (state: CompilerGraphState, node: CompilerGraphNode) => {
  const operations = state.operationsForNode.get(node);
  if (!operations)
    throw new NoOperationsForNodeError();
  return operations;
}
export const getStackDepthForVariable = (state: CompilerGraphState, variableId: CompilerGraphVariableID) => {
  const depth = state.stackDepthForVariable.get(variableId);
  if (depth === undefined)
    throw new UndefinedVariableError(variableId)
  return depth;
}

export const compileGraphNode = (
  state: CompilerGraphState,
  node: CompilerGraphNode
) => {
  switch (node.type) {
    case 'get-var':
      return variables.compileGetVarNode(state, node);
    case 'set-var':
      return variables.compileSetVarNode(state, node);
    case 'machine-operation':
      return operations.compileMachineOperationNode(state, node);
    case 'list':
      for (const child of node.nodes)
        compileGraphNode(state, child);
      return;
    case 'label-start':
      return labels.compileLabelStartNode(state, node);
    case 'label-end':
      return labels.compileLabelEndNode(state, node);
    default:
      throw new UnsupportedGraphNodeError(node.type);
  }
};

export class UnsupportedGraphNodeError extends Error {}
export class UndefinedVariableError extends Error {}
export class InvalidStackStateError extends Error {}
export class UnimplementedError extends Error {}
export class NoOperationsForNodeError extends Error {}
