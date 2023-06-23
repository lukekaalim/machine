export const withLoadedStack = (depth: number, operations, runWithStack) => {
  return [
    operations,
    runWithStack(depth + 1)
  ]
};