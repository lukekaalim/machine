import { HardwareState } from './state.ts';
import { stackPop, stackPush } from './stack.ts';

export const aluAdd = (state: HardwareState) => {
  stackPush(state,
    stackPop(state) + stackPop(state)
  );
}
export const aluMult = (state: HardwareState) => {
  stackPush(state,
    stackPop(state) * stackPop(state)
  );
}
export const aluDiv = (state: HardwareState) => {
  stackPush(state,
    Math.floor(stackPop(state) / stackPop(state))
  );
}
export const aluPow = (state: HardwareState) => {
  stackPush(state,
    stackPop(state) ^ stackPop(state)
  );
}