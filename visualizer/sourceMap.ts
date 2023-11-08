import { MachineOperation, encodeOperation } from '../operations.ts';
import { SourceMap, SourceMapEntry, CompilerGraphNode, SourceMapNode } from '../compiler/mod.ts';
import { Component, h, useState } from "https://esm.sh/@lukekaalim/act@2.6.0";
import {
  Node, SyntaxKind, SourceFile, createPrinter, isStatement, isSourceFile, EmitHint,
  Statement
} from "https://esm.sh/typescript@5.1.3";

const printer = createPrinter()

type SourceMapNodeVisualizerProps = {
  node: Node,
  sourceFile: SourceFile,

  events: {
    onStatementClick: (s: Statement) => void
  } 
}

export const SourceMapNodeVisualizer: Component<SourceMapNodeVisualizerProps>  = ({
  node,
  sourceFile,
  events,
}) => {
  if (isStatement(node)) {
    return h('div', {
      onClick: () => events.onStatementClick(node),
    }, printer.printNode(EmitHint.Unspecified, node, sourceFile));
  }
  if (isSourceFile(node)) {
    return h('div', {}, [
      node.statements
        .map(statement => h(SourceMapNodeVisualizer, { node: statement, sourceFile, events }))
    ]);
  }
  return null;
};

export const CompilerGraphVisualizer: Component<{
  compilerNode: CompilerGraphNode,
  compilerSourceMap: Map<CompilerGraphNode, SourceMapEntry>,
  currentOperationIndex: number,
}> = ({
  compilerNode,
  compilerSourceMap,
  currentOperationIndex,
}) => {
  const findChildren = () => {
    switch (compilerNode.type) {
      case 'get-stack-variable':
        return [];
      case 'machine-op':
        return compilerNode.inputs;
      case 'ordered-nodes':
        return compilerNode.nodes;
      case 'set-stack-variable':
        return [compilerNode.loadValue, compilerNode.withVariable];
      case 'source-label-end':
        return [compilerNode.endNode];
      case 'source-label-start':
        return [compilerNode.startNode];
    }
  }
  const getLabelText = (sourceMapNode: SourceMapNode, id: string) => {
    switch (sourceMapNode.type) {
      case 'syntax':
        return `${SyntaxKind[sourceMapNode.syntaxNode.kind]}:${id}`;
      default:
        return `${sourceMapNode.type}:${id}`;
    }
  }
  const renderSelf = () => {
    switch (compilerNode.type) {
      case 'get-stack-variable':
        return `get(${compilerNode.id})`
      case 'set-stack-variable':
        return `set(${compilerNode.id})`
      case 'machine-op':
        if (compilerNode.operation.type === 'push')
          return `push(${compilerNode.operation.value})`;
        return `${compilerNode.operation.type}`;
      case 'source-label-start':
        return getLabelText(compilerNode.sourceMapNode, compilerNode.id);
      case 'source-label-end':
        return `${compilerNode.id}:end`;
      default:
        return compilerNode.type;
    }
  }
  const children = findChildren();

  const sourceMapEntry = compilerSourceMap.get(compilerNode);
  const inRange = sourceMapEntry
    && sourceMapEntry.startOffset <= currentOperationIndex
    && sourceMapEntry.endOffset > currentOperationIndex;
  
  const isActive = sourceMapEntry && (
    (sourceMapEntry.startOffset === currentOperationIndex)
    || (inRange && !children.length)
  );
  const self = renderSelf();

  const style = {
    backgroundColor: isActive ? 'red' : inRange ? 'pink' : 'white'
  }

  if (!children.length)
    return h('div', { style }, self);
  return h('details', { open: true }, [
    h('summary', { style }, self),
    h('div', { style: { marginLeft: '16px' } }, [
      children.map(compilerNode =>
        h(CompilerGraphVisualizer, { compilerNode, compilerSourceMap, currentOperationIndex })),
    ])
  ])
}

export type SourceMapVisualizerProps = {
  operations: readonly MachineOperation[],
  sourceMap: SourceMap,
  programPointer: number,
  sourceFile: SourceFile,
  programGraph: CompilerGraphNode
};

export const SourceMapVisualizer: Component<SourceMapVisualizerProps> = ({
  operations,
  sourceMap,
  sourceFile,
  programGraph,
  programPointer,
}) => {
  const [sourceMapEntry, setSourceMapEntry] = useState<SourceMapEntry | null>(null);

  const onStatementClick = (statement: Statement) => {
    const sourceMapEntries = [...sourceMap.entries.values()];
    const statementEntry = sourceMapEntries.find(entry =>
      entry.sourceMapNode.type === 'syntax' && entry.sourceMapNode.syntaxNode === statement);
    setSourceMapEntry(statementEntry || null);
  }

  const events = {
    onStatementClick,
  }

  let operationOffset = 0;
  const operationsIndexLookup = new Map();
  for (const op of operations) {
    operationsIndexLookup.set(operationOffset, op);
    operationOffset += op.type === 'push' ? 2 : 1;
  }
  const currentOperation = operationsIndexLookup.get(programPointer)
  const currentOperationIndex = operations.indexOf(currentOperation);
  
  const operationsSlice = sourceMapEntry
    && operations.slice(sourceMapEntry.startOffset, sourceMapEntry.endOffset)
    || [];

  const compilerSourceMap = new Map(
    [...sourceMap.entries.values()]
      .map(e => e.sourceMapNode.type === 'graph' ? [e.sourceMapNode.graphNode, e] : null)
      .filter((e): e is [CompilerGraphNode, SourceMapEntry] => !!e)
  )
  
  return [
    h('pre', {}, JSON.stringify(currentOperation)),
    h('pre', {},
      h('div', { style: { display: 'flex' } }, [
        h('div', {}, [
          h(SourceMapNodeVisualizer, { node: sourceFile, sourceFile, events }),
          sourceMapEntry && h('pre', { style: { display: 'flex', flexDirection: 'column' }}, [
            operationsSlice.map((op, index) => {
              const text = op.type === 'push' ? `push(${op.value})` : op.type
              const style = {
                backgroundColor: (index + sourceMapEntry.startOffset) === currentOperationIndex ? 'red' : 'white',
              };
              return h('span', { style }, `${encodeOperation(op)}\t${text}`)
            })
          ]),
        ]),
        h(CompilerGraphVisualizer, { compilerNode: programGraph, compilerSourceMap, currentOperationIndex }),
      ])
    ),
  ];
};
