import { decode } from "https://deno.land/std@0.50.0/encoding/utf8.ts";
import { MachineState } from "../machine.ts";
import { SystemOperation } from "../system.ts";

const fsWriteSyscallStruct = [
  ['type'],
  ['nameAddress'],
  ['bytesAddress'],
  ['bytesLength'],
  ['callbackAddress']
] as const;

export const handleSystemCall = (systemCall: SystemOperation, state: MachineState) => {
  switch (systemCall.type) {
    case 'writefile': {
      const filenameBytes = Uint8Array.from(state.memory.slice(
        systemCall.nameAddress + 1,
        systemCall.nameAddress + 1 + state.memory[systemCall.nameAddress]
      ));
      const filename = decode(filenameBytes);
      const contentBytes = Uint8Array.from(state.memory.slice(
        systemCall.bytesAddress,
        systemCall.bytesAddress + systemCall.bytesLength
      ));
      if (filename === 'std://out')
        console.log(decode(contentBytes));
      else
        Deno.writeFile(filename, Uint8Array.from(contentBytes));
      console.log(`Writing to ${filename}`);
      return;
    }
    default:
      return;
  }
};