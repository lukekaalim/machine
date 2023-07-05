import { CompilerGraphNode, SourceMapNode } from "./graph.ts";
import { nanoid } from 'https://deno.land/x/nanoid@v3.0.0/mod.ts';

export type SourceMapEntry = {
  id: string,
  startOffset: number,
  endOffset: number,
  sourceMapNode: SourceMapNode,
}

export type SourceMap = {
  entries: Map<string, SourceMapEntry>,
  offset: number,
};
const incrementSourceMapOffset = (sourceMap: SourceMap, amount: number): SourceMap => {
  return { ...sourceMap, offset: sourceMap.offset + amount };
}
const setSourceMapEntry = (sourceMap: SourceMap, entry: SourceMapEntry): SourceMap => {
  return { ...sourceMap, entries: new Map([...sourceMap.entries, [entry.id, entry]]) };
}
const startSourceMapEntry = (
  sourceMap: SourceMap,
  id: string,
  startOffset: number,
  sourceMapNode: SourceMapNode,
): SourceMap => {
  return setSourceMapEntry(sourceMap, { id, startOffset, endOffset: -1, sourceMapNode })
}
const endSourceMapEntry = (sourceMap: SourceMap, id: string, endOffset: number): SourceMap => {
  const existingEntry = sourceMap.entries.get(id);
  if (!existingEntry)
    throw new Error();

  return setSourceMapEntry(sourceMap, { ...existingEntry, endOffset })
}

export const emptySourceMap: SourceMap = {
  entries: new Map(),
  offset: 0,
}

export const generateSourceMap = (
  graphNode: CompilerGraphNode,
  sourceMap: SourceMap = emptySourceMap
): SourceMap => {
  switch (graphNode.type) {
    case 'machine-op': {
      const inputsSourceMap = generateNodesSourceMap(
        graphNode.inputs,
        sourceMap
      );
      const operationSourceMap = incrementSourceMapOffset(inputsSourceMap, 1);
      const machineOpEntry = {
        id: nanoid(),
        startOffset: sourceMap.offset,
        endOffset: operationSourceMap.offset,
        sourceMapNode: { type: 'graph', graphNode }
      } as const;
      return setSourceMapEntry(operationSourceMap, machineOpEntry);
    }
    case 'ordered-nodes':
      return generateNodesSourceMap(graphNode.nodes, sourceMap);
    case 'get-stack-variable': {
      const loadSourceMap = incrementSourceMapOffset(sourceMap, 2);
      const getVarEntry = {
        id: nanoid(),
        startOffset: sourceMap.offset,
        endOffset: loadSourceMap.offset,
        sourceMapNode: { type: 'graph', graphNode }
      } as const;
      return setSourceMapEntry(loadSourceMap, getVarEntry);
    }
    case 'set-stack-variable': {
      const loadAndUseSourceMap = generateNodesSourceMap(
        [graphNode.loadValue, graphNode.withVariable],
        sourceMap
      );
      const setVarEntry = {
        id: nanoid(),
        startOffset: sourceMap.offset,
        endOffset: loadAndUseSourceMap.offset + 4,
        sourceMapNode: { type: 'graph', graphNode }
      } as const;

      return setSourceMapEntry(
        incrementSourceMapOffset(loadAndUseSourceMap, 4),
        setVarEntry
      );
    }
    case 'source-label-start': {
      const sourceMapWithLabel = startSourceMapEntry(sourceMap, graphNode.id, sourceMap.offset, graphNode.sourceMapNode);
      const sourceMapWithContent = generateSourceMap(graphNode.startNode, sourceMapWithLabel);
      const entry = sourceMapWithContent.entries.get(graphNode.id);
      if (!entry)
        throw new Error();
      if (entry.endOffset === -1)
        return endSourceMapEntry(sourceMapWithContent, graphNode.id, sourceMapWithContent.offset);
      return sourceMapWithContent;
    }
    case 'source-label-end': {
      const endedMap = endSourceMapEntry(sourceMap, graphNode.id, sourceMap.offset);
      return generateSourceMap(graphNode.endNode, endedMap);
    }
  }
}

const generateNodesSourceMap = (nodes: CompilerGraphNode[], sourceMap: SourceMap): SourceMap => {
  let currentMap = sourceMap;

  for (const node of nodes)
    currentMap = generateSourceMap(node, currentMap);

  return currentMap;
};
