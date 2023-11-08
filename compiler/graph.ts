import { MachineOperation, peek, push, swap, write } from "../operations.ts";
import { Node } from 'https://esm.sh/typescript@5.1.3';

export type CompilerGraphNode =
  | { type: 'set-stack-variable', id: string, loadValue: CompilerGraphNode, withVariable: CompilerGraphNode }
  | { type: 'get-stack-variable', id: string }
  | { type: 'machine-op', inputs: CompilerGraphNode[], operation: MachineOperation }
  | { type: 'ordered-nodes', nodes: CompilerGraphNode[] }
  | { type: 'branch', loadCondition: CompilerGraphNode, trueBranch: CompilerGraphNode, falseBranch: CompilerGraphNode }
  | { type: 'jump-table', loadIndex: CompilerGraphNode, entries: CompilerGraphNode[] }
  | { type: 'source-label-start', id: string, sourceMapNode: SourceMapNode, startNode: CompilerGraphNode }
  | { type: 'source-label-end', id: string, endNode: CompilerGraphNode }

export type SourceMapNode =
  | { type: 'syntax', syntaxNode: Node }
  | { type: 'graph', graphNode: CompilerGraphNode }
  | { type: 'special', description: string }

export type CompilerGraphState = {
  stackVariables: Map<string, number>
  stackDepth: number,
  operationMap: Map<CompilerGraphNode, MachineOperation[]>,
};

export const setStackVariableInstructions = [
  swap(),
  push(0),
  swap(),
  write(),
]

export const compileGraph2 = (
  node: CompilerGraphNode,
  state: CompilerGraphState,
): CompilerGraphState => {
  switch (node.type) {
    case 'machine-op': {
      const inputState = node.inputs.reduce((state, node, index) => {
        return compileGraph2(node, { ...state, stackDepth: state.stackDepth + index });
      }, state)
      const operations = [
        ...findOperationsFromNodes(node.inputs, inputState),
        node.operation,
      ];
      const operationMap = new Map([
        ...inputState.operationMap,
        [node, operations]
      ]);
      return { ...inputState, operationMap, stackDepth: state.stackDepth };
    }
    case 'get-stack-variable':
      
    default:
      throw new Error(`Unsupported node type`);
  }
}
export const findOperationsFromNodes = (nodes: CompilerGraphNode[], state: CompilerGraphState) => {
  return nodes.map(state.operationMap.get)
    .filter((operations): operations is MachineOperation[] => !!operations)
    .flat(1);
}

export const compileGraph = (
  node: CompilerGraphNode,
  state: CompilerGraphState,
): MachineOperation[] => {
  switch (node.type) {
    case 'machine-op': {
      const loadInputs = node.inputs.map((node, index) => {
        const nextState = { ...state, stackDepth: state.stackDepth + index };
        return compileGraph(node, nextState);
      })
      .flat(1);
      
      return [
        loadInputs,
        node.operation,
      ].flat(1);
    }
    case 'set-stack-variable': {
      const nextState = {
        ...state,
        stackVariables: new Map([...state.stackVariables, [node.id, state.stackDepth]]),
        stackDepth: state.stackDepth + 1,
      };
      return [
        compileGraph(node.loadValue, state),
        compileGraph(node.withVariable, nextState),
        swap(),
        push(0),
        swap(),
        write(),
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
      ]
    }
    case 'ordered-nodes': {
      return node.nodes
        .map(node => compileGraph(node, state))
        .flat(1);
    }
    case 'source-label-start': {
      return compileGraph(node.startNode, state);
    }
    case 'source-label-end': {
      return compileGraph(node.endNode, state);
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

export const graphLabelStart = (
  startNode: CompilerGraphNode,
  sourceMapNode: SourceMapNode,
  id: string,
): CompilerGraphNode => {
  return { type: 'source-label-start', startNode, sourceMapNode, id };
}
export const graphLabelEnd = (
  endNode: CompilerGraphNode,
  id: string,
): CompilerGraphNode => {
  return { type: 'source-label-end', endNode, id };
}

export const graph = {
  get: graphGetVariable,
  set: graphSetVariable,
  op: graphOperation,
  order: graphOrder,
  labelStart: graphLabelStart,
  labelEnd: graphLabelEnd,
};
