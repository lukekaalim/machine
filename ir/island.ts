import { UserOperation } from "../hardware/mod.ts";

export type IslandOperation =
  | UserOperation
  | { type: "island.reference"; id: IslandID }
  | { type: "island.label"; id: IslandID };

export type IslandID = string;
export type Island = { id: IslandID } & (
  | { type: "data"; data: number[] }
  | { type: "operations"; operations: IslandOperation[] }
);

const getIslandLength = (island: Island) => {
  switch (island.type) {
    case "data":
      return island.data.length;
    case "operations":
      return island.operations.length * 2;
    default:
      throw new Error();
  }
};

export type IslandMap = {
  ids: IslandID[];
  offsets: number[];
};

export const buildIslandMap = (islands: Island[]): IslandMap => {
  const orderedIslands = [
    ...islands.filter(i => i.type === 'operations'),
    ...islands.filter(i => i.type === 'data'),
  ];

  const offsets: number[] = [];
  let currentOffset = 0;
  for (const island of orderedIslands) {
    offsets.push(currentOffset);
    currentOffset += getIslandLength(island);
  }

  return {
    ids: orderedIslands.map((i) => i.id),
    offsets,
  };
};

export const resolveIslandOperations = (
  operation: IslandOperation,
  map: IslandMap
): UserOperation => {
  switch (operation.type) {
    case 'island.reference':
      return { type: 's.push', value: map.offsets[map.ids.indexOf(operation.id)] }
    default:
      return operation;
  }
};
