import tsPlugin from "https://esm.sh/acorn-typescript@1.3.1";
import { Parser } from "https://esm.sh/acorn@8.8.2";
import {
  BinaryExpression, CallExpression, Expression,
  Program, Statement, UnaryExpression, VariableDeclaration, VariableDeclarator
} from "https://esm.sh/v124/@types/estree@1.0.1/index.d.ts";

import { encodeDiscard, encodeWriteFile } from "./hello_world.ts";
import { MachineOperation, add, decodeOperation, dup, encodeOperation, exit, jump, mult, peek, push, read, swap, write } from "./operations.ts";
import { fsSyscallStructure, runProgram, systemStateStructure } from "./system.ts";
import { encode } from "https://deno.land/std@0.50.0/encoding/utf8.ts";
import { RuntimeStruct, encodeAllocate, encodeLoadDataAddress, encodeReadStructField, encodeRuntimeInitialization, encodeTypeLength, encodeWriteStructField, runtimeStackStructure, runtimeStructure, valueStructure } from "./runtime.ts";

export type MachineProgramCompilation = {
  strings: Map<string, number>,
  numbers: Map<number, number>,

  variables: string[],
  typedValue: { type: number, dataBlockIndex: number }[],

  dataBlocks: number[][],
  operations: MachineOperation[],
};

const TYPES = {
  number: 1,
  string: 2,
}

export const generateRuntimeStructureBytes = (
  { dataBlocks }: MachineProgramCompilation,
): number[] => {
  const lengths = dataBlocks.map(db => db.length);

  const endOffsets: number[] = [];
  for (let i = 0; i < lengths.length; i++)
    endOffsets[i] = (endOffsets[i - 1] || 0) + lengths[i];

  const bytes = [
    // allocation address: 1 byte
    2 + endOffsets.length,
    // 1 byte
    dataBlocks.length,
    // dataBlocks.length bytes
    endOffsets.map(offset =>
      offset + 2 + endOffsets.length),
    // offsets[offsets.length -1] bytes
    dataBlocks.flat(1),
    // some data
    Array.from({ length: 1024 * 1024 }).map(() => 0),
  ].flat(1);

  return bytes;
};

//const getRuntimeStructure

export const compile = (
  sourceCode: string
): MachineProgramCompilation => {
  const parser = Parser.extend(tsPlugin());

  const program = parser.parse(sourceCode, { 
    sourceType: 'module',
    ecmaVersion: 14,
    locations: true
  });
  const compilation: MachineProgramCompilation = {
    strings: new Map(),
    numbers: new Map(),
    variables: [],
    typedValue: [],

    dataBlocks: [],
    operations: []
  };

  const assignDataBlock = (bytes: number[]): number => {
    return compilation.dataBlocks.push(bytes) - 1;
  }
  const findTypedValueIndex = (type: number, dataBlockIndex: number) => {
    const prevIndex = compilation.typedValue
      .findIndex(tv => tv.type === type && tv.dataBlockIndex === dataBlockIndex);
    if (prevIndex !== -1)
      return prevIndex;
    return compilation.typedValue.push({ type, dataBlockIndex }) - 1;
  }
  const findStringValueDataIndex = (value: string): number => {
    const existingDataIndex = compilation.strings.get(value);
    if (existingDataIndex)
      return existingDataIndex;

    const bytes = encode(value);
    const rawStringIndex = assignDataBlock([bytes.length, ...bytes])
    const valueIndex = assignDataBlock([0, rawStringIndex]);

    compilation.strings.set(value, valueIndex);
    
    return valueIndex;
  }
  const findNumberValueDataIndex = (value: number): number => {
    const existingDataIndex = compilation.numbers.get(value);

    const dataIndex = existingDataIndex === undefined
      ? assignDataBlock([TYPES.number, value])
      : existingDataIndex;

    compilation.numbers.set(value, dataIndex);

    return findTypedValueIndex(TYPES.number, dataIndex);
  }
  
  const compileProgram = (program: Program): MachineOperation[] => {
    return [
      encodeRuntimeInitialization(),
      program.body
        .map(statement => compileStatement(statement as any))
        .flat(1),
      exit(),
    ].flat(1);
  }
  const compileStatement = (statement: Statement): MachineOperation[] => {
    switch (statement.type) {
      case 'ExpressionStatement':
        return [
          compileExpression(statement.expression, compilation.variables.length),
          encodeDiscard(),
        ].flat(1);
      case 'VariableDeclaration':
        return compileVariableDeclarationStatement(statement);
      default:
        throw new Error(statement.type);
    }
  };
  const compileVariableDeclarationStatement = (statement: VariableDeclaration): MachineOperation[] => {
    return statement.declarations
      .map(declaration => compileVariableDeclarator(declaration))
      .flat(1);
  };
  const compileVariableDeclarator = (declarator: VariableDeclarator): MachineOperation[] => {
    const { id } = declarator;
    if (id.type !== 'Identifier')
      throw new Error();
    if (!declarator.init)
      throw new Error();

    compilation.variables.push(id.name);
    
    return [
      compileExpression(declarator.init, compilation.variables.length - 1),
    ].flat(1);
  };
  const compileExpression = (
    expression: Expression,
    depth = 0
  ): MachineOperation[] => {
    switch (expression.type) {
      case 'CallExpression':
        return compileCallExpression(expression, depth);
      case 'BinaryExpression':
        return compileBinaryExpression(expression);
      case 'UnaryExpression':
        return compileUnaryExpression(expression);
      case 'Identifier': {
        const identifierIndex = compilation.variables.indexOf(expression.name);
        if (identifierIndex === -1)
          throw new Error();
        return [
          push(identifierIndex),
          encodeLoadDataAddress(depth + 1),
        ].flat(1);
      }
      case 'Literal':
        switch (typeof expression.value) {
          case 'number':
            return [
              push(findNumberValueDataIndex(expression.value)),
              encodeLoadDataAddress(depth + 1),
            ].flat(1);
          case 'string': 
            return [
              push(findStringValueDataIndex(expression.value)),
              encodeLoadDataAddress(depth + 1),
            ].flat(1);
          default:
            throw new Error(typeof expression.value);
        }
      default:
        throw new Error(expression.type);
    }
  };
  /** stack: [address] => [number] */
  const compileLoadNumber = (): MachineOperation[] => {
    return [
      encodeReadStructField(valueStructure, 'value'),
    ].flat(1)
  }
  const compileBinaryExpression = (
    expression: BinaryExpression,
    depth = 0,
  ): MachineOperation[] => {
    switch (expression.operator) {
      case '+':
        return [
          compileExpression(expression.left),
          compileLoadNumber(),
          compileExpression(expression.right),
          compileLoadNumber(),
          add(),
        ].flat(1);
      case '-':
        return [
          compileExpression(expression.left),
          compileLoadNumber(),
          push(-1),
          compileExpression(expression.right),
          compileLoadNumber(),
          mult(),
          add(),
        ].flat(1);
      case '*':
        return [
          compileExpression(expression.left),
          compileLoadNumber(),
          compileExpression(expression.right),
          compileLoadNumber(),
          mult(),
        ].flat(1);
      default:
        throw new Error(expression.operator);
    }
  }
  const compileUnaryExpression = (expression: UnaryExpression): MachineOperation[] => {
    switch (expression.operator) {
      case '-':
        return [
          compileExpression(expression.argument),
          compileLoadNumber(),
          push(-1),
          mult(),
        ].flat(1);
      default:
        throw new Error(expression.operator);
    }
  }

  const compileAllocCall = (call: CallExpression, depth: number) => {
    if (call.arguments[0].type === 'SpreadElement')
      throw new Error(`Spread not supported`);

    return [
      compileExpression(call.arguments[0], depth),
      encodeLoadDataAddress(depth + 1),
      compileLoadNumber(),
      // [bytesToAllocate]
      push(depth + 1 + runtimeStackStructure.length),
      peek(),

      // [bytesToAllocate, runtimeAddress]
      encodeAllocate(),
      // [allocatedAddress]

      push(2),
      push(depth + 2 + runtimeStackStructure.length),
      peek(),
      encodeAllocate(),
      // [allocatedAddress, valueAddress]
      dup(),
      push(1),
      swap(),
      // [allocatedAddress, valueAddress, 1, valueAddress]
      encodeWriteStructField(valueStructure, 'type'),
      // [allocatedAddress, valueAddress]
      swap(),
      push(1),
      peek(),
      // [valueAddress, allocatedAddress, valueAddress]
      encodeWriteStructField(valueStructure, 'value'),
      // [valueAddress]
    ].flat(1);
  };
  const compileJumpCall = (call: CallExpression, depth: number) => {
    if (call.arguments[0].type === 'SpreadElement')
      throw new Error(`Spread not supported`);

    return [
      compileExpression(call.arguments[0], depth),
      compileLoadNumber(),
      push(1),
      swap(),
      jump(),
    ].flat(1);
  }
  const compileWriteFileCall = (call: CallExpression, depth: number): MachineOperation[] => {
    const [filenameArg, valueArg] = call.arguments;
    if (filenameArg.type === 'SpreadElement' || valueArg.type === 'SpreadElement')
      throw new Error(`Spread not supported`);

    return [
      push(fsSyscallStructure.length),
      // load runtime
      push(depth + runtimeStackStructure.length + 1),
      peek(),
      encodeAllocate(),
      // [structure address]

      dup(),
      compileExpression(filenameArg, depth + 2),
      encodeReadStructField(valueStructure, 'value'),
      encodeLoadDataAddress(depth + 3),
      swap(),
      encodeWriteStructField(fsSyscallStructure, 'nameAddress'),

      dup(),
      compileExpression(valueArg, depth + 2),
      encodeReadStructField(valueStructure, 'value'),
      encodeLoadDataAddress(depth + 3),
      dup(),
      read(),
      swap(),
      push(1),
      add(),

      push(2),
      peek(),
      encodeWriteStructField(fsSyscallStructure, 'bytesAddress'),

      swap(),
      encodeWriteStructField(fsSyscallStructure, 'bytesLength'),
      /*
      dup(),
      compileExpression(valueArg, depth + 3),
      encodeReadStructField(valueStructure, 'value'),
      encodeLoadDataAddress(depth + 4),
      // [structureAddress, structureAddress, rawStringAddress]
      dup(),
      push(1),
      add(),
      encodeWriteStructField(fsSyscallStructure, 'bytesAddress'),
      read(),
      encodeWriteStructField(fsSyscallStructure, 'bytesLength'),
      */
      dup(),
      push(1),
      swap(),
      encodeWriteStructField(fsSyscallStructure, 'type'),

      push(systemStateStructure.findIndex(([field]) => field === 'systemCallArgumentAddress')),
      swap(),
      write(),
      push(0),
    ].flat(1);
  };

  const compileCallExpression = (
    expression: CallExpression,
    depth = 0
  ): MachineOperation[] => {
    const { callee } = expression;
    if (callee.type !== 'Identifier')
      throw new Error();

    if (callee.name === 'alloc')
      return compileAllocCall(expression, depth);
    if (callee.name === 'jump')
      return compileJumpCall(expression, depth);
    if (callee.name === 'write')
      return compileWriteFileCall(expression, depth);

    const [loadNameOperations, loadValueOperations] = expression.arguments
      .map(expression => compileExpression(expression as any));


    if (
      expression.callee.type !== 'Identifier' ||
      expression.callee.name !== 'write' && expression.callee.name !== 'read'
    )
      throw new Error(expression.callee.type);

    return [
      // dynamic allocate
      push(fsSyscallStructure.length + 1),
      //encodeAllocate(runtimeAddress),
        dup(),
        push(expression.callee.name === 'write' ? 1 : 2),
          write(),
      push(1),
      add(),

      // stack: [syscall pointer]
      dup(),
      loadNameOperations,
      encodeWriteStructField(fsSyscallStructure, 'nameAddress'),

      dup(),
      loadValueOperations,
      push(1),
      add(),
      encodeWriteStructField(fsSyscallStructure, 'bytesAddress'),

      dup(),
      push(1337),
      encodeWriteStructField(fsSyscallStructure, 'bytesLength'),

      dup(),
      push(0),
      encodeWriteStructField(fsSyscallStructure, 'callbackAddress'),

      push(-1),
      add(),
      push(1),
      swap(),
      write(),

      push(0),
    ].flat(1);
  }

  compilation.operations = compileProgram(program as any);

  return compilation;
};

//runProgram(program);