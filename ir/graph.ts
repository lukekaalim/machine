import { createEmulator } from "../emulator/emulator.ts";
import { UserOperation } from "../hardware/mod.ts";
import { Island, IslandOperation, buildIslandMap, resolveIslandOperations } from "./island.ts";

export type Node =
  | { type: "operation"; operands: Node[]; operation: UserOperation, stackMod: number }
  | { type: "const"; value: number }
  | { type: "assign", key: string, value: Node, scope: Node }
  | { type: "reference", key: string }
  | { type: "switch", value: Node, cases: [number, Node][] }

export type TNode<T extends Node["type"]> = Extract<Node, { type: T }>;

type IRCompilerState ={
  islands: Set<Island>,
  stackDepth: number,
  assigned: Map<string, number>,
}

export const createCompiler = () => {
  const state: IRCompilerState = {
    islands: new Set(),
    stackDepth: 0,
    assigned: new Map(),
  }

  const compileNode = (ir: Node): IslandOperation[] => {
    switch (ir.type) {
      case 'operation': {
        const loadOperands = ir.operands.map(compileNode).flat(1);
        return [
          ...loadOperands,
          ir.operation,
        ];
      }
      case 'const':
        return [{ type: 's.push', value: ir.value }]
      default:
        throw new Error(`Unsupported ir node ${ir.type}`)
    }
  }

  return { compileNode, state };
}

const c = createCompiler()
const island = {
  id: '0',
  type: 'operations',
  operations: c.compileNode({
    type: 'operation',
    stackMod: 1,
    operands: [
      { type: 'const', value: 1 },
      { type: 'switch', cases: [
        [10, { type: 'const', value: 1 }],
        [20, { type: 'const', value: 2 }],
      ], value: { type: 'const', value: 10 } },
    ],
    operation: { type: 'a.add' }
  }),
} as const;
const map = buildIslandMap([island]);
const ops = island.operations.map(o => resolveIslandOperations(o, map));
const emu = createEmulator();

console.log(JSON.stringify(ops, null, 2));

for (const op of ops)
  emu.runOperation(op);

console.log(emu.stack)
