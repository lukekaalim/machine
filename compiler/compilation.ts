import { ScriptTarget, createSourceFile } from "https://esm.sh/typescript@5.1.3";
import { MachineExecutable } from "../system.ts";
import { buildGraph, findJSValues } from "./syntaxTree.ts"
import { Data, buildData, generateDataBytes } from "./data.ts";
import { getStructBytes, runtimeStructure } from "../runtime.ts";
import { CompilerGraphNode, CompilerGraphState, compileGraph } from "./graph.ts";
import { graphRuntimeInitialisation, vars } from "./runtime.ts";
import { encodeOperation } from "../operations.ts";

export type CompilationResult = {
  data: Data,
  programGraph: CompilerGraphNode,
  executable: MachineExecutable,
  runtimeValues: { [prop: string]: number }
};

export const generateCompilation = (sourceCode: string): CompilationResult => {
  const sourceFile = createSourceFile("sourcecode.ts", sourceCode, ScriptTarget.Latest);

  const jsValues = findJSValues(sourceFile);
  const data = buildData(jsValues, runtimeStructure.length);
  const dataBytes = generateDataBytes(data);
  const sourceGraph = buildGraph(sourceFile, data);
  
  const programGraph = graphRuntimeInitialisation(sourceGraph);
  const graphState: CompilerGraphState = {
    stackDepth: 1,
    stackVariables: new Map([[vars.execAddress, 0]])
  };

  const programBytes = compileGraph(programGraph, graphState)
    .map(encodeOperation)
    .flat(1)

  const runtimeValues = {
    lookupOffset: data.lookupRuntimeOffset,
    dataOffset: data.blockRuntimeOffset,
    programOffset: runtimeStructure.length + dataBytes.length,
    allocationOffset: runtimeStructure.length + dataBytes.length + programBytes.length,
  } as const;

  const runtimeStructureBytes = getStructBytes(runtimeStructure, runtimeValues);

  const memory: number[] = [
    ...runtimeStructureBytes,
    ...dataBytes,
    ...programBytes,
    // and some free memory from the allocator!
    Array.from({ length: 1024 }).map(() => 0),
  ].flat(1)

  const entry = runtimeStructure.length + dataBytes.length;

  const executable: MachineExecutable = {
    memory,
    entry
  };
  return {
    executable,
    programGraph,
    runtimeValues,
    data,
  };
};