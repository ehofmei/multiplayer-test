import { expect, it } from "vitest";
import { rallyBall } from "./speed";
import { newPong, stepPong } from "./model";
import { newArena, stepArena } from "./arena";
import { validRoom } from "./validate";

it("keeps a gentle opening, ramps by five seconds, and caps speed before ten seconds", () => {
  const ball = { vx: 0.18, vy: 0.38 };
  expect(rallyBall(ball, 1, 0.9)).toEqual(ball);
  const speed = (seconds: number) =>
    Math.hypot(...Object.values(rallyBall(ball, seconds, 0.9)));
  expect(speed(5)).toBeCloseTo(0.615);
  expect(speed(10)).toBeCloseTo(0.9);
  expect(speed(100)).toBeCloseTo(0.9);
});
it("both simulations advance the ramp, freeze it while paused, and reset it after a miss", () => {
  for (const [state, step] of [
    [newArena(["a", "b", "c"]), stepArena],
    [newPong(["a", "b"]), stepPong],
  ] as const) {
    const playing = { ...state, phase: "playing" as const, rallySeconds: 5 };
    const next = step(playing, 1 / 120);
    expect(next.rallySeconds).toBeGreaterThan(5);
    expect(Math.hypot(next.ball.vx, next.ball.vy)).toBeGreaterThan(0.6);
    const paused = { ...next, phase: "paused" as const };
    expect(step(paused, 1)).toBe(paused);
    const missed = step(
      {
        ...playing,
        ball: state.lives
          ? { x: 0.8, y: 0.934, vx: 0, vy: 0.7 }
          : { x: -0.024, y: 0.8, vx: -0.7, vy: 0 },
      },
      1 / 120,
    );
    expect(missed.phase).toBe("serve");
    expect(missed.rallySeconds).toBe(0);
  }
});
it("configures starting lives and validates them on the network", () => {
  for (const lives of [1, 3, 5, 7]) {
    const pong = {
      ...newArena(["a", "b", "c", "d"], lives),
      phase: "serve" as const,
    };
    expect(pong.lives).toEqual([lives, lives, lives, lives]);
    expect(
      validRoom({ epoch: 1, kind: "arena", notice: "", pong, race: null }),
    ).toBe(true);
    expect(
      validRoom({
        epoch: 1,
        kind: "arena",
        notice: "",
        pong: { ...pong, startingLives: 99 },
        race: null,
      }),
    ).toBe(false);
  }
});
