import { describe, expect, it } from "vitest";
import {
  golfGuideLength,
  golfLabels,
  golfScreenAngle,
} from "./golf-presentation";
const balls = (points: [number, number][]) =>
  points.map(([x, y], i) => ({
    id: String(i + 1),
    x,
    y,
    captured: false,
    skipped: false,
  }));
function separated(
  labels: ReturnType<typeof golfLabels>,
  width: number,
  height: number,
) {
  for (const l of labels) {
    expect(l.x - l.width / 2).toBeGreaterThanOrEqual(0);
    expect(l.x + l.width / 2).toBeLessThanOrEqual(width);
    expect(l.y - 10).toBeGreaterThanOrEqual(0);
    expect(l.y + 10).toBeLessThanOrEqual(height);
    for (const other of labels.filter((a) => a !== l))
      expect(
        Math.abs(other.x - l.x) >= (other.width + l.width) / 2 ||
          Math.abs(other.y - l.y) >= 20,
      ).toBe(true);
  }
}
describe("Golf screen presentation", () => {
  it("rotates screen angles together and bounds guide reach without power or physics", () => {
    expect([0, 90, 180, 270].map((a) => golfScreenAngle(a, true))).toEqual([
      270, 0, 90, 180,
    ]);
    expect(golfScreenAngle(359, false)).toBe(359);
    expect(golfGuideLength(0.3)).toBeCloseTo(253.3333);
    expect(golfGuideLength(0.1)).toBe(280);
    expect(golfGuideLength(1)).toBe(180);
  });
  it("reserves local ball 8 first and clusters seven coincident opponents with complete identities", () => {
    const b = balls(Array(8).fill([200, 350]));
    const l = golfLabels(b, "8", true, 0.4);
    expect(l.map((a) => a.text)).toEqual(["8 · You", "+7"]);
    expect(l.flatMap((a) => a.members).sort()).toEqual(b.map((a) => a.id));
    expect(l).toEqual(golfLabels(b, "8", true, 0.4));
    separated(l, 280, 400);
  });
  it("handles connected overlap chains and neutral spectators without lost or fabricated players", () => {
    const b = balls([
      [100, 100],
      [150, 100],
      [200, 100],
      [600, 500],
    ]);
    const l = golfLabels(b, "spectator", false, 0.4);
    expect(l.map((a) => a.text)).toEqual(["+3", "4"]);
    expect(l.every((a) => !a.local)).toBe(true);
    expect(l.flatMap((a) => a.members).sort()).toEqual(["1", "2", "3", "4"]);
    separated(l, 400, 280);
  });
  it("keeps labels within every corner on rotated and wide greens at narrow and large scales", () => {
    const b = balls([
      [10, 10],
      [20, 20],
      [990, 10],
      [980, 20],
      [10, 690],
      [20, 680],
      [990, 690],
      [980, 680],
    ]);
    for (const portrait of [false, true])
      for (const scale of [0.22, 0.4, 1])
        for (const me of ["1", "8", "spectator"]) {
          const l = golfLabels(b, me, portrait, scale);
          expect(l.flatMap((a) => a.members).sort()).toEqual(
            b.map((a) => a.id),
          );
          separated(
            l,
            (portrait ? 700 : 1000) * scale,
            (portrait ? 1000 : 700) * scale,
          );
        }
  });
  it("moves edge-clamped badges away from the actual local ball", () => {
    const b = balls([
      [990, 350],
      [990, 350],
    ]);
    for (const portrait of [false, true]) {
      const scale = 0.4,
        local = golfLabels(b, "1", portrait, scale).find((l) => l.local)!;
      const x = (portrait ? 350 : 990) * scale,
        y = (portrait ? 10 : 350) * scale;
      expect(
        Math.abs(local.x - x) >= local.width / 2 + 23 * scale + 3 ||
          Math.abs(local.y - y) >= 10 + 23 * scale + 3,
      ).toBe(true);
    }
  });
  it("removes captured and skipped balls without renumbering remaining identities", () => {
    const b = balls([
      [200, 350],
      [200, 350],
      [600, 350],
    ]);
    b[0].captured = true;
    b[1].skipped = true;
    expect(golfLabels(b, "1", false, 0.4).map((a) => a.text)).toEqual(["3"]);
  });
});
