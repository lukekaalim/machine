# Compiler

## Process

  1. Syntax Tree Parsing. Done by the actual typescript compiler - ez.
  2. Compiler Graph (first stage). Source code is converted into
  the tree.
  3. Flat Graph (second stage). Compiler Graph is flattened into
  flat islands of instructions with labels.
  4. Linking (third stage). Labels are resolved

## Graph

Transform abstract syntax tree into CompilerGraph.

## Compiler Graph

Represents relationships between MachineOperations. Each node
resolves to a set of operations that load zero or more values
on the stack, optionally consuming stack values provided are arguments.

## Stack Variables

## Syntax Tree

Transform a syntax tree into a compiler graph.