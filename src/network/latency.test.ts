import { describe, expect, it } from "vitest";
import { LatencyWindow } from "./latency";

describe("rolling latency", () => {
  it("reports the latest sample, median, and nearest-rank p95 without sorting the history", () => {
    const window = new LatencyWindow();
    expect(window.summary()).toBeUndefined();
    for (const value of [40, 10, 30, 20]) window.add(value);
    expect(window.summary()).toEqual({
      current: 20,
      median: 25,
      p95: 40,
      count: 4,
    });
  });
  it("bounds the window and excludes invalid observations", () => {
    const window = new LatencyWindow();
    for (let i = 0; i < 100; i++) window.add(i);
    for (const value of [-1, NaN, Infinity]) window.add(value);
    expect(window.summary()).toEqual({
      current: 99,
      median: 69.5,
      p95: 96,
      count: 60,
    });
  });
});
