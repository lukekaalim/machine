export type SectionID = string;
export type Section = { id: SectionID } & (
  | { type: 'meta', meta: Record<string, string> }
  | { type: 'data', data: number[] }
)

export type Exectuable = {
  sections: Section[],
};

export const encodeExecutable = () => {

};

export const decodeExectuable = () => {

};
