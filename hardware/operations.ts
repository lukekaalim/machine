// User Permissions

export type StackOperation =
  | { type: 'push', value: number }
  | { type: 'discard' }
  | { type: 'peek' }

export type ArithmeticOperation =
  | { type: 'add' }
  | { type: 'mult' }
  | { type: 'div' }
  | { type: 'pow' }
  | { type: 'root' }
  | { type: 'shift' }

export type BranchOperation =
  | { type: 'jump' }

export type MemoryOperation =
  | { type: 'store' }
  | { type: 'load' }

export type SupervisorOperation =
  | { type: 'exit' } // yield and stop program
  | { type: 'super' } // yield, but expect continuation later

export type UserOperation =
  | StackOperation
  | ArithmeticOperation
  | BranchOperation
  | MemoryOperation
  | SupervisorOperation

// Kernel Permissions

export type MemoryManagerOperation =
  | { type: 'new-page' }
  | { type: 'set-pages' }

export type SecurityOperation =
  | { type: 'userspace' }

export type KernelOperation =
  | MemoryManagerOperation
  | SecurityOperation