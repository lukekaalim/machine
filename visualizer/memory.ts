import { h, Component, ElementNode } from 'https://esm.sh/@lukekaalim/act@2.6.0';
import { RuntimeStruct, runtimeStructure } from '../runtime.ts';

export type RuntimeMemoryVisualizerProps = {
  memory: number[],
  runtimeAddress: number
};

export const memoryCellStyle = {
  display: 'flex',
  minHeight: '40px',
  minWidth: '40px',
  margin: 0,
  padding: 0,
  fontSize: '16px',
  alignItems: 'center',
  justifyContent: 'center'
}

export const colorHasher = (index: number) => {
  const range = (index / 255);
  return `hsl(${((range * 16) % 16) * 360}deg, ${((range * 100) % 32) + 50}%, 75%)`;
}

export const RuntimeMemoryVisualizer: Component<RuntimeMemoryVisualizerProps> = ({
  memory,
  runtimeAddress,
}) => {
  const runtime = readStructFromMemory(runtimeStructure, runtimeAddress, memory);

  return [
    h(MemoryTable, { memory }),
    h(ObjectTable, { object: runtime, name: 'runtime' })
  ];
};

const MemoryTable: Component<{ memory: number[] }> = ({ memory }) => {
  const rowCount = Math.ceil(memory.length / 8);

  return h(Table, {
    header: h('pre', {}, 'Memory'),
    columns: ['', '0', '1', '2', '3', '4', '5', '6', '7']
      .map(content => h('pre', {  }, content)),
    rows: Array.from({ length: rowCount })
      .map((_, i) =>
        [h('pre', { style: memoryCellStyle }, i * 8), ...Array.from({ length: 8 }).map((_, o) => {
          const index = memory[(i * 8) + o];
          const style = {...memoryCellStyle, backgroundColor: colorHasher(index) };
          return h('pre', { style }, index);
        })])
  });
}

export const readStructFromMemory = (struct: RuntimeStruct, address: number, memory: number[]) => {
  return Object.fromEntries(struct.map(([fieldName], index) => {
    return [fieldName, memory[address + index]];
  }))
}

const ObjectTable: Component<{ object: { [key: string]: unknown }, name: string }> = ({ object, name }) => {
  return h(Table, {
    header: h('pre', {}, name),
    columns: Object.keys(object).map(k => h('pre', { }, k)),
    rows: [Object.values(object).map(v => h('pre', { style: memoryCellStyle }, JSON.stringify(v, null, 2)))]
  })
}

export type TableProps = {
  rows: ElementNode[][],
  columns: ElementNode[],
  header?: ElementNode,
};

const cellStyle = {
  border: '1px solid black',
  padding: '0px',
};
const rowStyle = {
  border: '1px solid black',
}
const tableStyle = {
  borderCollapse: 'collapse',
  margin: '4px',
  maxHeight: '500px',
  overflow: 'auto',
  display: 'block'
}
const headerStyle = {
  ...cellStyle,
}
const headStyle = {
}

export const Table: Component<TableProps> = ({ rows, columns, header }) => {
  return h('table', { style: tableStyle }, [
    h('thead', { style: headStyle }, [
      header && h('tr', { style: rowStyle }, h('td', { colspan: columns.length }, header)) || null,
      h('tr', { style: rowStyle }, columns.map(column =>
        h('th', { style: headerStyle }, column))),
    ]),
    rows.map(row =>
      h('tr', {}, row.map(cell =>
        h('td', { style: cellStyle }, cell))))
  ]);
};