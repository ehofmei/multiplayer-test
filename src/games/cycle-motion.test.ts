import { expect, it } from "vitest";
import { adjacentCyclePoints, cycleDrawPoint } from "./cycle-motion";
it("moves linearly between confirmed cells without predicting past the target", () => {
  const start = { x: 5, y: 8 },
    target = { x: 6, y: 8 };
  expect(cycleDrawPoint(start, start, target, 0.5)).toEqual({ x: 5.5, y: 8 });
  expect(cycleDrawPoint(start, start, target, 2)).toEqual(target);
  expect(cycleDrawPoint(start, start, target, -1)).toEqual(start);
  expect(cycleDrawPoint(start, start, start, 0.5)).toEqual(start);
});
it("finishes a partially drawn segment before rounding a confirmed corner", () => {
  const from = { x: 5.5, y: 8 },
    corner = { x: 6, y: 8 },
    target = { x: 6, y: 9 };
  expect(cycleDrawPoint(from, corner, target, 1 / 3)).toEqual(corner);
  expect(cycleDrawPoint(from, corner, target, 2 / 3)).toEqual({ x: 6, y: 8.5 });
  for (let i = 0; i <= 20; i++) {
    const point = cycleDrawPoint(from, corner, target, i / 20);
    expect(point.y === 8 || point.x === 6).toBe(true);
  }
});
it("recognizes adjacent axis-aligned cells and rejects skipped/diagonal snapshots", () => {
  expect(adjacentCyclePoints({ x: 1, y: 1 }, { x: 2, y: 1 })).toBe(true);
  expect(adjacentCyclePoints({ x: 1, y: 1 }, { x: 1, y: 0 })).toBe(true);
  expect(adjacentCyclePoints({ x: 1, y: 1 }, { x: 2, y: 2 })).toBe(false);
  expect(adjacentCyclePoints({ x: 1, y: 1 }, { x: 3, y: 1 })).toBe(false);
});
