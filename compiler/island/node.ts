import { MachineOperation } from "../../hardware/mod.ts";

export type IslandEntry =
  | { type: 'op', operation: MachineOperation }
  | { type: 'push-label', islandId: string }

export type Island = {
  id: string,
  code: IslandEntry[],
};
