import {
  isExpressionStatement,
  SourceFile,
  isVariableStatement,
  Expression,
  Statement,
  isLiteralExpression,
  isStringLiteral,
  isNumericLiteral,
  VariableDeclaration,
  Block,
isIdentifier,
isCallExpression,
} from "https://esm.sh/typescript@5.1.3";
import { CompilerGraphNode, graphGetVariable, graphOperation, graphOrder, graphSetVariable } from "./graph.ts";
import { exit, push, read, supervisor, write } from "../operations.ts";
import { Data, graphLoadDataAddress, graphLoadStringDataAddress } from "./data.ts";
import { JSValue, graphLoadNumber } from "./value.ts";
import { loadRuntimeOffsetAddress } from "./offset.ts";
import { graphStructFieldAddress } from "./struct.ts";
import { valueStructure } from "../runtime.ts";
import { graphMalloc } from "./allocator.ts";

export const graphSystemCall = (...args: CompilerGraphNode[]) => {
  return graphOperation(supervisor(),
    ...args,
  );
};

export const buildGraph = (file: SourceFile, data: Data): CompilerGraphNode => {
  const buildExpressionGraph = (expression: Expression): CompilerGraphNode => {
    if (isStringLiteral(expression)) {
      const entry = [...data.valueIndexMap.entries()]
        .find(([jsValue]) => isJSValueEqual(jsValue, { type: 'string', value: expression.text }));
      if (!entry)
        throw new Error();
        
      return graphLoadDataAddress(entry[1]);
    }
    if (isNumericLiteral(expression)) {
      const entry = [...data.valueIndexMap.entries()]
        .find(([jsValue]) => isJSValueEqual(jsValue, { type: 'number', value: Number(expression.text) }));
      if (!entry)
        throw new Error();
        
      return graphLoadDataAddress(entry[1]);
    }
    if (isIdentifier(expression)) {
      return graphGetVariable(expression.text);
    }
    if (isCallExpression(expression)) {
      if (isIdentifier(expression.expression)) {
        if (expression.expression.text === 'write')
          return graphSystemCall(
            ...expression.arguments
              .map(buildExpressionGraph)
              .map(graphLoadStringDataAddress)
          );
        if (expression.expression.text === 'malloc')
          return graphMalloc(
            graphLoadNumber(buildExpressionGraph(expression.arguments[0]))
          );
      }
    }
    return graphOperation(push(1));
  };
  const buildStatementGraph = (statement: Statement, nextStatement: CompilerGraphNode): CompilerGraphNode => {
    if (isExpressionStatement(statement)) {
      return graphOrder(
        graphOperation(
          write(),
          buildExpressionGraph(statement.expression),
          graphOperation(push(0)),
        ),
        nextStatement,
      );
    }
    if (isVariableStatement(statement)) {
      return statement.declarationList.declarations
        .toReversed()
        .reduce((nextDeclaration: CompilerGraphNode, declaration: VariableDeclaration) => {
          if (declaration.initializer && isIdentifier(declaration.name)) {
            return graphSetVariable(declaration.name.text,
              buildExpressionGraph(declaration.initializer),
              nextDeclaration,
            );
          }
          throw new Error("Variable must have initializer");
        }, nextStatement)
    }
    return nextStatement;
  };
  const buildBlockGraph = (source: SourceFile | Block): CompilerGraphNode => {
    return source.statements
      .toReversed()
      .reduce((nextStatement: CompilerGraphNode, statement: Statement): CompilerGraphNode => {
        return buildStatementGraph(statement, nextStatement)
      }, graphOperation(exit()));
  };

  return buildBlockGraph(file);
};

const isJSValueEqual = (a: JSValue, b: JSValue) => {
  return a.type === b.type && a.value === b.value;
}

export const findJSValues = (file: SourceFile): JSValue[] => {
  const findDataInExpression = (expression: Expression): JSValue[] => {
    if (isStringLiteral(expression)) {
      return [{ type: 'string', value: expression.text }];
    }
    if (isNumericLiteral(expression)) {
      return [{ type: 'number', value: Number(expression.text) }];
    }
    if (isCallExpression(expression)) {
      return expression.arguments
        .map(findDataInExpression)
        .flat(1);
    }
    return [];
  };
  const findDataInStatement = (statement: Statement): JSValue[] => {
    if (isExpressionStatement(statement)) {
      return findDataInExpression(statement.expression);
    }
    if (isVariableStatement(statement)) {
      return statement.declarationList.declarations
        .map(declaration => {
          if (declaration.initializer) {
            return findDataInExpression(declaration.initializer);
          }
          return [];
        }).flat(1);
    }
    return [];
  };

  return file.statements
    .map(findDataInStatement)
    .flat(1);
};