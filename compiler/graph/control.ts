import {
  CompilerGraphBranchNode,
  CompilerGraphJumpTableNode,
} from "./nodes.ts";
import {
  CompilerGraphState,
  compileGraphNode,
  getOperationForNode,
} from "./state.ts";
import { MachineOperation } from "../../hardware/mod.ts";

export const compileBranchNode = (
  state: CompilerGraphState,
  node: CompilerGraphBranchNode
) => {
  state.operationIndex++; // load destination placeholder
  const branchStart = state.operationIndex;
  compileGraphNode(state, node.loadCondition);

  const trueBranchOffset = state.operationIndex - branchStart;
  compileGraphNode(state, node.trueBranch);
  state.operationIndex++; // jump placeholder

  const falseBranchOffset = state.operationIndex - state.operationIndex;
  compileGraphNode(state, node.falseBranch);
  state.operationIndex++; // jump placeholder

  const branchEndOffset = state.operationIndex;
  state.operationsForNode.set(node, [
    { type: "push", value: trueBranchOffset },
    ...getOperationForNode(state, node.loadCondition),
    { type: "short-jump" },
    { type: "push", value: falseBranchOffset },
    { type: "push", value: 1 },
    { type: "short-jump" },
    ...getOperationForNode(state, node.trueBranch),
    // Jump to the end of the branch and resume normal flow
    { type: "push", value: branchEndOffset },
    { type: "push", value: 1 },
    { type: "short-jump" },
    ...getOperationForNode(state, node.falseBranch),
    // Jump to the end of the branch and resume normal flow
    { type: "push", value: branchEndOffset },
    { type: "push", value: 1 },
    { type: "short-jump" },
  ]);
};

export const compileJumpTableNode = (
  state: CompilerGraphState,
  node: CompilerGraphJumpTableNode
) => {
  const startIndex = state.operationIndex;
  compileGraphNode(state, node.loadJumpIndex);
  state.operationIndex++;
  // jump table
  state.operationIndex++;
  state.operationIndex += node.cases.length;

  for (const caseNode of node.cases) {
    compileGraphNode(state, caseNode);
    state.operationIndex++;
  }

  const loadJumpIndexOperations = getOperationForNode(
    state,
    node.loadJumpIndex
  );
  const operationsPerCase = node.cases
    .map((caseNode) =>
      getOperationForNode(state, caseNode)
    );

  const caseOffsetsStart = loadJumpIndexOperations.length + 2;
  const casesBlockStart = caseOffsetsStart + node.cases.length * 3;
  const caseStarts = operationsPerCase.reduce<number[]>(
    (offsets, operations, index) => {
      return [...offsets, (offsets[index - 1] || 0) + operations.length];
    },
    [casesBlockStart]
  );
  const tableEnd = caseStarts[caseStarts.length - 1];

  state.operationsForNode.set(node, [
    ...loadJumpIndexOperations,
    { type: "push", value: 1 },
    { type: "short-jump" },

    ...node.cases
      .map((caseNode, caseIndex) => {
        return [
          { type: "push", value: 1 }, // destination
          { type: "push", value: 1 },
          { type: "short-jump" },
        ] as const;
      })
      .flat(1),

    ...operationsPerCase.map((operations, caseIndex) => [
      ...operations,
    ]).flat(1),
  ]);
};
