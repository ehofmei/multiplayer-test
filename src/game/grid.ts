export interface GridState {
  revision: number;
  cells: boolean[];
}
export const initialGrid = (): GridState => ({
  revision: 0,
  cells: Array<boolean>(16).fill(false),
});
export function toggleGrid(state: GridState, index: number): GridState {
  if (!Number.isInteger(index) || index < 0 || index >= 16)
    throw new Error("Invalid cell.");
  return {
    revision: state.revision + 1,
    cells: state.cells.map((on, i) => (i === index ? !on : on)),
  };
}
