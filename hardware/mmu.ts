export type MemoryPage = {
  
};

export type MemoryManagementUnit = {
  read: (address: number) => number,
  write: (address: number, value: number) => void,

  setPageTable: (pages: MemoryPage[]) => void
};

