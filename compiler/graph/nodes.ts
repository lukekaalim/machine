import { MachineOperation } from "../../hardware/mod.ts";

// Variable nodes

export type CompilerGraphVariableID = string;

export type CompilerGraphSetVariableNode = {
  type: "set-var";
  varId: CompilerGraphVariableID;
  withVar: CompilerGraphNode;
  loadVar: CompilerGraphNode;
};
export type CompilerGraphGetVariableNode = {
  type: "get-var";
  varId: CompilerGraphVariableID;
};

export type CompilerGraphVariableNode =
  | CompilerGraphSetVariableNode
  | CompilerGraphGetVariableNode;

// Hardware nodes

export type CompilerGraphMachineOperationNode = {
  type: "machine-operation";
  operation: MachineOperation;
};

export type CompilerGraphHardwareNode = CompilerGraphMachineOperationNode;

// Program structure nodes

export type CompilerGraphListNode = {
  type: "list";
  nodes: CompilerGraphNode[];
};
export type CompilerGraphJumpTableNode = {
  type: "jump-table";
  loadJumpIndex: CompilerGraphNode;
  cases: CompilerGraphNode[];
};
export type CompilerGraphBranchNode = {
  type: "branch";
  loadCondition: CompilerGraphNode;
  trueBranch: CompilerGraphNode;
  falseBranch: CompilerGraphNode;
};

export type CompilerGraphStructureNode =
  | CompilerGraphListNode
  | CompilerGraphJumpTableNode
  | CompilerGraphBranchNode;

// Data nodes

export type CompilerGraphDataID = string;

export type CompilerGraphDataNode = {
  type: 'data',
  dataId: CompilerGraphDataID,
  data: Int32Array,
}
export type CompilerGraphDataPointerNode = {
  type: 'data-pointer',
  dataId: CompilerGraphDataID,
}

// Meta nodes
export type CompilerGraphLabelID = string;

export type CompilerGraphLabelStartNode = {
  type: "label-start";
  labelId: CompilerGraphLabelID;
};
export type CompilerGraphLabelEndNode = {
  type: "label-end";
  labelId: CompilerGraphLabelID;
};

export type CompilerGraphMetaNode =
  | CompilerGraphLabelStartNode
  | CompilerGraphLabelEndNode;

// Top level node

export type CompilerGraphNode =
  | CompilerGraphVariableNode
  | CompilerGraphHardwareNode
  | CompilerGraphStructureNode
  | CompilerGraphMetaNode
  | CompilerGraphDataNode
