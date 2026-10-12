import type { GridState } from "./grid";

// Snapshots can skip intermediate toggles. Report only observable final changes.
export function changedLights(before: GridState | null, after: GridState) {
  if (!before || after.revision <= before.revision) return [];
  return after.cells.flatMap((on, index) =>
    on !== before.cells[index] ? [index] : [],
  );
}
