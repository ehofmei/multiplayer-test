import { describe, expect, it } from "vitest";
import {
  courses,
  newGolf,
  physicsGolf,
  golfLaunchSpeed,
  type GolfState,
} from "./minigolf";
import {
  consecutiveGolfFrames,
  golfContacts,
  golfDrawPoint,
  golfMotionFrame,
} from "./golf-motion";

function rolling(hole: number, angle: number, power: number): GolfState {
  const s = newGolf(["a", "b"], () => 0),
    c = courses[hole - 1];
  return {
    ...s,
    phase: "rolling",
    hole,
    conditions: { strength: 0, impact: c.meteor ? 4 : null },
    balls: s.balls.map((b) => ({
      ...b,
      x: c.tee[0],
      y: c.tee[1],
      locked: true,
      vx: Math.cos((angle * Math.PI) / 180) * golfLaunchSpeed(power),
      vy: Math.sin((angle * Math.PI) / 180) * golfLaunchSpeed(power),
      cooldowns: c.mushrooms.map(() => 0),
    })),
  };
}
describe("Minigolf confirmed motion and contacts", () => {
  it("recognizes launch, boundary/stone contacts, mushroom boosts and meteor impacts from real physics", () => {
    for (const [hole, angle, power, kind] of [
      [1, 0, 1, "wall"],
      [2, 0, 0.6, "wall"],
      [3, 0, 0.6, "mushroom"],
      [4, 329, 0.5, "meteor"],
    ] as const) {
      let s = rolling(hole, angle, power),
        before = golfMotionFrame({ ...s, phase: "aiming" });
      expect(
        golfContacts(before, golfMotionFrame(s)).map((c) => c.kind),
      ).toEqual(["launch"]);
      before = golfMotionFrame(s);
      let found = false;
      for (let i = 0; i < 120; i++) {
        for (let t = 0; t < 6; t++) s = physicsGolf(s);
        const next = golfMotionFrame(s),
          contacts = golfContacts(before, next);
        const contact = contacts.find((c) => c.kind === kind);
        if (contact) {
          found = true;
          if (kind === "wall") {
            expect(contact.x).toBe(hole === 1 ? 990 : 450);
            expect(contact.corner!.x).toBe(hole === 1 ? 990 : 440);
          }
          if (kind === "mushroom")
            expect(
              Math.hypot(contact.corner!.x - 450, contact.corner!.y - 350),
            ).toBeCloseTo(40);
          if (kind === "meteor")
            expect(contacts).toEqual([{ kind: "meteor", x: 500, y: 320 }]);
          expect(contacts.length).toBeLessThanOrEqual(16);
          break;
        }
        before = next;
      }
      expect(found, `${hole} ${kind}`).toBe(true);
    }
  });
  it("does not replay contacts on duplicates, old ticks, pauses, resume, new holes, first state or long gaps", () => {
    const before = golfMotionFrame(rolling(4, 329, 0.5));
    const after = { ...before, ticks: 6, impacted: true };
    expect(golfContacts(before, after)).toHaveLength(1);
    expect(golfContacts(after, after)).toEqual([]);
    expect(golfContacts(null, after)).toEqual([]);
    expect(golfContacts(after, before)).toEqual([]);
    expect(golfContacts({ ...before, phase: "paused" }, after)).toEqual([]);
    expect(golfContacts({ ...before, phase: "reorient" }, after)).toEqual([]);
    expect(golfContacts(before, { ...after, phase: "paused" })).toEqual([]);
    expect(golfContacts(before, { ...after, hole: 5 })).toEqual([]);
    expect(golfContacts(before, { ...after, ticks: 60 })).toEqual([]);
    expect(consecutiveGolfFrames(before, after)).toBe(true);
    expect(consecutiveGolfFrames(before, { ...after, ticks: 60 })).toBe(false);
  });
  it("copies mutable host values and avoids wind or capture being mistaken for a wall hit", () => {
    const s = rolling(3, 0, 0.6),
      before = golfMotionFrame(s);
    s.balls[0].cooldowns[0] = 50;
    expect(before.balls[0].cooldowns[0]).toBe(0);
    const a = golfMotionFrame(rolling(1, 0, 0.1));
    a.balls[0].vx = -4;
    const b = { ...a, ticks: 6, balls: a.balls.map((p) => ({ ...p, vx: 3 })) };
    expect(golfContacts(a, b)).toEqual([]);
    expect(
      golfContacts(a, {
        ...b,
        balls: b.balls.map((p) => ({ ...p, captured: true })),
      }),
    ).toEqual([]);
  });
  it("interpolates through a rebound without extrapolation or crossing the collision face", () => {
    const from = { x: 420, y: 345 },
      corner = { x: 440, y: 350 },
      target = { x: 410, y: 365 };
    for (let f = 0; f <= 1; f += 0.05) {
      const p = golfDrawPoint(from, corner, target, f);
      expect(p.x).toBeLessThanOrEqual(440);
      expect(p.x).toBeGreaterThanOrEqual(410);
      expect(p.y).toBeGreaterThanOrEqual(345);
      expect(p.y).toBeLessThanOrEqual(365);
    }
    expect(golfDrawPoint(from, corner, target, -1)).toEqual(from);
    expect(golfDrawPoint(from, corner, target, 2)).toEqual(target);
    expect(golfDrawPoint(from, undefined, target, 0.5)).toEqual({
      x: 415,
      y: 355,
    });
    expect(golfDrawPoint(target, undefined, target, 0.5)).toEqual(target);
  });
});
