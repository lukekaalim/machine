import {
  CompilerGraphLabelStartNode,
  CompilerGraphLabelEndNode,
} from "./nodes.ts";
import { CompilerGraphState } from "./state.ts";

export const compileLabelStartNode = (
  state: CompilerGraphState,
  node: CompilerGraphLabelStartNode
) => {
  const label = state.labelSpans.get(node.labelId) || { start: -1, end: -1 };
  label.start = state.operationIndex;
  state.labelSpans.set(node.labelId, label);
};

export const compileLabelEndNode = (
  state: CompilerGraphState,
  node: CompilerGraphLabelEndNode
) => {
  const label = state.labelSpans.get(node.labelId) || { start: -1, end: -1 };
  label.end = state.operationIndex;
  state.labelSpans.set(node.labelId, label);
};
