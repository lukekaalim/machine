# Operations

Each operations is a single or pair of 64bit Floating Point Numbers
(`double`'s), encoding an operation type and (optionally) a value. An
operation's type determine how many floating points it consists of.

#### Operations that use Value

| Operation Type         | Uses Value |
| ---------------------- | ---------- |
| `s.push`               | Yes        |
| All other instructions | No         |

## Stack Operations

| name      | type |
| --------- | ---- |
| `s.push`  | `0`  |
| `s.point` | `1`  |
| `s.get`   | `2`  |
| `s.set`   | `3`  |

#### `s.push`

> Increases stack pointer by 1

Increment the stack pointer by 1, and write the operation's value into the stack
at the stack pointer's current position.

#### `s.point`

> Moves stack pointer

Read the current stack value (assigned `$move-distance`), and decrement the
stack pointer by 1.

Move the stack pointer by `$move-distance`. A positive number moves the stack
"upwards" into uninitialized space, whereas a negative number "reduces" the
stack "downwards".

#### `s.get`

> Stack pointer is unchanged

Read the current stack value (assigned `$get-distance`), and decrement the stack
pointer by 1.

Read the stack value located at `$stack-pointer - $get-distance` (assigned
`$result`).

Increment the stack pointer by 1, and write `$result` into the stack at the
stack pointer's current position.

#### `s.set`

> Reduces stack pointer by 2

Read the current stack value (assigned `$set-value`), and decrement the stack
pointer by 1.

Read the current stack value (assigned `$set-distance`), and decrement the stack
pointer by 1.

Set the stack value located at `$stack-pointer - $set-distance` to `$set-value`.

## Arithmatic Operations

| name     | type |
| -------- | ---- |
| `a.add`  | `4`  |
| `a.mult` | `5`  |

#### `a.add`

> Reduces stack pointer by 2

Read the current stack value (assigned `$left`), and decrement the stack pointer
by 1.

Read the current stack value (assigned `$right`), and decrement the stack
pointer by 1.

Set the current stack value to `$left + $right`.

#### `a.mult`

> Reduces stack pointer by 2

Read the current stack value (assigned `$left`), and decrement the stack pointer
by 1.

Read the current stack value (assigned `$right`), and decrement the stack
pointer by 1.

Set the current stack value to `$left * $right`.

## Control Flow Operations

| name     | type |
| -------- | ---- |
| `c.jump` | `6`  |

#### `c.jump`

> Reduces stack pointer by 2

Read the current stack value (assigned `$condition`), and decrement the stack
pointer by 1.

Read the current stack value (assigned `$address`), and decrement the stack
pointer by 1.

If `$condition` is equal to `1`, set the `$program-pointer` to `$address`, and
do no increment the `program-pointer`` at the end of the operation.

## Memory Operations

| name      | type |
| --------- | ---- |
| `m.store` | `7`  |
| `m.load`  | `8`  |

## Supervisor Operations

| name     | type |
| -------- | ---- |
| `x.exit` | `9`  |
