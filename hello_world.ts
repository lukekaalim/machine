import { encode } from "https://deno.land/std@0.50.0/encoding/utf8.ts";

import { encodeSystemOperation, runProgram } from "./system.ts";
import { MachineOperation, add, dup, encodeOperation, exit, jump, nullary, peek, push, read, swap, write } from "./operations.ts";

export const encodePushBytes = (bytes: Uint8Array | number[]): MachineOperation[] => {
  return [...bytes]
    .map(byte => ({ type: 'push', value: byte }) as const)
    .flat(1);
};

const encodeWriteStackToMemory = (address: number, length = 1): MachineOperation[] => {
  return Array.from({ length })
    .map((_, index) => [
      { type: 'push', value: address + index } as const,
      { type: 'write' } as const
    ])
    .flat(1);
};

const encodeWriteBytesToAddress = (bytes: number[]): MachineOperation[] => {
  return [
    [...bytes]
      .map((byte, index) => [
        dup(),
        push(index),
        add(),
        push(byte),
        write(),
      ])
      .flat(1),
    push(0),
    nullary('swap'),
    nullary('write'),
  ].flat(1)
};

// stack: [baseAddress]
export const encodeWriteArray = (bytes: number[]): MachineOperation[] => {
  return [
    dup(),
    push(bytes.length),
    write(),
    encodeCalculateOffset(1),
    encodeWriteBytesToAddress(bytes),
  ].flat(1);
}

/** 
 * stack: [callbackAddress, bytesLength, bytesAddress, baseAddress]
 *  */
export const encodeWriteFile = (name: string): MachineOperation[] => {
  const nameBytes = [...encode(name)];

  return [
    // write on baseAddress+0
    encodeWriteArray(nameBytes),

    // write on baseAddress+nameBytes
    dup(),
    push(nameBytes.length + 1),
    add(),
    
      // Write syscall type
      dup(),
      push(1),
      write(),

      // write name address
      dup(),
      push(1),
      add(),

      push(3),
      peek(),
      write(),

      // write bytes address
      dup(),
      push(2),
      add(),

      push(4),
      peek(),
      write(),

      // write bytes length
      dup(),
      push(3),
      add(),

      push(5),
      peek(),
      write(),

      // write callback address
      dup(),
      push(4),
      add(),

      push(6),
      peek(),
      write(),

    encodeDiscard(),

    push(nameBytes.length + 1),
    add(),
    push(1),
    swap(),

    write(),

    encodeDiscard(),
    encodeDiscard(),
    encodeDiscard(),
    encodeDiscard(),
  ].flat(1);
}

// stack: [valueToWrite, baseAddress]
export const writeStackAtOffset = () => {

}

export const encodeCalculateOffset = (offset: number) => [
  nullary('dup'),
  push(offset),
  nullary('add'),
].flat(1);

export const encodeDiscard = (): MachineOperation[] => [
  push(0),
  swap(),
  write(),
];

// target address is on stack
export const encodePrint = (message: string): MachineOperation[] => {
  const messageBytes = [...encode(message)];
  const stdoutbytes = [...encode('std://out')];
  const syscallBytes = encodeSystemOperation({
    type: 'writefile',
    nameAddress: 0,
    bytesAddress: 0,
    bytesLength: messageBytes.length,
    callbackAddress: 0,
  });

  return [
    // Push the actual data
    encodeCalculateOffset(0),
    encodeWriteBytesToAddress(messageBytes),

    // Push the name data
    encodeCalculateOffset(messageBytes.length),
    encodeWriteBytesToAddress([stdoutbytes.length]),

    encodeCalculateOffset(messageBytes.length + 1),
    encodeWriteBytesToAddress(stdoutbytes),

    // Push the syscall struct
    encodeCalculateOffset(messageBytes.length + 1 + stdoutbytes.length),
    encodeWriteBytesToAddress(syscallBytes),

    // (and cheekily rewrite with offsets)
    // name address
    dup(),
    encodeCalculateOffset(messageBytes.length + 1 + stdoutbytes.length + 1),
    swap(),

    encodeCalculateOffset(messageBytes.length),
    swap(),
    push(0),
    swap(),
    write(),
    write(),

    // bytes address
    dup(),
    encodeCalculateOffset(messageBytes.length + 1 + stdoutbytes.length + 2),
    swap(),
    encodeCalculateOffset(0),
    swap(),
    push(0),
    swap(),
    write(),
    write(),

    // invoke syscall
    encodeCalculateOffset(messageBytes.length + 1 + stdoutbytes.length),
    push(1),
    nullary('swap'),
    nullary('write'),
  ].flat(1);
};

export const encodeWithPushedOffset = (offset: number, operations: MachineOperation[]) => {
  return [
    // push offset
    push(3),
    read(),
    push(offset),
    add(),
    // run ops
    operations,
    // pop offset
    push(0),
    swap(),
    write(),
  ].flat(1);
}

const program: MachineOperation[] = [
  push(3),
  read(),

  push(10),
  nullary('add'),
  encodePrint("Greetings, mortals!"),
  push(0),
  swap(),
  write(),

  // counter @ address 0
  push(3),
  read(),
  // push counter initial value
  push(-10),
  write(),
  

  // loop code @ address 4000
  push(3),
  read(),
  push(4000),
  add(),
  encodeWriteBytesToAddress([
    encodeWithPushedOffset(10, [
      encodePrint("Loop!"),
    ].flat(1)),

    // read condition
    push(3),
    read(),
    read(),
    // get destination
    push(3),
    read(),
    push(7000),
    add(),

    // jump to exit if condition === 1 met
    jump(),

    // otherwise

    // increment counter
    push(3),
    read(),
    dup(),
    read(),
    push(1),
    add(),
    write(),

    // restart loop
    push(1),
    push(3),
    read(),
    push(4000),
    add(),
    jump(),
    // emergency exit
    exit(),
  ].flat(1).map(encodeOperation).flat(1)),


  // exit code @ address 7000
  push(3),
  read(),
  push(7000),
  add(),
  encodeWriteBytesToAddress([
    encodeWithPushedOffset(10, [
      encodePrint("Exiting!"),
    ].flat(1)),
    exit(),
  ].flat(1).map(encodeOperation).flat(1)),

  // force loop
  push(1),
  // get address
  push(3),
  read(),
  push(4000),
  add(),
  // jump to loop
  jump(),
  
  nullary('exit')
].flat(1);

//runProgram(program);
