import { CompilerGraphNode, graphMalloc, graph } from '../mod.ts';
import { write, push } from '../../operations.ts';

export const graphMallocIncrements = (): CompilerGraphNode => {
  return graph.set('memory',
    graphMalloc(graph.op(push(2))),
    graph.order(
      graph.op(write(), graph.get('memory'), graph.get('memory')),
      graph.op(push(0))
    )
  );
};