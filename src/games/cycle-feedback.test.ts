import { expect, it } from "vitest";
import { newCycle, stepCycle } from "./cycle";
import { cycleCrashPoint, cycleNewCrashes } from "./cycle-feedback";

it("marks the attempted cell and each wall edge rather than the last safe cell", () => {
  const rider = newCycle(["a"]).riders[0];
  expect(cycleCrashPoint(rider)).toEqual({ x: 55, y: 85 });
  for (const [direction, x, y, expected] of [
    ["left", 0, 4, { x: 0, y: 45 }],
    ["right", 31, 4, { x: 320, y: 45 }],
    ["up", 4, 0, { x: 45, y: 0 }],
    ["down", 4, 31, { x: 45, y: 320 }],
  ] as const)
    expect(cycleCrashPoint({ ...rider, direction, x, y })).toEqual(expected);
});

it("emits newly observed crashes once, including the final step and skipped ticks", () => {
  const before = newCycle(["a", "b"]);
  before.phase = "playing";
  before.riders[0].x = 31;
  before.riders[1].x = 0;
  const after = stepCycle(before);
  expect(cycleNewCrashes(before, after)).toHaveLength(2);
  expect(cycleNewCrashes(after, after)).toEqual([]);
  expect(cycleNewCrashes(null, after)).toEqual([]);
  expect(cycleNewCrashes({ ...before, phase: "paused" }, after)).toEqual([]);
  expect(cycleNewCrashes(before, { ...after, phase: "paused" })).toEqual([]);
  expect(
    cycleNewCrashes(before, { ...after, ticks: after.ticks + 2 }),
  ).toHaveLength(2);
  expect(cycleNewCrashes(after, newCycle(["a", "b"]))).toEqual([]);
});
