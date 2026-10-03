import { describe, expect, it } from "vitest";
import { initialGrid, toggleGrid } from "./grid";
describe("authoritative grid", () => {
  it("applies concurrent actions in host order without mutating prior snapshots", () => {
    const original = initialGrid();
    let grid = toggleGrid(original, 7);
    grid = toggleGrid(grid, 3);
    grid = toggleGrid(grid, 7);
    expect(grid.revision).toBe(3);
    expect(grid.cells[7]).toBe(false);
    expect(grid.cells[3]).toBe(true);
    expect(original.cells.every((c) => !c)).toBe(true);
  });
  it("rejects invalid indexes", () => {
    for (const index of [-1, 16, 0.5, NaN])
      expect(() => toggleGrid(initialGrid(), index)).toThrow();
  });
});
