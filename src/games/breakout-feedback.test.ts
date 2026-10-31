import { describe, expect, it } from "vitest";
import { newBreakout } from "./breakout";
import {
  breakoutContacts,
  breakoutPaddleContact,
  breakoutFrame,
  breakoutObservation,
  breakoutProgress,
  breakoutTransition,
} from "./breakout-feedback";
import type { PongState } from "./model";
const playing = (): PongState => ({
  ...newBreakout(["a", "b", "c", "d"]),
  phase: "playing",
});
describe("confirmed Breakout feedback", () => {
  it("owns observations, counts targets separately from hits, and prioritizes team transitions", () => {
    const game = playing();
    const before = breakoutFrame(game);
    game.breakout!.bricks = Array(25).fill(0);
    game.breakout!.bricks[12] = 2;
    expect(breakoutProgress(game.breakout!.bricks)).toEqual({
      remaining: 1,
      hits: 2,
    });
    expect(before.breakout!.bricks).toEqual(Array(25).fill(1));
    const sparse = breakoutFrame(game);
    game.breakout!.bricks[12] = 1;
    expect(breakoutContacts(sparse, game)).toEqual([
      { index: 12, broken: false },
    ]);
    game.breakout!.bricks[12] = 0;
    expect(breakoutContacts(sparse, game)).toEqual([
      { index: 12, broken: true },
    ]);
    game.breakout!.lives = 3;
    game.phase = "serve";
    expect(breakoutTransition(before, game)).toBe("loss");
    game.breakout!.level = 2;
    expect(breakoutTransition(before, game)).toBe("loss");
    game.breakout!.lives = 5;
    expect(breakoutTransition(before, game)).toBe("core");
    game.phase = "finished";
    expect(breakoutTransition(before, game)).toBe("finish");
    expect(breakoutContacts(before, game)).toEqual([]);
    game.breakout!.lives = 0;
    expect(breakoutTransition(before, game)).toBe("finish");
  });
  it("quietly establishes initial, paused and recovery baselines and rejects stale progress", () => {
    const before = breakoutFrame(playing());
    const next = breakoutFrame(playing());
    next.breakout!.bricks[0] = 0;
    next.breakout!.lives = 4;
    next.phase = "serve";
    expect(breakoutTransition(null, next)).toBeNull();
    expect(breakoutTransition({ ...before, phase: "paused" }, next)).toBeNull();
    expect(breakoutTransition(before, { ...next, phase: "paused" })).toBeNull();
    expect(breakoutTransition(next, next)).toBeNull();
    expect(breakoutObservation(next, before)).toBe(next);
    expect(breakoutTransition(next, before)).toBeNull();
    const current = breakoutObservation(next, before);
    expect(breakoutTransition(current, next)).toBeNull();
    const damaged = breakoutFrame(playing());
    damaged.breakout!.bricks[2] = 0;
    expect(breakoutObservation(damaged, before)).toBe(damaged);
    const laterCore = breakoutFrame(playing());
    laterCore.breakout!.level = 3;
    expect(breakoutObservation(laterCore, before)).toBe(laterCore);
    // Epoch/rematch/reconnect owners reset to null, not previous-match progress.
    expect(breakoutObservation(null, before)).toBe(before);
  });
  it("recognizes all rotated occupied edges and leaves unused walls unlit", () => {
    const pairs = [
      [
        { x: 0.5, y: 0.935, vx: 0.1, vy: 0.5 },
        { x: 0.5, y: 0.935, vx: 0.1, vy: -0.5 },
      ],
      [
        { x: 0.935, y: 0.5, vx: 0.5, vy: 0.1 },
        { x: 0.935, y: 0.5, vx: -0.5, vy: 0.1 },
      ],
      [
        { x: 0.5, y: 0.065, vx: 0.1, vy: -0.5 },
        { x: 0.5, y: 0.065, vx: 0.1, vy: 0.5 },
      ],
      [
        { x: 0.065, y: 0.5, vx: -0.5, vy: 0.1 },
        { x: 0.065, y: 0.5, vx: 0.5, vy: 0.1 },
      ],
    ];
    for (const [side, [a, b]] of pairs.entries()) {
      const before = { ...playing(), ball: a };
      const after = { ...playing(), ball: b };
      expect(breakoutPaddleContact(before, after)).toBe(side);
      expect(breakoutContacts(before, after)).toEqual([]);
      expect(
        breakoutPaddleContact(before, {
          ...after,
          seats: after.seats.slice(0, side),
        }),
      ).toBeNull();
      expect(
        breakoutPaddleContact(before, {
          ...after,
          breakout: { ...after.breakout!, level: 2 },
        }),
      ).toBeNull();
    }
  });
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
