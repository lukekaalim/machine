
export const dump = (memory: number[], limit = 32) => {
  const rowCount = Math.min(Math.ceil(memory.length / 4), limit);
  const rows = [];
  for (let i = 0; i < rowCount; i++) {
    const slice = memory.slice(i * 4, (i + 1) * 4);
    rows.push({
      'address': i * 4,
      0: slice[0] ?? null,
      1: slice[1] ?? null,
      2: slice[2] ?? null,
      3: slice[3] ?? null, });
  }
  console.table(rows);
}