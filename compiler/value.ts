import { add } from "../operations.ts"
import { valueStructure } from "../runtime.ts"
import { CompilerGraphNode, graphOperation } from "./graph.ts"
import { graphStructFieldAddress } from "./struct.ts"

export type JSValue =
  | { type: 'string', value: string }
  | { type: 'number', value: number }

export const JS_VALUE_TYPES = {
  number: 1,
  string: 2,
}

export const graphLoadNumber = (loadValueAddress: CompilerGraphNode): CompilerGraphNode => {
  return graphStructFieldAddress(valueStructure, loadValueAddress, 'value');
}