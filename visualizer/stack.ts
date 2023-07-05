import { h, Component, ElementNode } from 'https://esm.sh/@lukekaalim/act@2.6.0';
import { Table, memoryCellStyle, colorHasher } from './memory.ts';

export type StackVisualizerProps = {
  stack: number[]
}

export const StackVisualizer: Component<StackVisualizerProps> = ({ stack }) => {
  return h(Table, {
    header: h('pre', {}, 'Stack'),
    columns: ['Depth', 'Value'],
    rows: stack.map((value, index) =>
      [index, h('pre', { style: { ...memoryCellStyle, backgroundColor: colorHasher(value) } }, value)]),
  })
};