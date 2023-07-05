import { encode } from 'https://deno.land/std@0.50.0/encoding/utf8.ts';
import { add, push, read } from "../operations.ts";
import { CompilerGraphNode, graphGetVariable, graphOperation } from "./graph.ts";
import { vars } from "./runtime.ts";
import { JSValue, JS_VALUE_TYPES } from "./value.ts";
import { loadRuntimeOffsetAddress } from "./offset.ts";
import { graphStructFieldAddress } from "./struct.ts";
import { valueStructure } from "../runtime.ts";

export type Data = {
  blocks: number[][],
  offsets: number[],

  lookupRuntimeOffset: number,
  blockRuntimeOffset: number,

  valueIndexMap: Map<JSValue, number>,
}

/**
 * Static Data looks like:
 * 
 * |Offset|Value|
 * |-|-|
 * |0|0|
 * |
 */

export const buildData = (
  jsValues: JSValue[],
  runTimeOffset: number,
): Data => {
  const data: Data = {
    blocks: [],
    offsets: [],
    valueIndexMap: new Map(),
    lookupRuntimeOffset: runTimeOffset,
    blockRuntimeOffset: runTimeOffset,
  };

  const getBlockRuntimeOffset = (blockIndex: number): number => {
    return data.blockRuntimeOffset + data.offsets[blockIndex];
  }

  const pushBlock = (bytes: number[]) => {
    data.offsets.push((data.offsets.at(-1) || 0) + (data.blocks.at(-1) || []).length);
    data.blocks.push(bytes);
    data.lookupRuntimeOffset = runTimeOffset + (data.offsets.at(-1) || 0) + bytes.length;
    return data.blocks.length - 1;
  }

  for (const jsValue of jsValues) {
    if (jsValue.type === 'number') {
      const valueIndex = pushBlock([JS_VALUE_TYPES.number, jsValue.value])
      data.valueIndexMap.set(jsValue, valueIndex);
    }
    if (jsValue.type === 'string') {
      const stringBytes = encode(jsValue.value);
      const stringBytesIndex = pushBlock([stringBytes.length, ...stringBytes]);
      const stringBytesRTO = getBlockRuntimeOffset(stringBytesIndex);
      const valueIndex = pushBlock([JS_VALUE_TYPES.string, stringBytesRTO]);
      data.valueIndexMap.set(jsValue, valueIndex);
    }
  }

  return data;
};

export const generateDataBytes = (data: Data): number[] => {
  return [
    ...data.blocks.flat(1),
    ...data.offsets.map(offset => offset + data.blockRuntimeOffset),
  ]
}

/**
 * Given a data block index, build a graph that can
 * retrieve the blocks address at runtime.
 */
export const graphLoadDataAddress = (dataIndex: number) => {
  const loadLookupAddress = graphOperation(
    add(),
    graphGetVariable(vars.lookupAddress),
    graphOperation(push(dataIndex)),
  );
  const loadBlockRuntimeOffset = graphOperation(
    read(),
    loadLookupAddress,
  );
  const loadBlockAddress = graphOperation(
    add(),
    graphGetVariable(vars.runtimeAddress),
    loadBlockRuntimeOffset,
  );
  return loadBlockAddress;
};

export const graphLoadStringDataAddress = (loadValueAddress: CompilerGraphNode) => {
  return loadRuntimeOffsetAddress(
    graphOperation(
      read(),
      graphStructFieldAddress(valueStructure, loadValueAddress, 'value')
    )
  );
};