import { describe, expect, it } from "vitest";
import { newBreakout } from "./breakout";
import { breakoutContacts, breakoutPaddleContact } from "./breakout-feedback";
import type { PongState } from "./model";
const playing = (): PongState => ({
  ...newBreakout(["a", "b", "c", "d"]),
  phase: "playing",
});
describe("confirmed Breakout feedback", () => {
  it("distinguishes damage and destruction in coalesced snapshots without replay", () => {
    const before = playing();
    before.breakout!.bricks[0] = 2;
    const after = {
      ...before,
      breakout: { ...before.breakout!, bricks: [...before.breakout!.bricks] },
    };
    after.breakout.bricks[0] = 1;
    after.breakout.bricks[1] = 0;
    expect(breakoutContacts(before, after)).toEqual([
      { index: 0, broken: false },
      { index: 1, broken: true },
    ]);
    expect(breakoutContacts(after, after)).toEqual([]);
    expect(breakoutContacts(null, after)).toEqual([]);
    for (const patch of [
      { phase: "paused" },
      { breakout: { ...after.breakout, level: 2 } },
      { breakout: { ...after.breakout, lives: 4 } },
    ])
      expect(
        breakoutContacts(before, { ...after, ...patch } as PongState),
      ).toEqual([]);
  });
  it("only lights the occupied paddle on a confirmed edge rebound", () => {
    const before = playing();
    before.ball = { x: 0.5, y: 0.933, vx: 0, vy: 0.5 };
    const after = { ...before, ball: { ...before.ball, y: 0.935, vy: -0.5 } };
    expect(breakoutPaddleContact(before, after)).toBe(0);
    expect(breakoutPaddleContact(after, after)).toBeNull();
    expect(
      breakoutPaddleContact(before, { ...after, phase: "paused" }),
    ).toBeNull();
    expect(
      breakoutPaddleContact(before, {
        ...after,
        ball: { ...after.ball, y: 0.4 },
      }),
    ).toBeNull();
    expect(breakoutPaddleContact(before, { ...after, seats: [] })).toBeNull();
  });
});
