import { MachineProgramCompilation } from "./compiler.ts";
import { dump } from "./memory.ts";
import {
  MachineOperation, add, dup, encodeOperation,
  exit, peek, push, read, swap, write
} from "./operations.ts";
import { MachineExecutable } from "./system.ts";

export type RuntimeStruct = ReadonlyArray<readonly [string]>;
export type RuntimeEnum = [string, number][];

export const arrayStructure: RuntimeStruct = [
  ['length'],
];
export const valueStructure = [
  ['type'],
  ['value']
] as const;

// The "Runtime Structure" contains global information
// about code state: such as the allocator and
// referenceto to static data blocks
export const runtimeStructure = [
  ['allocationOffset'],
  ['lookupOffset'],
  ['dataOffset'],
  ['programOffset'],
] as const;

export const runtimeStackStructure = [
  ['lookupAddress'],
  ['dataAddress'],
] as const;

const calculateLookup = (blocks: number[][]) => {
  let offset = 0;
  const offsets: number[] = [];
  for (const block of blocks) {
    offsets.push(offset);
    offset += block.length;
  }
  return offsets;
};

export const link = (
  compilation: MachineProgramCompilation
): MachineExecutable => {
  const data = compilation.dataBlocks.flat(1);
  const lookup = calculateLookup(compilation.dataBlocks);
  const program = compilation.operations.map(encodeOperation).flat(1);

  const companionStructures = [
    data,
    lookup,
    program,
  ];
  const companionBytes = companionStructures.flat(1);
  const [
    dataOffset,
    lookupOffset,
    programOffset,
  ] = calculateLookup(companionStructures);

  const runtimeBytesLength = getStructLength(runtimeStructure);

  const programAddress = data.length + lookup.length + 1;

  const runtime = getStructBytes(runtimeStructure, {
    programOffset: programOffset - companionBytes.length,
    lookupOffset: lookupOffset - companionBytes.length,
    dataOffset: dataOffset - companionBytes.length,
    allocationOffset: runtimeBytesLength
  })

  const memory = [
    // first byte is "runtime address"
    companionBytes.length + 1,
    companionBytes,
    runtime,
    Array.from({ length: 1024 * 1024 }).map(_ => 0),
  ].flat(1);
  return { memory, entry: programAddress }
};

export const getStructFieldIndex = (structure: RuntimeStruct, fieldName: string): number => {
  const index = structure.findIndex(([stuctureFieldName]) => stuctureFieldName === fieldName);
  if (index === -1)
    throw new Error();
  return index;
}

/** stack: [] => [length] */
export const encodeTypeLength = (structure: RuntimeStruct): MachineOperation[] => {
  return [
    push(structure.length)
  ].flat(1);
};

/** stack: [byteCount, runtimeAddress] => [allocatedAddress] */
export const encodeAllocate = (): MachineOperation[] => {
  return [
    dup(),
    encodeReadStructField(runtimeStructure, 'allocationOffset'),
    // [byteCount, runtimeAddress, allocOffset]
    dup(),
    push(3),
    peek(),
    add(),
    // [byteCount, runtimeAddress, allocOffset, nextAllocOffset]
    push(2),
    peek(),
    encodeWriteStructField(runtimeStructure, 'allocationOffset'),
    // [byteCount, runtimeAddress, allocOffset]
    add(),
    swap(),
    encodeDiscard(),
    // [allocOffset]
  ].flat(1);
}

/** stack: [] => [address] */
export const encodeReadData = (runtimeAddress: number, dataIndex: number): MachineOperation[] => {
  return [
    push(runtimeAddress),
    encodeReadStructField(runtimeStructure, 'dataBlocks'),
    push(dataIndex),
    encodeReadArrayIndex(),
  ].flat(1);
}

/** stack: [structAddress] => [value] */
export const encodeReadStructField = (structure: RuntimeStruct, fieldName: string): MachineOperation[] => {
  const index = getStructFieldIndex(structure, fieldName);
  
  return [
    push(index),
    add(),
    read(),
  ].flat(1);
}
/** stack: [value, structAddress] => [] */
export const encodeWriteStructField = (structure: RuntimeStruct, fieldName: string): MachineOperation[] => {
  const index = getStructFieldIndex(structure, fieldName);

  return [
    push(index),
    add(),
    swap(),
    write(),
  ].flat(1);
}

/** stack: [arrayAddress, index] => [value] */
export const encodeReadArrayIndex = (): MachineOperation[] => {
  return [
    add(),
    read(),
  ].flat(1);
};

/** stack: [value, arrayAddress, index] => [] */
export const encodeWriteArrayIndex = (): MachineOperation[] => {
  return [
    add(),
    swap(),
    write(),
  ]
};

/** stack: [stackOffset] => [value] */
export const encodeReadStackStructureField = (
  structure: RuntimeStruct,
  fieldName: string
): MachineOperation[] => {
  const index = getStructFieldIndex(structure, fieldName);
  const length = structure.length - 1;
  
  return [
    push(length - index),
    add(),
    peek(),
  ].flat(1);
};

/*:: stack: [] => [...structValues] */
export const encodePushStackStructure = (
  structure: RuntimeStruct,
  structureData: { [key in string]: number }
): MachineOperation[] => {
  const bytes = getStructBytes(structure, structureData)

  return [
    bytes.map(byte => push(byte)),
  ].flat(1);
}

export const getStructBytes = <T extends RuntimeStruct>(
  structure: T,
  structureData: { [key in T[number][0]]: number }
): number[] => {
  return structure.map(([field]) => structureData[(field as T[number][0])] || 0);
}

export const getStructLength = (structure: RuntimeStruct) => {
  return structure.length;
}

/** stack: [programstart] => [runtimestructaddress] */
export const encodeRuntimeInitialization = (): MachineOperation[] => {
  return [
    dup(), // [programstart, programstart]
    read(), // [programstart, runtimestructoffset]
    add(),
    // [runtimestructaddress]
    
    encodePushStackStruct(runtimeStackStructure, {
      lookupAddress: (depth) => [
        push(depth),
        peek(),
        dup(),
        encodeReadStructField(runtimeStructure, 'lookupOffset'),
        add(),
      ].flat(1),
      dataAddress: (depth) => [
        push(depth),
        peek(),
        dup(),
        encodeReadStructField(runtimeStructure, 'dataOffset'),
        add(),
      ].flat(1)
    }),
  ].flat(1);
}

/**:: [] =>  */
export const encodePushStackStruct = <T extends RuntimeStruct>(
  structure: T,
  loadField: { [key in T[number][0]]: (depth: number) => MachineOperation[] },
): MachineOperation[] => {
  return [
    structure
      .map(([fieldname], index) =>
        loadField[fieldname as T[number][0]](index)
      )
      .flat(1)
  ].flat(1);
}

/** stack: [dataIndex] => [dataAddress] */
export const encodeLoadDataAddress = (runtimeDepth: number): MachineOperation[] => {
  return [
    push(runtimeDepth),
    encodeReadStackStructureField(runtimeStackStructure, 'lookupAddress'),
    add(),
    read(),

    push(runtimeDepth),
    encodeReadStackStructureField(runtimeStackStructure, 'dataAddress'),
    add(),
  ].flat(1);
};
