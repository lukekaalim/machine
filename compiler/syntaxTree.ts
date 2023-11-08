import {
  isExpressionStatement,
  SourceFile,
  isVariableStatement,
  Expression,
  Statement,
  isStringLiteral,
  isNumericLiteral,
  Block,
  isIdentifier,
  isCallExpression,
} from "https://esm.sh/typescript@5.1.3";
import { nanoid } from 'https://deno.land/x/nanoid@v3.0.0/mod.ts';
import {
  CompilerGraphNode,
  graphGetVariable,
  graphOperation,
  graphOrder,
  graphSetVariable,
  graph,
} from "./graph.ts";
import { exit, push, supervisor, write } from "../operations.ts";
import {
  Data,
  graphLoadDataAddress,
  graphLoadStringDataAddress,
} from "./data.ts";
import { JSValue, graphLoadNumber, graphAllocateNumberValue } from "./value.ts";
import { graphAllocateRuntimeMemory } from "./runtime.ts";
import { graphMallocIncrements } from './internalFunctions/mod.ts';

export const graphSystemCall = (...args: CompilerGraphNode[]) => {
  return graphOperation(supervisor(), ...args);
};

export const buildGraph = (file: SourceFile, data: Data): CompilerGraphNode => {
  const buildExpressionGraph = (expression: Expression): CompilerGraphNode => {
    if (isStringLiteral(expression)) {
      const entry = [...data.valueIndexMap.entries()].find(([jsValue]) =>
        isJSValueEqual(jsValue, { type: "string", value: expression.text })
      );
      if (!entry) throw new Error();

      return graphLoadDataAddress(entry[1]);
    }
    if (isNumericLiteral(expression)) {
      const entry = [...data.valueIndexMap.entries()].find(([jsValue]) =>
        isJSValueEqual(jsValue, {
          type: "number",
          value: Number(expression.text),
        })
      );
      if (!entry) throw new Error();

      return graph.labelStart(graphLoadDataAddress(entry[1]), {
        type: 'syntax',
        syntaxNode: expression
      }, nanoid())
    }
    if (isIdentifier(expression)) {
      return graphGetVariable(expression.text);
    }
    if (isCallExpression(expression)) {
      if (isIdentifier(expression.expression)) {
        if (expression.expression.text === "write")
          return graphSystemCall(
            ...expression.arguments
              .map(buildExpressionGraph)
              .map(graphLoadStringDataAddress)
          );
        if (expression.expression.text === "malloc")
          return graphAllocateNumberValue(
            graphAllocateRuntimeMemory(
              graphLoadNumber(buildExpressionGraph(expression.arguments[0]))
            )
          );
        if (expression.expression.text === "test")
          return graphMallocIncrements();
      }
    }
    return graphOperation(push(1));
  };
  const buildStatementGraph = (
    statement: Statement,
    nextStatement: CompilerGraphNode
  ): CompilerGraphNode => {
    if (isExpressionStatement(statement)) {
      return graphOrder(
        graphOperation(
          write(),
          graphOperation(push(0)),
          buildExpressionGraph(statement.expression),
        ),
        nextStatement
      );
    }
    if (isVariableStatement(statement)) {
      return [...statement.declarationList.declarations]
        .reverse()
        .reduce((nextDeclaration, declaration) => {
          if (declaration.initializer && isIdentifier(declaration.name)) {
            return graphSetVariable(
              declaration.name.text,
              buildExpressionGraph(declaration.initializer),
              nextDeclaration
            );
          }
          throw new Error("Variable must have initializer");
        }, nextStatement);
    }
    return nextStatement;
  };
  const buildBlockGraph = (source: SourceFile | Block): CompilerGraphNode => {
    return [...source.statements]
      .reverse()
      .reduce(
        (
          nextStatement: CompilerGraphNode,
          statement: Statement
        ): CompilerGraphNode => {
          const labelId = nanoid();
          return graph.labelStart(
            buildStatementGraph(statement, graph.labelEnd(nextStatement, labelId)),
            { type: 'syntax', syntaxNode: statement },
            labelId,
          );
        },
        graphOperation(exit())
      );
  };

  return graph.labelStart(
    buildBlockGraph(file),
    { type: 'syntax', syntaxNode: file }, 
    nanoid()
  );
};

const isJSValueEqual = (a: JSValue, b: JSValue) => {
  return a.type === b.type && a.value === b.value;
};

export const findJSValues = (file: SourceFile): JSValue[] => {
  const findDataInExpression = (expression: Expression): JSValue[] => {
    if (isStringLiteral(expression)) {
      return [{ type: "string", value: expression.text }];
    }
    if (isNumericLiteral(expression)) {
      return [{ type: "number", value: Number(expression.text) }];
    }
    if (isCallExpression(expression)) {
      return expression.arguments.map(findDataInExpression).flat(1);
    }
    return [];
  };
  const findDataInStatement = (statement: Statement): JSValue[] => {
    if (isExpressionStatement(statement)) {
      return findDataInExpression(statement.expression);
    }
    if (isVariableStatement(statement)) {
      return statement.declarationList.declarations
        .map((declaration) => {
          if (declaration.initializer) {
            return findDataInExpression(declaration.initializer);
          }
          return [];
        })
        .flat(1);
    }
    return [];
  };

  return file.statements
    .map(findDataInStatement)
    .flat(1);
};
