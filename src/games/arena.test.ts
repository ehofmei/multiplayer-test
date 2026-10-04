import { describe, expect, it } from "vitest";
import {
  newArena,
  moveArena,
  stepArena,
  arenaWinner,
  viewPosition,
} from "./arena";
import { newRoom } from "./model";
import { validRoom } from "./validate";
import { parseMessage } from "../network/protocol";

describe("Arena Pong", () => {
  const playing = () => ({
    ...newArena(["a", "b", "c", "d"]),
    phase: "playing" as const,
  });
  it("bounces off each paddle and accelerates within a bounded speed", () => {
    for (const [x, y, vx, vy] of [
      [0.5, 0.933, 0, 0.4],
      [0.933, 0.5, 0.4, 0],
      [0.5, 0.067, 0, -0.4],
      [0.067, 0.5, -0.4, 0],
    ]) {
      const state = playing();
      state.ball = { x, y, vx, vy };
      const next = stepArena(state, 1 / 120);
      expect(next.ball.vx * vx + next.ball.vy * vy).toBeLessThan(0);
      expect(Math.hypot(next.ball.vx, next.ball.vy)).toBeCloseTo(0.4704);
      expect(next.lives).toEqual([5, 5, 5, 5]);
    }
  });
  it("charges a single miss to the correct side, eliminates players, and makes eliminated/unused sides walls", () => {
    for (const [side, x, y, vx, vy] of [
      [0, 0.8, 0.933, 0, 0.4],
      [1, 0.933, 0.8, 0.4, 0],
      [2, 0.8, 0.067, 0, -0.4],
      [3, 0.067, 0.8, -0.4, 0],
    ]) {
      const state = playing();
      state.ball = { x, y, vx, vy };
      state.lives![side] = 1;
      const miss = stepArena(state, 1 / 120);
      expect(miss.lives![side]).toBe(0);
      expect(miss.score[side]).toBe(1);
      expect(miss.phase).toBe("serve");
      expect(moveArena(miss, state.seats[side], 0.8)).toBe(miss);
      const wall = stepArena(
        { ...miss, phase: "playing", ball: state.ball },
        1 / 120,
      );
      expect(wall.score).toEqual(miss.score);
      expect(wall.ball.vx * vx + wall.ball.vy * vy).toBeLessThan(0);
    }
    const three = {
      ...newArena(["a", "b", "c"]),
      phase: "playing" as const,
      ball: { x: 0.067, y: 0.8, vx: -0.4, vy: 0 },
    };
    expect(stepArena(three, 1 / 120).ball.vx).toBeGreaterThan(0);
  });
  it("finishes with the last living player, freezes finished/paused games, and delays serves", () => {
    const state = {
      ...playing(),
      lives: [1, 0, 2, 0],
      ball: { x: 0.8, y: 0.933, vx: 0, vy: 0.4 },
    };
    const win = stepArena(state, 1 / 120);
    expect(win.phase).toBe("finished");
    expect(arenaWinner(win)).toBe("c");
    expect(stepArena(win, 1)).toBe(win);
    const paused = { ...state, phase: "paused" as const };
    expect(stepArena(paused, 1)).toBe(paused);
    expect(stepArena({ ...state, phase: "serve" }, 0.5).phase).toBe("serve");
    expect(stepArena({ ...state, phase: "serve" }, 1).phase).toBe("playing");
  });
  it("runs a whole match without invalid positions or extra lives lost at corners", () => {
    let state = newArena(["a", "b", "c", "d"]);
    const room = newRoom("arena", 1);
    for (let i = 0; i < 20_000 && state.phase !== "finished"; i++) {
      if (state.phase === "ready") state = { ...state, phase: "serve" };
      const before = state.score.reduce((a, b) => a + b, 0);
      state = stepArena(state, 1 / 120);
      expect(
        state.score.reduce((a, b) => a + b, 0) - before,
      ).toBeLessThanOrEqual(1);
      expect(validRoom({ ...room, pong: state })).toBe(true);
    }
    expect(state.phase).toBe("finished");
    expect(state.lives!.filter((lives) => lives > 0)).toHaveLength(1);
    expect(state.score.filter((losses) => losses === 5)).toHaveLength(3);
  });
  it("maps local left/right controls into each rotated side and clamps movement", () => {
    for (let side = 0; side < 4; side++) {
      const pos = viewPosition(side, 0.7);
      expect(viewPosition(side, pos)).toBeCloseTo(0.7);
      expect(
        moveArena(playing(), ["a", "b", "c", "d"][side], pos).paddles[side],
      ).toBeCloseTo(pos);
    }
    expect(moveArena(playing(), "a", 2).paddles[0]).toBe(0.88);
    const state = playing();
    expect(moveArena(state, "spectator", 0.8)).toBe(state);
  });
  it("validates arena state and allows only palette colors over the wire", () => {
    const room = { ...newRoom("arena", 1), pong: playing() };
    expect(validRoom(room)).toBe(true);
    expect(validRoom(newRoom("arena", 1))).toBe(true);
    for (const broken of [
      { ...room.pong, lives: [6, 5, 5, 5] },
      { ...room.pong, paddles: [0.5, 0.5] },
      { ...room.pong, seats: ["a", "a", "b"] },
    ])
      expect(validRoom({ ...room, pong: broken })).toBe(false);
    const action = {
      v: 2,
      type: "input",
      epoch: 1,
      sequence: 1,
      input: { kind: "color", color: "Coral" },
    };
    expect(parseMessage(JSON.stringify(action))?.type).toBe("input");
    expect(
      parseMessage(
        JSON.stringify({
          ...action,
          input: { kind: "color", color: "url(evil)" },
        }),
      ),
    ).toBeNull();
  });
});
