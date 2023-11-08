import { push, write, add, read } from "../operations.ts"
import { graphAllocateRuntimeMemory, vars } from './runtime.ts';
import { CompilerGraphNode, graph } from "./graph.ts"
import { graphStructFieldAddress } from "./struct.ts"

export type JSValue =
  | { type: 'string', value: string }
  | { type: 'number', value: number }

export const JS_VALUE_TYPES = {
  number: 1,
  string: 2,
}

export const valueStructure = [
  ['type'],
  ['value']
] as const;

export const graphLoadNumber = (loadValueAddress: CompilerGraphNode): CompilerGraphNode => {
  return graph.op(
    read(),
    graphStructFieldAddress(valueStructure, loadValueAddress, 'value')
  )
}

export const graphAllocateNumberValue = (loadNumber: CompilerGraphNode): CompilerGraphNode => {
  return graph.set(
    'runtimeValueAddress',
    graphAllocateRuntimeMemory(graph.op(push(valueStructure.length))),
    graph.set('absoluteValueAddress',
      graph.op(
        add(),
        graph.get('runtimeValueAddress'),
        graph.get(vars.runtimeAddress)
      ),
      graph.order(
        graph.op(
            write(),
            graphStructFieldAddress(valueStructure, graph.get('absoluteValueAddress'), 'type'),
            graph.op(push(JS_VALUE_TYPES.number))),
        graph.op(
          write(),
          graphStructFieldAddress(valueStructure, graph.get('absoluteValueAddress'), 'value'),
        loadNumber),
        graph.get('absoluteValueAddress'),
      )
    ),
  );
};