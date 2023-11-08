import { UserOperation } from "../hardware/mod.ts";

export const createEmulator = () => {
  const stack: number[] = [];
  
  const runOperation = (op: UserOperation) => {
    switch (op.type) {
      case 's.push':
        stack.push(op.value)
        break;
      case 'a.add': {
        const a  = stack.pop() || 0;
        const b  = stack.pop() || 0;
        stack.push(a + b);
        break;
      }
    }
  }
  return { runOperation, stack };
};