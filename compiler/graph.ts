import { encodeDiscard } from "../hello_world.ts";
import { MachineOperation, peek, push } from "../operations.ts";

export type CompilerGraphNode =
  | { type: 'set-stack-variable', id: string, loadValue: CompilerGraphNode, withVariable: CompilerGraphNode }
  | { type: 'get-stack-variable', id: string }
  | { type: 'machine-op', inputs: CompilerGraphNode[], operation: MachineOperation }
  | { type: 'ordered-nodes', nodes: CompilerGraphNode[] }
  | { type: 'source-label', label: string, node: CompilerGraphNode }

export type CompilerGraphState = {
  stackVariables: Map<string, number>
  stackDepth: number,
};

export const compileGraph = (
  node: CompilerGraphNode,
  state: CompilerGraphState,
): MachineOperation[] => {
  switch (node.type) {
    case 'machine-op':
      return [
        node.inputs
          .map((node, index) => {
            const nextState = { ...state, stackDepth: state.stackDepth + index };
            return compileGraph(node, nextState);
          })
          .flat(1),
        node.operation,
      ].flat(1);
    case 'set-stack-variable': {
      const nextState = {
        ...state,
        stackVariables: new Map([...state.stackVariables, [node.id, state.stackDepth]]),
        stackDepth: state.stackDepth + 1,
      };
      return [
        compileGraph(node.loadValue, state),
        compileGraph(node.withVariable, nextState),
        encodeDiscard(),
      ].flat(1);
    }
    case 'get-stack-variable': {
      const variableDepth = state.stackVariables.get(node.id);
      if (variableDepth === undefined)
        throw new Error(`Missing stack variable: ${node.id}`);
        const variableOffset = (state.stackDepth - variableDepth) - 1;

      return [
        push(variableOffset),
        peek(),
      ];
    }
    case 'ordered-nodes': {
      return node.nodes
        .map(node => compileGraph(node, state))
        .flat(1);
    }
    default:
      throw new Error();
  }
}

export const graphOperation = (
  operation: MachineOperation,
  ...inputs: CompilerGraphNode[]
): CompilerGraphNode => {
  return {
    type: 'machine-op',
    inputs,
    operation,
  }
};

export const graphOrder = (
  ...nodes: CompilerGraphNode[]
): CompilerGraphNode => {
  return {
    type: 'ordered-nodes',
    nodes,
  }
}

export const graphSetVariable = (
  id: string,
  loadValue: CompilerGraphNode,
  withVariable: CompilerGraphNode,
): CompilerGraphNode => {
  return { type: 'set-stack-variable', id, loadValue, withVariable };
};

export const graphGetVariable = (
  id: string,
): CompilerGraphNode => {
  return { type: 'get-stack-variable', id };
}